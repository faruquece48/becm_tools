import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import type { StudentDirectoryRecord } from "@/lib/storage/studentDirectory";

const SECTION = "student-directory";
const ARCHIVE_SECTION = "student-directory-archive";
const PREPARED_SECTION = "prepare-result";
const academicYearNumber: Record<string, number> = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 };
const backlogEligibilitySchema = z.object({ examYear: z.string().regex(/^\d{4}$/), academicYear: z.enum(["1st", "2nd", "3rd", "4th"]), semester: z.enum(["Odd", "Even"]), createdAt: z.string().datetime() });
const recordSchema = z.object({
  id: z.string().trim().min(1).max(100),
  department: z.string().trim().min(1).max(150),
  series: z.string().trim().regex(/^\d{4}$/, "Series must be a four-digit year"),
  year: z.enum(["1st", "2nd", "3rd", "4th"]),
  semester: z.enum(["Odd", "Even", "Short Semester"]),
  section: z.enum(["A", "B"]).default("A"),
  name: z.string().trim().min(2).max(150),
  rollNo: z.string().trim().min(1).max(50),
  registrationNo: z.string().trim().min(1).max(50),
  fatherName: z.string().trim().max(150),
  motherName: z.string().trim().max(150),
  localGuardian: z.string().trim().max(150),
  gender: z.enum(["Male", "Female", "Other"]),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date is required"),
  backlogEligibility: z.array(backlogEligibilitySchema).max(16).optional(),
});
const payloadSchema = z.object({ records: z.array(recordSchema).min(1).max(1000) });

async function teacherPrisma() {
  const id = (await cookies()).get("becm-portal-account")?.value;
  const prisma = getPrisma();
  if (!id || !prisma) return null;
  const teacher = await prisma.portalAccount.findFirst({ where: { id, role: "teacher", active: true }, select: { id: true } });
  return teacher ? prisma : null;
}

async function load(prisma: NonNullable<ReturnType<typeof getPrisma>>) {
  await prisma.$executeRaw(Prisma.sql`INSERT INTO "ResultSectionStore" ("section", "data", "updatedAt") VALUES (${SECTION}, '[]'::jsonb, NOW()) ON CONFLICT ("section") DO NOTHING`);
  const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section" = ${SECTION} LIMIT 1`);
  return Array.isArray(rows[0]?.data) ? rows[0].data as unknown as StudentDirectoryRecord[] : [];
}

async function save(prisma: NonNullable<ReturnType<typeof getPrisma>>, records: StudentDirectoryRecord[]) {
  const serialized = JSON.stringify(records);
  await prisma.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data" = CAST(${serialized} AS jsonb), "updatedAt" = NOW() WHERE "section" = ${SECTION}`);
}

export async function GET(request: Request) {
  const prisma = await teacherPrisma();
  if (!prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  try {
    const active = await load(prisma);
    const includeHistorical = new URL(request.url).searchParams.get("includeHistorical") === "true";
    if (!includeHistorical) {
      return NextResponse.json(
        { records: active },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
      );
    }

    const rows = await prisma.$queryRaw<Array<{ section: string; data: Prisma.JsonValue }>>(
      Prisma.sql`SELECT "section", "data" FROM "ResultSectionStore"
        WHERE "section" IN (${Prisma.join([ARCHIVE_SECTION, PREPARED_SECTION])})`,
    );
    const archivedRow = rows.find((row) => row.section === ARCHIVE_SECTION);
    const preparedRow = rows.find((row) => row.section === PREPARED_SECTION);
    const archived = Array.isArray(archivedRow?.data)
      ? archivedRow.data as unknown as StudentDirectoryRecord[]
      : [];
    const prepared = Array.isArray(preparedRow?.data)
      ? preparedRow.data as Array<Record<string, unknown>>
      : [];
    const reconstructed: StudentDirectoryRecord[] = [];
    const seen = new Set<string>();
    for (const result of prepared) {
      const examYear = String(result.examYear || "");
      const year = String(result.academicYear || "");
      const semester = String(result.semester || "");
      const series = String(Number(examYear) - (academicYearNumber[year] || 1));
      const resultStudents = Array.isArray(result.students)
        ? result.students as Array<Record<string, unknown>>
        : [];
      for (const student of resultStudents) {
        const id = String(student.studentId || student.id || "");
        if (!id) continue;
        const key = [id, series, year, semester].join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        reconstructed.push({
          id,
          department: "Building Engineering & Construction Management",
          series,
          year,
          semester,
          section: "A",
          name: String(student.name || "Historical Student"),
          rollNo: String(student.rollNo || ""),
          registrationNo: String(student.registrationNo || ""),
          fatherName: "",
          motherName: "",
          localGuardian: "",
          gender: "Other",
          birthDate: "1900-01-01",
        });
      }
    }
    const records = [...active, ...archived, ...reconstructed].filter((record, index, all) =>
      all.findIndex((candidate) =>
        candidate.id === record.id &&
        candidate.series === record.series &&
        candidate.year === record.year &&
        candidate.semester === record.semester,
      ) === index,
    );
    return NextResponse.json(
      { records },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  } catch (error) {
    console.error("Unable to load students", error);
    return NextResponse.json({ error: "Unable to load students" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const prisma = await teacherPrisma();
  if (!prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid student data" }, { status: 400 });
  try {
    const current = await load(prisma);
    const next = [...current];
    for (const record of parsed.data.records) {
      const duplicate = next.findIndex((item) => item.id === record.id || item.rollNo === record.rollNo || item.registrationNo === record.registrationNo);
      if (duplicate >= 0) next[duplicate] = record; else next.push(record);
    }
    await save(prisma, next);
    return NextResponse.json({ records: next });
  } catch (error) { console.error("Unable to save students", error); return NextResponse.json({ error: "Unable to save students" }, { status: 503 }); }
}
