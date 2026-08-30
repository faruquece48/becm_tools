import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated, validateAdminPassword } from "@/lib/adminAuth";
import { getPrisma } from "@/lib/prisma";
import type { StudentDirectoryRecord } from "@/lib/storage/studentDirectory";

const DIRECTORY = "student-directory";
const relatedSections = ["student-eligibility", "prepare-result", "prepare-result-backlog", "add-viva-marks", "marks-sheet", "marks-sheet-backlog", "result-sheet", "result-sheet-backlog", "tabulation-sheet", "tabulation-sheet-backlog"];
const deleteSchema = z.object({ studentId: z.string().trim().min(1).max(100), password: z.string().min(1).max(200) });

type JsonRecord = Record<string, unknown>;
const object = (value: unknown): value is JsonRecord => Boolean(value) && typeof value === "object" && !Array.isArray(value);
function removeStudent(value: unknown, studentId: string): unknown {
  if (Array.isArray(value)) return value.filter((item) => !(object(item) && (item.studentId === studentId || item.id === studentId))).map((item) => removeStudent(item, studentId));
  if (!object(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, key === "students" && Array.isArray(child) ? child.filter((item) => !(object(item) && (item.studentId === studentId || item.id === studentId))).map((item) => removeStudent(item, studentId)) : removeStudent(child, studentId)]));
}

export async function GET() {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try {
    const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section" = ${DIRECTORY} LIMIT 1`);
    const students = Array.isArray(rows[0]?.data) ? rows[0].data as unknown as StudentDirectoryRecord[] : [];
    return NextResponse.json({ students }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { console.error("Unable to load students for permanent deletion", error); return NextResponse.json({ error: "Unable to load students" }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Student and admin password are required" }, { status: 400 });
  if (!validateAdminPassword(parsed.data.password)) return NextResponse.json({ error: "Incorrect admin password" }, { status: 403 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try {
    const sectionRows = await prisma.$queryRaw<Array<{ section: string; data: Prisma.JsonValue }>>(Prisma.sql`SELECT "section", "data" FROM "ResultSectionStore" WHERE "section" = ${DIRECTORY} OR "section" IN (${Prisma.join(relatedSections)})`);
    const directoryRow = sectionRows.find((row) => row.section === DIRECTORY);
    const directory = Array.isArray(directoryRow?.data) ? directoryRow.data as unknown as StudentDirectoryRecord[] : [];
    const student = directory.find((item) => item.id === parsed.data.studentId);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    const updates = sectionRows.map((row) => {
      const data = row.section === DIRECTORY ? directory.filter((item) => item.id !== parsed.data.studentId) : removeStudent(row.data, parsed.data.studentId);
      return prisma.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data" = CAST(${JSON.stringify(data)} AS jsonb), "updatedAt" = NOW() WHERE "section" = ${row.section}`);
    });
    await prisma.$transaction(updates);
    return NextResponse.json({ deleted: { id: student.id, name: student.name, rollNo: student.rollNo } });
  } catch (error) { console.error("Unable to permanently delete student", error); return NextResponse.json({ error: "Unable to permanently delete student" }, { status: 503 }); }
}