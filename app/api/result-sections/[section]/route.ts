import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

const sectionSchema = z.enum(["add-viva-marks", "prepare-result", "prepare-result-backlog", "marks-sheet", "marks-sheet-backlog", "grade-sheet", "result-sheet", "exam-result-report", "result-sheet-backlog", "tabulation-sheet", "tabulation-sheet-backlog"]);

async function teacherPrisma() {
  const id = (await cookies()).get("becm-portal-account")?.value;
  const prisma = getPrisma();
  if (!id || !prisma) return null;
  const teacher = await prisma.portalAccount.findFirst({ where: { id, role: "teacher", active: true }, select: { id: true } });
  return teacher ? prisma : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ section: string }> }) {
  const section = sectionSchema.safeParse((await params).section);
  if (!section.success) return NextResponse.json({ error: "Unknown result section" }, { status: 404 });
  const prisma = await teacherPrisma();
  if (!prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  try {
    await prisma.$executeRaw(Prisma.sql`INSERT INTO "ResultSectionStore" ("section", "data", "updatedAt") VALUES (${section.data}, '[]'::jsonb, NOW()) ON CONFLICT ("section") DO NOTHING`);
    const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue; updatedAt: Date }>>(Prisma.sql`SELECT "data", "updatedAt" FROM "ResultSectionStore" WHERE "section" = ${section.data} LIMIT 1`);
    return NextResponse.json({ data: rows[0]?.data ?? [], updatedAt: rows[0]?.updatedAt ?? null });
  } catch (error) { console.error(`Unable to load result section ${section.data}`, error); return NextResponse.json({ error: "Unable to load result section" }, { status: 503 }); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ section: string }> }) {
  const section = sectionSchema.safeParse((await params).section);
  if (!section.success) return NextResponse.json({ error: "Unknown result section" }, { status: 404 });
  const prisma = await teacherPrisma();
  if (!prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const body = await request.json().catch(() => null) as { data?: unknown } | null;
  if (!body || body.data === undefined) return NextResponse.json({ error: "Result data is required" }, { status: 400 });
  let serialized: string;
  try { serialized = JSON.stringify(body.data); } catch { return NextResponse.json({ error: "Result data must be valid JSON" }, { status: 400 }); }
  if (serialized.length > 5_000_000) return NextResponse.json({ error: "Result data is too large" }, { status: 413 });
  try {
    if (section.data === "prepare-result") {
      const stored = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section" = ${section.data} LIMIT 1`);
      const existing = Array.isArray(stored[0]?.data) ? stored[0].data as Array<Record<string, unknown>> : [];
      const incoming = Array.isArray(body.data) ? body.data as Array<Record<string, unknown>> : [];
      const key = (record: Record<string, unknown>) => `${record.examYear}|${record.academicYear}|${record.semester}|${record.courseId}`;
      for (const locked of existing.filter((record) => record && record.published === true)) {
        const replacement = incoming.find((record) => record && key(record) === key(locked));
        if (!replacement || JSON.stringify(replacement) !== JSON.stringify(locked)) {
          return NextResponse.json({ error: "Result Already Published. No Change Allowed." }, { status: 409 });
        }
      }
    }
    const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue; updatedAt: Date }>>(Prisma.sql`INSERT INTO "ResultSectionStore" ("section", "data", "updatedAt") VALUES (${section.data}, CAST(${serialized} AS jsonb), NOW()) ON CONFLICT ("section") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = NOW() RETURNING "data", "updatedAt"`);
    return NextResponse.json({ data: rows[0]?.data ?? body.data, updatedAt: rows[0]?.updatedAt ?? null });
  } catch (error) { console.error(`Unable to save result section ${section.data}`, error); return NextResponse.json({ error: "Unable to save result section" }, { status: 503 }); }
}