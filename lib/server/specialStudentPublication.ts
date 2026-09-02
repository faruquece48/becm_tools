import { Prisma } from "@prisma/client";
import type { getPrisma } from "@/lib/prisma";
import type { OldStudentCourseStatus, OldStudentRecord } from "@/lib/storage/studentDirectory";
import type { SyllabusSegment } from "@/lib/storage/syllabuses";

const DIRECTORY_SECTION = "old-student-directory";
const LEDGER_SECTION = "old-student-result-updates";
type PrismaClient = NonNullable<ReturnType<typeof getPrisma>>;
type Selection = { examType: "Regular" | "Backlog"; examYear: string; academicYear: string; semester: string };
type Mark = { studentId: string; present?: boolean; withheld?: boolean; partA?: string; partB?: string; classTestAttendance?: string; sessional?: string; marks?: string; result?: "Pass" | "Fail" };
type PreparedRegular = Selection & { courseId: string; students: Mark[] };
type PreparedBacklog = Selection & { courseId?: string; courseCode: string } & Mark;
type Eligibility = Selection & { courseId: string; students: Array<{ studentId: string; eligible: boolean }> };
type Viva = Selection & { students: Array<{ id: string; marks: string; present: boolean }> };
type CourseChange = { courseId: string; before: OldStudentCourseStatus | null; after: OldStudentCourseStatus | null };
type StudentChange = { studentId: string; credit: number; quality: number; courses: CourseChange[] };
type LedgerEntry = Selection & { key: string; applied: boolean; approvedAt: string; students: StudentChange[] };

const points: Record<string, number> = { "A+": 4, A: 3.75, "A-": 3.5, "B+": 3.25, B: 3, "B-": 2.75, "C+": 2.5, C: 2.25, D: 2, F: 0 };
const numberValue = (value: unknown) => Number(value) || 0;
const grade = (score: number) => score >= 80 ? "A+" : score >= 75 ? "A" : score >= 70 ? "A-" : score >= 65 ? "B+" : score >= 60 ? "B" : score >= 55 ? "B-" : score >= 50 ? "C+" : score >= 45 ? "C" : score >= 40 ? "D" : "F";
const keyFor = (selection: Selection) => [selection.examType, selection.examYear, selection.academicYear, selection.examType === "Backlog" ? "Backlog" : selection.semester].join("|");

async function readArray<T>(prisma: PrismaClient, section: string): Promise<T[]> {
  const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section"=${section} LIMIT 1`);
  return Array.isArray(rows[0]?.data) ? rows[0].data as unknown as T[] : [];
}
function promotionFor(student: OldStudentRecord, selection: Selection) {
  return student.promotions.find((promotion) => promotion.examType === selection.examType && promotion.examYear === selection.examYear && promotion.academicYear === selection.academicYear && (selection.examType === "Backlog" || promotion.semester === selection.semester));
}

export async function specialStudentPublicationWrites(prisma: PrismaClient, selection: Selection, action: "accept" | "send-back") {
  await prisma.$executeRaw(Prisma.sql`INSERT INTO "ResultSectionStore" ("section","data","updatedAt") VALUES (${LEDGER_SECTION},'[]'::jsonb,NOW()) ON CONFLICT ("section") DO NOTHING`);
  const preparedSection = selection.examType === "Backlog" ? "prepare-result-backlog" : "prepare-result";
  const [students, syllabuses, eligibility, vivas, ledger, prepared] = await Promise.all([
    readArray<OldStudentRecord>(prisma, DIRECTORY_SECTION), readArray<SyllabusSegment>(prisma, "syllabuses"),
    readArray<Eligibility>(prisma, "student-eligibility"), readArray<Viva>(prisma, "add-viva-marks"),
    readArray<LedgerEntry>(prisma, LEDGER_SECTION), readArray<PreparedRegular | PreparedBacklog>(prisma, preparedSection),
  ]);
  const key = keyFor(selection), previous = ledger.find((entry) => entry.key === key && entry.applied);
  if (action === "send-back") {
    if (!previous) return [];
    const byId = new Map(students.map((student) => [student.id, student]));
    previous.students.forEach((change) => {
      const student = byId.get(change.studentId); if (!student) return;
      student.earnedCredit = Math.max(0, student.earnedCredit - change.credit); student.gradePoints = Math.max(0, student.gradePoints - change.quality);
      const statuses = new Map(student.outstandingCourses.map((course) => [course.courseId, course.status]));
      change.courses.forEach((course) => course.before === null ? statuses.delete(course.courseId) : statuses.set(course.courseId, course.before));
      student.outstandingCourses = Array.from(statuses, ([courseId, status]) => ({ courseId, status })); student.updatedAt = new Date().toISOString();
    });
    previous.applied = false;
  } else {
    if (previous) return [];
    const allCourses = syllabuses.flatMap((segment) => segment.courses), coursesById = new Map(allCourses.map((course) => [course.id, course]));
    const changes: StudentChange[] = [], viva = vivas.find((row) => row.examYear === selection.examYear && row.academicYear === selection.academicYear && (selection.examType === "Backlog" || row.semester === selection.semester));
    students.forEach((student) => {
      const promotion = promotionFor(student, selection); if (!promotion) return;
      const statuses = new Map(student.outstandingCourses.map((course) => [course.courseId, course.status]));
      const change: StudentChange = { studentId: student.id, credit: 0, quality: 0, courses: [] };
      promotion.courseIds.forEach((courseId) => {
        const course = coursesById.get(courseId); if (!course) return;
        const before = statuses.get(courseId) ?? null; let after: OldStudentCourseStatus | null = before; let letter = "";
        if (selection.examType === "Regular") {
          const row = (prepared as PreparedRegular[]).find((record) => record.examYear === selection.examYear && record.academicYear === selection.academicYear && record.semester === selection.semester && record.courseId === courseId)?.students.find((mark) => mark.studentId === student.id);
          const eligible = eligibility.find((record) => record.examYear === selection.examYear && record.academicYear === selection.academicYear && record.semester === selection.semester && record.courseId === courseId)?.students.find((item) => item.studentId === student.id)?.eligible ?? true;
          if (!eligible) after = "need-register";
          else if (row) {
            const vivaStudent = viva?.students.find((item) => item.id === student.id), vivaMarks = vivaStudent?.present ? numberValue(vivaStudent.marks) : 0, theory = course.type === "Theory";
            const score = Math.round(theory ? (row.present ? numberValue(row.partA) + numberValue(row.partB) : 0) + numberValue(row.classTestAttendance) : numberValue(row.sessional) + vivaMarks);
            letter = row.withheld ? "W" : !row.present || (theory && numberValue(row.partA) + numberValue(row.partB) < 15) ? "F" : grade(score); after = letter === "F" || letter === "W" ? "failed" : null;
          }
        } else {
          const row = (prepared as PreparedBacklog[]).find((record) => record.studentId === student.id && record.examYear === selection.examYear && record.academicYear === selection.academicYear && record.courseId === courseId);
          if (row) { const score = numberValue(row.marks) || Math.round((row.present ? numberValue(row.partA) + numberValue(row.partB) : 0) + numberValue(row.classTestAttendance)); letter = row.result === "Fail" || !row.present || numberValue(row.partA) + numberValue(row.partB) < 15 ? "F" : grade(score); after = letter === "F" ? "failed" : null; }
        }
        if (after === before) return;
        change.courses.push({ courseId, before, after });
        if (after === null && letter && letter !== "F" && letter !== "W") { const credit = numberValue(course.credit); change.credit += credit; change.quality += credit * (points[letter] || 0); }
        if (after === null) statuses.delete(courseId); else statuses.set(courseId, after);
      });
      if (!change.courses.length) return;
      student.earnedCredit += change.credit; student.gradePoints += change.quality; student.outstandingCourses = Array.from(statuses, ([courseId, status]) => ({ courseId, status })); student.updatedAt = new Date().toISOString(); changes.push(change);
    });
    ledger.push({ ...selection, key, applied: true, approvedAt: new Date().toISOString(), students: changes });
  }
  const directoryJson = JSON.stringify(students), ledgerJson = JSON.stringify(ledger);
  return [prisma.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data"=CAST(${directoryJson} AS jsonb),"updatedAt"=NOW() WHERE "section"=${DIRECTORY_SECTION}`), prisma.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data"=CAST(${ledgerJson} AS jsonb),"updatedAt"=NOW() WHERE "section"=${LEDGER_SECTION}`)];
}
