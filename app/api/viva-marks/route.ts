import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import type { VivaCohort, VivaStudent } from "@/lib/storage/vivaMarks";
import type { StudentDirectoryRecord } from "@/lib/storage/studentDirectory";
import type { CourseEligibility } from "@/lib/storage/studentEligibility";

const SECTION = "add-viva-marks";
const selectionSchema = z.object({ department: z.string().min(1).max(150), examYear: z.string().regex(/^\d{4}$/), academicYear: z.enum(["1st","2nd","3rd","4th"]), semester: z.enum(["Odd","Even"]) });
const studentSchema = z.object({ id: z.string().min(1).max(100), name: z.string().max(200), registrationNo: z.string().max(50), rollNo: z.string().max(50), registrationType: z.string().max(50), marks: z.union([z.literal(""), z.string().regex(/^\d{1,3}$/).refine((value) => Number(value) <= 100, "Marks cannot exceed 100")]), present: z.boolean() });
const saveSchema = selectionSchema.extend({ students: z.array(studentSchema).max(500) });

async function teacherPrisma() {
  const id = (await cookies()).get("becm-portal-account")?.value;
  const prisma = getPrisma();
  if (!id || !prisma) return null;
  const teacher = await prisma.portalAccount.findFirst({ where: { id, role: "teacher", active: true }, select: { id: true } });
  return teacher ? prisma : null;
}
const sameSelection = (cohort: VivaCohort, value: z.infer<typeof selectionSchema>) => cohort.department === value.department && cohort.examYear === value.examYear && cohort.academicYear === value.academicYear && cohort.semester === value.semester;
async function loadCohorts(prisma: NonNullable<ReturnType<typeof getPrisma>>) {
  await prisma.$executeRaw(Prisma.sql`INSERT INTO "ResultSectionStore" ("section", "data", "updatedAt") VALUES (${SECTION}, '[]'::jsonb, NOW()) ON CONFLICT ("section") DO NOTHING`);
  const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section" = ${SECTION} LIMIT 1`);
  return Array.isArray(rows[0]?.data) ? rows[0].data as unknown as VivaCohort[] : [];
}
async function storedJson<T>(prisma: NonNullable<ReturnType<typeof getPrisma>>, section: string): Promise<T[]> {
  const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section" = ${section} LIMIT 1`);
  return Array.isArray(rows[0]?.data) ? rows[0].data as unknown as T[] : [];
}
async function excludedStudents(prisma: NonNullable<ReturnType<typeof getPrisma>>, value: z.infer<typeof selectionSchema>) {
  const eligibility = await storedJson<CourseEligibility>(prisma, "student-eligibility");
  const matching = eligibility.filter((row) => row.examYear === value.examYear && row.academicYear === value.academicYear && row.semester === value.semester);
  return new Set(matching.flatMap((row) => row.students.filter((student) => !student.eligible).map((student) => student.studentId)));
}
function orderStudents<T extends { rollNo: string }>(students: T[], expectedSeries: string) {
  const expectedRollSeries = expectedSeries.slice(-2);
  const rollSeries = (rollNo: string) => rollNo.replace(/\D/g, "").slice(0, 2);
  return [...students].sort((left, right) => {
    const leftSeries = rollSeries(left.rollNo);
    const rightSeries = rollSeries(right.rollNo);
    const leftGroup = leftSeries === expectedRollSeries ? 0 : 1;
    const rightGroup = rightSeries === expectedRollSeries ? 0 : 1;
    return leftGroup - rightGroup || Number(rightSeries) - Number(leftSeries) || left.rollNo.localeCompare(right.rollNo, undefined, { numeric: true });
  });
}
async function initialStudents(prisma: NonNullable<ReturnType<typeof getPrisma>>, value: z.infer<typeof selectionSchema>): Promise<VivaStudent[]> {
  const yearNumber = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 }[value.academicYear];
  const series = String(Number(value.examYear) - yearNumber);
  const excluded = await excludedStudents(prisma, value);
  const directory = await storedJson<StudentDirectoryRecord>(prisma, "student-directory");
  const matching = orderStudents(directory.filter((student) => Number(student.series) <= Number(series) && student.year === value.academicYear && student.semester === value.semester && !excluded.has(student.id)), series);
  return matching.map((student) => ({ id: student.id, name: student.name, registrationNo: student.registrationNo, rollNo: student.rollNo, registrationType: "Regular", marks: "", present: true }));
}

export async function GET(request: Request) {
  const prisma = await teacherPrisma();
  if (!prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const url = new URL(request.url);
  const selection = selectionSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!selection.success) return NextResponse.json({ error: "Select academic year, exam year and semester" }, { status: 400 });
  try {
    const cohorts = await loadCohorts(prisma);
    const saved = cohorts.find((cohort) => sameSelection(cohort, selection.data));
    const excluded = await excludedStudents(prisma, selection.data);
    const directoryStudents = await initialStudents(prisma, selection.data);
    const allowed = new Set(directoryStudents.map((student) => student.id));
    const series = String(Number(selection.data.examYear) - { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 }[selection.data.academicYear]);
    const students = saved?.students ? orderStudents(saved.students.filter((student) => allowed.has(student.id) && !excluded.has(student.id)), series) : directoryStudents;
    return NextResponse.json({ students, published: Boolean(saved?.published) });
  } catch (error) { console.error("Unable to load viva marks", error); return NextResponse.json({ error: "Unable to load viva marks" }, { status: 503 }); }
}

export async function PUT(request: Request) {
  const prisma = await teacherPrisma();
  if (!prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid viva marks" }, { status: 400 });
  try {
    const cohorts = await loadCohorts(prisma);
    const existing = cohorts.find((cohort) => sameSelection(cohort, parsed.data));
    if (existing?.published) return NextResponse.json({ error: "Result Already Published. No Change Allowed." }, { status: 409 });
    const excluded = await excludedStudents(prisma, parsed.data);
    const allowed = new Set((await initialStudents(prisma, parsed.data)).map((student) => student.id));
    const next: VivaCohort = { ...parsed.data, students: parsed.data.students.filter((student) => allowed.has(student.id) && !excluded.has(student.id)), finalized: true, published: false, updatedAt: new Date().toISOString() };
    const index = cohorts.findIndex((cohort) => sameSelection(cohort, parsed.data));
    if (index < 0) cohorts.push(next); else cohorts[index] = next;
    const serialized = JSON.stringify(cohorts);
    await prisma.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data" = CAST(${serialized} AS jsonb), "updatedAt" = NOW() WHERE "section" = ${SECTION}`);
    return NextResponse.json({ students: next.students, saved: true });
  } catch (error) { console.error("Unable to save viva marks", error); return NextResponse.json({ error: "Unable to save viva marks" }, { status: 503 }); }
}
