import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getPrisma } from "@/lib/prisma";
import type { VivaCohort } from "@/lib/storage/vivaMarks";

const SECTION = "add-viva-marks";
const selectionSchema = z.object({ department: z.string().min(1).max(150), examYear: z.string().regex(/^\d{4}$/), academicYear: z.enum(["1st","2nd","3rd","4th"]), semester: z.enum(["Odd","Even"]) });
async function cohorts(prisma: NonNullable<ReturnType<typeof getPrisma>>) { const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section" = ${SECTION} LIMIT 1`); return Array.isArray(rows[0]?.data) ? rows[0].data as unknown as VivaCohort[] : []; }
const same = (cohort: VivaCohort, selection: z.infer<typeof selectionSchema>) => cohort.department === selection.department && cohort.examYear === selection.examYear && cohort.academicYear === selection.academicYear && cohort.semester === selection.semester;

export async function GET() {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try { return NextResponse.json({ results: (await cohorts(prisma)).filter((result) => result.submitted || result.published) }); }
  catch (error) { console.error("Unable to load result approvals", error); return NextResponse.json({ error: "Unable to load result approvals" }, { status: 503 }); }
}

export async function PUT(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const parsed = selectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid result selection" }, { status: 400 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try {
    const results = await cohorts(prisma);
    const index = results.findIndex((result) => same(result, parsed.data));
    if (index < 0 || !results[index].submitted) return NextResponse.json({ error: "This result has not been submitted for approval" }, { status: 409 });
    if (!results[index].published) results[index] = { ...results[index], published: true, publishedAt: new Date().toISOString(), publishedBy: "Administrator" };
    const serialized = JSON.stringify(results);
    await prisma.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data" = CAST(${serialized} AS jsonb), "updatedAt" = NOW() WHERE "section" = ${SECTION}`);
    return NextResponse.json({ result: results[index] });
  } catch (error) { console.error("Unable to approve result", error); return NextResponse.json({ error: "Unable to approve result" }, { status: 503 }); }
}