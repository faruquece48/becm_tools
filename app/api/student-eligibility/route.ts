import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

const SECTION = "student-eligibility";
const PUBLICATION_SECTION = "add-viva-marks";
const row = z.object({
  examYear: z.string().regex(/^\d{4}$/),
  academicYear: z.enum(["1st", "2nd", "3rd", "4th"]),
  semester: z.enum(["Odd", "Even", "Short Semester"]),
  courseId: z.string().min(1).max(100),
  courseCode: z.string().max(50),
  courseTitle: z.string().max(250),
  students: z.array(z.object({ studentId: z.string().min(1).max(100), eligible: z.boolean() })).max(1000),
  updatedAt: z.string().datetime(),
});
const rows = z.array(row).max(5000);
const payload = z.union([row, z.object({ records: z.array(row).min(1).max(500), registerForBacklog: z.boolean().optional() })]);

async function db() {
  const id = (await cookies()).get("becm-portal-account")?.value;
  const prisma = getPrisma();
  if (!id || !prisma) return null;
  const teacher = await prisma.portalAccount.findFirst({ where: { id, role: "teacher", active: true }, select: { id: true } });
  return teacher ? prisma : null;
}

async function load(prisma: NonNullable<ReturnType<typeof getPrisma>>) {
  await prisma.$executeRaw(Prisma.sql`INSERT INTO "ResultSectionStore" ("section","data","updatedAt") VALUES (${SECTION},'[]'::jsonb,NOW()) ON CONFLICT ("section") DO NOTHING`);
  const found = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section"=${SECTION}`);
  return rows.parse(found[0]?.data ?? []);
}

export async function GET() {
  const prisma = await db();
  if (!prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  try {
    return NextResponse.json({ records: await load(prisma) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load eligibility" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const prisma = await db();
  if (!prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid eligibility" }, { status: 400 });
  try {
    const current = await load(prisma);
    const updates = "records" in parsed.data ? parsed.data.records : [parsed.data];
    const publicationRows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(
      Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section"=${PUBLICATION_SECTION}`,
    );
    const publications = Array.isArray(publicationRows[0]?.data) ? publicationRows[0].data : [];
    const changesPublishedResult = updates.some((update) =>
      publications.some((publication) => {
        if (!publication || typeof publication !== "object" || Array.isArray(publication)) return false;
        const item = publication as Record<string, unknown>;
        return item.published === true
          && item.examYear === update.examYear
          && item.academicYear === update.academicYear
          && item.semester === update.semester;
      }),
    );
    if (changesPublishedResult) {
      return NextResponse.json(
        { error: "Result has already been published. Eligibility changes are not allowed." },
        { status: 409 },
      );
    }
    for (const update of updates) {
      const index = current.findIndex((item) => item.examYear === update.examYear && item.academicYear === update.academicYear && item.semester === update.semester && item.courseId === update.courseId);
      if (index < 0) current.push(update); else current[index] = update;
    }
    const serialized = JSON.stringify(current);
    const writes = [prisma.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data"=CAST(${serialized} AS jsonb),"updatedAt"=NOW() WHERE "section"=${SECTION}`)];
    if ("registerForBacklog" in parsed.data && parsed.data.registerForBacklog) {
      const studentIds = new Set(updates[0].students.filter((student) => !student.eligible && updates.every((update) => update.students.find((candidate) => candidate.studentId === student.studentId)?.eligible === false)).map((student) => student.studentId));
      const directoryRows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section"='student-directory' LIMIT 1`);
      const directory = Array.isArray(directoryRows[0]?.data) ? directoryRows[0].data as Array<Record<string, unknown>> : [];
      const createdAt = new Date().toISOString();
      const registration = { examYear: updates[0].examYear, academicYear: updates[0].academicYear, semester: updates[0].semester, createdAt };
      for (const student of directory) {
        if (!studentIds.has(String(student.id))) continue;
        const existing = Array.isArray(student.backlogEligibility) ? student.backlogEligibility as Array<Record<string, unknown>> : [];
        if (!existing.some((item) => item.examYear === registration.examYear && item.academicYear === registration.academicYear && item.semester === registration.semester)) student.backlogEligibility = [...existing, registration];
      }
      const directoryJson = JSON.stringify(directory);
      writes.push(prisma.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data"=CAST(${directoryJson} AS jsonb),"updatedAt"=NOW() WHERE "section"='student-directory'`));
    }
    await prisma.$transaction(writes);
    return NextResponse.json({ records: current });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to save eligibility" }, { status: 503 });
  }
}