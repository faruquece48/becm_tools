import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import type { VivaCohort } from "@/lib/storage/vivaMarks";

const SECTION = "add-viva-marks";
const selectionSchema = z.object({ department: z.string().min(1).max(150), examYear: z.string().regex(/^\d{4}$/), academicYear: z.enum(["1st","2nd","3rd","4th"]), semester: z.enum(["Odd","Even"]) });
async function teacherContext() {
  const id = (await cookies()).get("becm-portal-account")?.value;
  const prisma = getPrisma();
  if (!id || !prisma) return null;
  const teacher = await prisma.portalAccount.findFirst({ where: { id, role: "teacher", active: true }, select: { id: true, email: true, name: true } });
  return teacher ? { prisma, teacher } : null;
}
async function cohorts(prisma: NonNullable<ReturnType<typeof getPrisma>>) {
  const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section" = ${SECTION} LIMIT 1`);
  return Array.isArray(rows[0]?.data) ? rows[0].data as unknown as VivaCohort[] : [];
}
const same = (cohort: VivaCohort, selection: z.infer<typeof selectionSchema>) => cohort.department === selection.department && cohort.examYear === selection.examYear && cohort.academicYear === selection.academicYear && cohort.semester === selection.semester;

export async function GET() {
  const context = await teacherContext();
  if (!context) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  try { return NextResponse.json({ results: (await cohorts(context.prisma)).filter((cohort) => cohort.finalized) }); }
  catch (error) { console.error("Unable to load finalized results", error); return NextResponse.json({ error: "Unable to load finalized results" }, { status: 503 }); }
}

export async function PUT(request: Request) {
  const context = await teacherContext();
  if (!context) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const parsed = selectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid result selection" }, { status: 400 });
  try {
    const results = await cohorts(context.prisma);
    const index = results.findIndex((cohort) => same(cohort, parsed.data));
    if (index < 0 || !results[index].finalized) return NextResponse.json({ error: "This result has not been finalized" }, { status: 409 });
    if (!results[index].submitted && !results[index].published) results[index] = { ...results[index], submitted: true, submittedAt: new Date().toISOString(), submittedBy: context.teacher.name || context.teacher.email };
    const serialized = JSON.stringify(results);
    await context.prisma.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data" = CAST(${serialized} AS jsonb), "updatedAt" = NOW() WHERE "section" = ${SECTION}`);
    return NextResponse.json({ result: results[index] });
  } catch (error) { console.error("Unable to publish result", error); return NextResponse.json({ error: "Unable to publish result" }, { status: 503 }); }
}