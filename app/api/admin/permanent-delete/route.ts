import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated, validateAdminPassword } from "@/lib/adminAuth";
import { getPrisma } from "@/lib/prisma";
import type { StudentDirectoryRecord } from "@/lib/storage/studentDirectory";

const DIRECTORY = "student-directory";
const ARCHIVE = "student-directory-archive";
const deleteSchema = z.object({
  studentId: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  }
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try {
    const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(
      Prisma.sql`SELECT "data" FROM "ResultSectionStore"
        WHERE "section" = ${DIRECTORY} LIMIT 1`,
    );
    const students = Array.isArray(rows[0]?.data)
      ? rows[0].data as unknown as StudentDirectoryRecord[]
      : [];
    return NextResponse.json({ students }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load students for permanent deletion", error);
    return NextResponse.json({ error: "Unable to load students" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  }
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Student and admin password are required" },
      { status: 400 },
    );
  }
  if (!validateAdminPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Incorrect admin password" }, { status: 403 });
  }
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });

  try {
    const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(
      Prisma.sql`SELECT "data" FROM "ResultSectionStore"
        WHERE "section" = ${DIRECTORY} LIMIT 1`,
    );
    const directory = Array.isArray(rows[0]?.data)
      ? rows[0].data as unknown as StudentDirectoryRecord[]
      : [];
    const student = directory.find((item) => item.id === parsed.data.studentId);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const archiveRows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(
      Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section" = ${ARCHIVE} LIMIT 1`,
    );
    const archive = Array.isArray(archiveRows[0]?.data)
      ? archiveRows[0].data as unknown as StudentDirectoryRecord[]
      : [];
    const archived = [...archive.filter((item) => item.id !== student.id), student];
    const remaining = directory.filter((item) => item.id !== parsed.data.studentId);
    const serialized = JSON.stringify(remaining);
    const archiveJson = JSON.stringify(archived);
    await prisma.$transaction([
      prisma.$executeRaw(
        Prisma.sql`UPDATE "ResultSectionStore"
          SET "data" = CAST(${serialized} AS jsonb), "updatedAt" = NOW()
          WHERE "section" = ${DIRECTORY}`,
      ),
      prisma.$executeRaw(
        Prisma.sql`INSERT INTO "ResultSectionStore" ("section", "data", "updatedAt")
          VALUES (${ARCHIVE}, CAST(${archiveJson} AS jsonb), NOW())
          ON CONFLICT ("section") DO UPDATE
          SET "data" = EXCLUDED."data", "updatedAt" = NOW()`,
      ),
    ]);

    return NextResponse.json({
      deleted: { id: student.id, name: student.name, rollNo: student.rollNo },
      historicalResultsPreserved: true,
    });
  } catch (error) {
    console.error("Unable to permanently delete student", error);
    return NextResponse.json({ error: "Unable to permanently delete student" }, { status: 503 });
  }
}
