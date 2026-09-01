import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import type { VivaCohort, VivaStudent } from "@/lib/storage/vivaMarks";

const VIVA_SECTION = "add-viva-marks";
const RESULT_SECTION = "result-sheet";
const selectionSchema = z.object({
  department: z.string().min(1).max(150),
  examYear: z.string().regex(/^\d{4}$/),
  academicYear: z.enum(["1st", "2nd", "3rd", "4th"]),
  semester: z.enum(["Odd", "Even"]),
});
type Selection = z.infer<typeof selectionSchema>;
type ResultHistory = {
  examYear: string;
  academicYear: string;
  semester: string;
  students?: Array<{ studentId: string }>;
};

async function teacherContext() {
  const id = (await cookies()).get("becm-portal-account")?.value;
  const prisma = getPrisma();
  if (!id || !prisma) return null;
  const teacher = await prisma.portalAccount.findFirst({
    where: { id, role: "teacher", active: true },
    select: { id: true, email: true, name: true },
  });
  return teacher ? { prisma, teacher } : null;
}

async function sectionData<T>(
  prisma: NonNullable<ReturnType<typeof getPrisma>>,
  section: string,
): Promise<T[]> {
  const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(
    Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section" = ${section} LIMIT 1`,
  );
  return Array.isArray(rows[0]?.data) ? rows[0].data as T[] : [];
}

const same = (
  result: { examYear: string; academicYear: string; semester: string; department?: string },
  selection: Selection,
) =>
  (!result.department || result.department === selection.department) &&
  result.examYear === selection.examYear &&
  result.academicYear === selection.academicYear &&
  result.semester === selection.semester;

const placeholderStudents = (history: ResultHistory): VivaStudent[] =>
  (history.students || []).map((student) => ({
    id: student.studentId,
    name: "",
    registrationNo: "",
    rollNo: "",
    registrationType: "Regular",
    marks: "",
    present: true,
  }));

export async function GET() {
  const context = await teacherContext();
  if (!context) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  try {
    const [vivas, histories] = await Promise.all([
      sectionData<VivaCohort>(context.prisma, VIVA_SECTION),
      sectionData<ResultHistory>(context.prisma, RESULT_SECTION),
    ]);
    const results = [...vivas.filter((cohort) => cohort.finalized)];
    for (const history of histories) {
      if (results.some((result) => same(result, { department: result.department, examYear: history.examYear, academicYear: history.academicYear as Selection["academicYear"], semester: history.semester as Selection["semester"] }))) continue;
      results.push({
        department: "Building Engineering & Construction Management",
        examYear: history.examYear,
        academicYear: history.academicYear,
        semester: history.semester,
        students: placeholderStudents(history),
        finalized: true,
      } as VivaCohort);
    }
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Unable to load finalized results", error);
    return NextResponse.json({ error: "Unable to load finalized results" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const context = await teacherContext();
  if (!context) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const parsed = selectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid result selection" }, { status: 400 });

  try {
    const [results, histories] = await Promise.all([
      sectionData<VivaCohort>(context.prisma, VIVA_SECTION),
      sectionData<ResultHistory>(context.prisma, RESULT_SECTION),
    ]);
    const history = histories.find((item) => same(item, parsed.data));
    let index = results.findIndex((cohort) => same(cohort, parsed.data));

    if (index < 0 && !history) {
      return NextResponse.json(
        { error: "Generate the result sheet for this examination before requesting publication." },
        { status: 409 },
      );
    }
    if (index < 0 && history) {
      results.push({
        ...parsed.data,
        students: placeholderStudents(history),
        finalized: true,
      });
      index = results.length - 1;
    }
    if (!results[index].finalized && !history) {
      return NextResponse.json({ error: "This result has not been finalized" }, { status: 409 });
    }

    if (!results[index].submitted && !results[index].published) {
      results[index] = {
        ...results[index],
        finalized: true,
        submitted: true,
        published: false,
        returnedForCorrection: false,
        returnedAt: undefined,
        returnedBy: undefined,
        submittedAt: new Date().toISOString(),
        submittedBy: context.teacher.name || context.teacher.email,
      };
    }

    const serialized = JSON.stringify(results);
    await context.prisma.$executeRaw(
      Prisma.sql`INSERT INTO "ResultSectionStore" ("section", "data", "updatedAt")
        VALUES (${VIVA_SECTION}, CAST(${serialized} AS jsonb), NOW())
        ON CONFLICT ("section") DO UPDATE
        SET "data" = EXCLUDED."data", "updatedAt" = NOW()`,
    );
    return NextResponse.json({ result: results[index] });
  } catch (error) {
    console.error("Unable to publish result", error);
    return NextResponse.json({ error: "Unable to publish result" }, { status: 503 });
  }
}
