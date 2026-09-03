import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getPrisma } from "@/lib/prisma";
import type { ExpelledStudentRecord } from "@/lib/storage/expelledStudents";
import type { StudentDirectoryRecord } from "@/lib/storage/studentDirectory";

const DIRECTORY = "student-directory";
const EXPELLED = "expelled-students";
const schema = z.object({
  studentId: z.string().trim().min(1).max(100),
  resumeExamYear: z.string().regex(/^\d{4}$/),
  resumeAcademicYear: z.enum(["1st", "2nd", "3rd", "4th"]),
  resumeSemester: z.enum(["Odd", "Even", "Short Semester"]),
  reason: z.string().trim().max(500).default("Unfair activity in examination"),
});

async function load(prisma: NonNullable<ReturnType<typeof getPrisma>>) {
  await prisma.$executeRaw(Prisma.sql`INSERT INTO "ResultSectionStore" ("section", "data", "updatedAt") VALUES (${EXPELLED}, '[]'::jsonb, NOW()) ON CONFLICT ("section") DO NOTHING`);
  const rows = await prisma.$queryRaw<Array<{ section: string; data: Prisma.JsonValue }>>(
    Prisma.sql`SELECT "section", "data" FROM "ResultSectionStore" WHERE "section" IN (${Prisma.join([DIRECTORY, EXPELLED])})`,
  );
  const directory = rows.find((row) => row.section === DIRECTORY)?.data;
  const expelled = rows.find((row) => row.section === EXPELLED)?.data;
  return {
    students: Array.isArray(directory) ? directory as unknown as StudentDirectoryRecord[] : [],
    records: Array.isArray(expelled) ? expelled as unknown as ExpelledStudentRecord[] : [],
  };
}

export async function GET() {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try { return NextResponse.json(await load(prisma), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("Unable to load expelled students", error); return NextResponse.json({ error: "Unable to load expelled students" }, { status: 503 }); }
}

export async function PUT(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid suspension details" }, { status: 400 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try {
    const { students, records } = await load(prisma);
    const student = students.find((item) => item.id === parsed.data.studentId);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    const now = new Date().toISOString();
    const previous = records.find((item) => item.studentId === student.id);
    const record: ExpelledStudentRecord = { ...parsed.data, name: student.name, rollNo: student.rollNo, registrationNo: student.registrationNo, series: student.series, reason: parsed.data.reason || "Unfair activity in examination", createdAt: previous?.createdAt || now, updatedAt: now };
    const next = [...records.filter((item) => item.studentId !== student.id), record];
    const serialized = JSON.stringify(next);
    await prisma.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data" = CAST(${serialized} AS jsonb), "updatedAt" = NOW() WHERE "section" = ${EXPELLED}`);
    return NextResponse.json({ record, records: next });
  } catch (error) { console.error("Unable to save expelled student", error); return NextResponse.json({ error: "Unable to save expelled student" }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const studentId = new URL(request.url).searchParams.get("studentId")?.trim();
  if (!studentId) return NextResponse.json({ error: "Student is required" }, { status: 400 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try {
    const { records } = await load(prisma);
    const next = records.filter((item) => item.studentId !== studentId);
    const serialized = JSON.stringify(next);
    await prisma.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data" = CAST(${serialized} AS jsonb), "updatedAt" = NOW() WHERE "section" = ${EXPELLED}`);
    return NextResponse.json({ records: next });
  } catch (error) { console.error("Unable to reinstate student", error); return NextResponse.json({ error: "Unable to reinstate student" }, { status: 503 }); }
}
