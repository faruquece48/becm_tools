import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { propagateSemesterCorrections, type SemesterArchive, type CumulativeArchive } from "@/lib/server/cumulativeCorrections";

const sectionSchema = z.enum(["add-viva-marks", "prepare-result", "prepare-result-backlog", "marks-sheet", "marks-sheet-backlog", "grade-sheet", "result-sheet", "result-sheet-backlog", "tabulation-sheet", "tabulation-sheet-backlog"]);

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
    if (section.data === "marks-sheet" || section.data === "marks-sheet-backlog") {
      if (!Array.isArray(body.data)) return NextResponse.json({ error: "Marksheet data must be an array" }, { status: 400 });
      const saved = await prisma.$transaction(async tx => {
        await tx.$executeRaw(Prisma.sql`INSERT INTO "ResultSectionStore" ("section", "data", "updatedAt") VALUES (${section.data}, '[]'::jsonb, NOW()) ON CONFLICT ("section") DO NOTHING`);
        const stored = await tx.$queryRaw<Array<{ section: string; data: Prisma.JsonValue }>>(Prisma.sql`SELECT "section", "data" FROM "ResultSectionStore" WHERE "section" IN (${section.data}, 'result-sheet', 'result-sheet-backlog', 'student-directory') ORDER BY "section" FOR UPDATE`);
        const arrays = new Map(stored.map(row => [row.section, Array.isArray(row.data) ? row.data : []]));
        for (const resultSection of ["result-sheet", "result-sheet-backlog"]) {
          const previous = (arrays.get(resultSection) || []) as CumulativeArchive[];
          const corrected = propagateSemesterCorrections((arrays.get(section.data) || []) as SemesterArchive[], body.data as SemesterArchive[], previous, (arrays.get("student-directory") || []) as Array<{ id: string; rollNo: string }>, section.data === "marks-sheet-backlog", resultSection === "result-sheet-backlog");
          if (JSON.stringify(corrected) !== JSON.stringify(previous)) await tx.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data" = CAST(${JSON.stringify(corrected)} AS jsonb), "updatedAt" = NOW() WHERE "section" = ${resultSection}`);
        }
        const rows = await tx.$queryRaw<Array<{ data: Prisma.JsonValue; updatedAt: Date }>>(Prisma.sql`UPDATE "ResultSectionStore" SET "data" = CAST(${serialized} AS jsonb), "updatedAt" = NOW() WHERE "section" = ${section.data} RETURNING "data", "updatedAt"`);
        return rows[0];
      });
      return NextResponse.json({ data: saved.data, updatedAt: saved.updatedAt });
    }
    if (section.data === "prepare-result" || section.data === "prepare-result-backlog") {
      const stored = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section" = ${section.data} LIMIT 1`);
      const existing = Array.isArray(stored[0]?.data) ? stored[0].data as Array<Record<string, unknown>> : [];
      const incoming = Array.isArray(body.data) ? body.data as Array<Record<string, unknown>> : [];
      const backlogSection = section.data === "prepare-result-backlog";
      const key = (record: Record<string, unknown>) => `${record.examYear}|${record.academicYear}|${record.semester}|${backlogSection ? record.courseCode : record.courseId}|${backlogSection ? record.studentId : ""}`;
      const publicationRows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(
        Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section" = 'add-viva-marks' LIMIT 1`,
      );
      const publications = Array.isArray(publicationRows[0]?.data)
        ? publicationRows[0].data as Array<Record<string, unknown>>
        : [];
      const publishedExams = publications.filter((record) => record?.published === true);
      const belongsToPublishedExam = (record: Record<string, unknown>) => publishedExams.some(
        (published) => (published.examType || "Regular") === (backlogSection ? "Backlog" : "Regular") &&
          published.examYear === record.examYear &&
          published.academicYear === record.academicYear &&
          (backlogSection || published.semester === record.semester),
      );
      for (const locked of existing.filter((record) => record && belongsToPublishedExam(record))) {
        const replacement = incoming.find((record) => record && key(record) === key(locked));
        if (!replacement || JSON.stringify(replacement) !== JSON.stringify(locked)) {
          return NextResponse.json({ error: "Result Already Published. No Change Allowed." }, { status: 409 });
        }
      }
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
