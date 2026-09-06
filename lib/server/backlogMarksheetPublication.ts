import { Prisma } from "@prisma/client";
import { backlogGradePoint } from "@/lib/backlogGrading";
import { getPrisma } from "@/lib/prisma";

type Db = NonNullable<ReturnType<typeof getPrisma>>;
type Selection = { examYear: string; academicYear: string };
type ArchiveRow = { studentId: string; rollNo?: string; earnedCredit: number; gradePoints: number; failedSubjects: string[]; registerAgain: string[] };
type SemesterArchive = Selection & { semester: string; series?: string; students: ArchiveRow[]; updatedAt?: string };
const norm = (value: unknown) => String(value || "").replace(/\s/g, "").toLowerCase();
const regularGradePoint = (score: number) => score >= 80 ? 4 : score >= 75 ? 3.75 : score >= 70 ? 3.5 : score >= 65 ? 3.25 : score >= 60 ? 3 : score >= 55 ? 2.75 : score >= 50 ? 2.5 : score >= 45 ? 2.25 : score >= 40 ? 2 : 0;

async function data(prisma: Db, section: string) {
  const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section"=${section} LIMIT 1`);
  return Array.isArray(rows[0]?.data) ? rows[0].data as Array<Record<string, unknown>> : [];
}

export async function backlogMarksheetPublicationData(prisma: Db, selection: Selection) {
  const [prepared, syllabuses, archives] = await Promise.all([data(prisma, "prepare-result-backlog"), data(prisma, "syllabuses"), data(prisma, "marks-sheet-backlog")]);
  const courses = syllabuses.flatMap(segment => Array.isArray(segment.courses) ? segment.courses as Array<Record<string, unknown>> : []);
  const rows = prepared.filter(row => row.examYear === selection.examYear && row.academicYear === selection.academicYear);
  const students = new Map<string, { studentId: string; rollNo: string; earnedCredit: number; gradePoints: number; failedSubjects: string[] }>();
  for (const row of rows) {
    const studentId = String(row.studentId || ""), rollNo = String(row.rollNo || "");
    if (!studentId) continue;
    const course = courses.find(item => item.id === row.courseId) || courses.find(item => norm(item.code) === norm(row.courseCode) && item.semester === row.semester);
    if (!course) throw Error(`Missing syllabus course for backlog result: ${String(row.courseCode || "")}`);
    const current = students.get(studentId) || { studentId, rollNo, earnedCredit: 0, gradePoints: 0, failedSubjects: [] };
    const score = Number(row.marks || 0), passed = row.result !== "Fail" && score >= 40, credit = Number(course.credit || 0);
    if (passed) { current.earnedCredit += credit; current.gradePoints += credit * backlogGradePoint(score); }
    else current.failedSubjects.push(String(row.courseCode || course.code || ""));
    students.set(studentId, current);
  }
  const now = new Date().toISOString();
  const archive = { ...selection, semester: "", series: "", students: [...students.values()].map(row => ({ ...row, earnedCredit: Number(row.earnedCredit.toFixed(3)), gradePoints: Number(row.gradePoints.toFixed(3)), sgpa: (Math.round((((row.earnedCredit ? row.gradePoints / row.earnedCredit : 0) + Number.EPSILON) * 100)) / 100).toFixed(2), failedSubjects: [...new Set(row.failedSubjects.filter(Boolean))], registerAgain: [] })), updatedAt: now };
  const next = [...archives.filter(row => !(row.examYear === selection.examYear && row.academicYear === selection.academicYear)), archive];
  return next;
}

export async function regularMarksheetPublicationData(prisma: Db, selection: Selection & { semester: string }) {
  const [prepared, syllabuses, eligibility, vivas, directory, archives] = await Promise.all(["prepare-result", "syllabuses", "student-eligibility", "add-viva-marks", "student-directory", "marks-sheet"].map(section => data(prisma, section)));
  const courses = syllabuses.flatMap(segment => Array.isArray(segment.courses) ? segment.courses as Array<Record<string, unknown>> : []).filter(course => course.year === selection.academicYear && course.semester === selection.semester);
  const examRows = prepared.filter(row => row.examYear === selection.examYear && row.academicYear === selection.academicYear && row.semester === selection.semester && courses.some(course => course.id === row.courseId));
  const ids = new Set(examRows.flatMap(row => Array.isArray(row.students) ? (row.students as Array<Record<string, unknown>>).map(student => String(student.studentId || "")) : []).filter(Boolean));
  const vivaRows = vivas.find(row => row.examYear === selection.examYear && row.academicYear === selection.academicYear && row.semester === selection.semester)?.students as Array<Record<string, unknown>> | undefined;
  const students = [...ids].flatMap(studentId => {
    const identity = directory.find(row => row.id === studentId);
    const results = courses.map(course => {
      const eligibilityStudents = eligibility.find(row => row.examYear === selection.examYear && row.academicYear === selection.academicYear && row.semester === selection.semester && row.courseId === course.id)?.students as Array<Record<string, unknown>> | undefined;
      const eligible = !eligibilityStudents?.find(student => student.studentId === studentId && student.eligible === false);
      const mark = examRows.find(row => row.courseId === course.id)?.students as Array<Record<string, unknown>> | undefined;
      const value = mark?.find(student => student.studentId === studentId);
      if (!eligible) return { code: String(course.code || ""), status: "register", credit: 0, gp: 0 };
      if (!value) return { code: String(course.code || ""), status: "missing", credit: 0, gp: 0 };
      const theory = course.type === "Theory", thesis = course.type === "Thesis", n = (field: string) => Number(value[field] || 0);
      const viva = vivaRows?.find(student => student.id === studentId), vivaMark = viva?.present ? Number(viva.marks || 0) : 0;
      const score = Math.round(theory ? (value.present === false ? 0 : n("partA") + n("partB")) + n("classTestAttendance") : thesis ? n("internal") + n("external") + n("thesisViva") : n("sessional") + vivaMark);
      const failed = value.withheld || value.present === false || (theory && n("partA") + n("partB") < 15) || (!theory && !thesis && vivaMark <= 0) || score < 40;
      const credit = failed ? 0 : Number(course.credit || 0);
      return { code: String(course.code || ""), status: failed ? "failed" : "passed", credit, gp: failed ? 0 : credit * regularGradePoint(score) };
    });
    if (results.every(result => result.status === "register")) return [];
    const earnedCredit = Number(results.reduce((sum, result) => sum + result.credit, 0).toFixed(3)), gradePoints = Number(results.reduce((sum, result) => sum + result.gp, 0).toFixed(3));
    return [{ studentId, rollNo: String(identity?.rollNo || ""), earnedCredit, gradePoints, sgpa: (Math.round((((earnedCredit ? gradePoints / earnedCredit : 0) + Number.EPSILON) * 100)) / 100).toFixed(2), failedSubjects: results.filter(result => result.status === "failed").map(result => result.code), registerAgain: results.filter(result => result.status === "register").map(result => result.code) }];
  });
  const record = { ...selection, series: String(Number(selection.examYear) - ({ "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 }[selection.academicYear] || 1)), students, updatedAt: new Date().toISOString() };
  return [...archives.filter(row => !(row.examYear === selection.examYear && row.academicYear === selection.academicYear && row.semester === selection.semester)), record];
}

const yearOrder: Record<string, number> = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 };
const rank = (row: Record<string, unknown>) => Number(row.examYear) * 100 + (yearOrder[String(row.academicYear)] || 0) * 3 + (row.semester === "Odd" ? 0 : row.semester === "Even" ? 1 : 2);

export async function resultPublicationData(prisma: Db, selection: Selection & { semester: string }, examType: "Regular" | "Backlog", currentArchives: Array<Record<string, unknown>>) {
  const section = examType === "Backlog" ? "result-sheet-backlog" : "result-sheet";
  const [regularResults, backlogResults, regularMarks, backlogMarks, prepared, syllabuses] = await Promise.all([data(prisma, "result-sheet"), data(prisma, "result-sheet-backlog"), data(prisma, "marks-sheet"), data(prisma, "marks-sheet-backlog"), data(prisma, examType === "Backlog" ? "prepare-result-backlog" : "prepare-result"), data(prisma, "syllabuses")]);
  const current = currentArchives.find(row => row.examYear === selection.examYear && row.academicYear === selection.academicYear && (examType === "Backlog" || row.semester === selection.semester)) as SemesterArchive | undefined;
  if (!current) throw Error("Approved marksheet archive could not be built");
  const currentRank = rank({ ...selection, semester: examType === "Backlog" ? "" : selection.semester });
  const histories = [...regularResults, ...backlogResults], marks = [...regularMarks, ...backlogMarks, current as unknown as Record<string, unknown>];
  const allCourses = syllabuses.flatMap(segment => Array.isArray(segment.courses) ? segment.courses as Array<Record<string, unknown>> : []);
  const attemptedCodes = examType === "Backlog" ? prepared.filter(row => row.examYear === selection.examYear && row.academicYear === selection.academicYear).map(row => String(row.courseCode || allCourses.find(course => course.id === row.courseId)?.code || "")).filter(Boolean) : allCourses.filter(course => course.year === selection.academicYear && course.semester === selection.semester).map(course => String(course.code || "")).filter(Boolean);
  const sameStudent = (left: { studentId: string; rollNo?: string }, right: { studentId?: unknown; rollNo?: unknown }) => left.studentId === right.studentId || Boolean(left.rollNo && right.rollNo) && norm(left.rollNo) === norm(right.rollNo);
  const students = current.students.map(student => {
    const latestResult = histories.filter(row => rank(row) < currentRank).sort((a, b) => rank(b) - rank(a)).flatMap(row => Array.isArray(row.students) ? (row.students as Array<Record<string, unknown>>).filter(candidate => sameStudent(student, candidate)) : []).at(0);
    const priorMarks = marks.filter(row => rank(row) < currentRank).flatMap(row => Array.isArray(row.students) ? (row.students as Array<Record<string, unknown>>).filter(candidate => sameStudent(student, candidate)) : []);
    const archivedCredit = priorMarks.reduce((sum, row) => sum + Number(row.earnedCredit || 0), 0), archivedGp = priorMarks.reduce((sum, row) => sum + Number(row.gradePoints || 0), 0);
    const previousCredit = Math.max(Number(latestResult?.totalEarnedCredit || 0), archivedCredit), previousGp = Math.max(Number(latestResult?.totalGradePoints || 0), archivedGp);
    const failed = new Map<string, string>(((latestResult?.failedSubjects as string[] | undefined) || priorMarks.flatMap(row => row.failedSubjects as string[] || [])).map(code => [norm(code), code])), register = new Map<string, string>(((latestResult?.registerAgain as string[] | undefined) || priorMarks.flatMap(row => row.registerAgain as string[] || [])).map(code => [norm(code), code]));
    attemptedCodes.forEach(code => { failed.delete(norm(code)); register.delete(norm(code)); }); student.failedSubjects.forEach(code => { failed.set(norm(code), code); register.delete(norm(code)); }); student.registerAgain.forEach(code => { register.set(norm(code), code); failed.delete(norm(code)); });
    const totalEarnedCredit = Number((previousCredit + Number(student.earnedCredit || 0)).toFixed(3)), totalGradePoints = Number((previousGp + Number(student.gradePoints || 0)).toFixed(3));
    return { studentId: student.studentId, rollNo: student.rollNo || "", failedSubjects: [...failed.values()], registerAgain: [...register.values()], totalEarnedCredit, totalGradePoints, cgpa: (Math.round((((totalEarnedCredit ? totalGradePoints / totalEarnedCredit : 0) + Number.EPSILON) * 100)) / 100).toFixed(2) };
  });
  const record = { ...selection, semester: examType === "Backlog" ? "" : selection.semester, series: String(Number(selection.examYear) - (yearOrder[selection.academicYear] || 1)), students, updatedAt: new Date().toISOString() }, existing = examType === "Backlog" ? backlogResults : regularResults;
  return { section, data: [...existing.filter(row => !(row.examYear === selection.examYear && row.academicYear === selection.academicYear && (examType === "Backlog" || row.semester === selection.semester))), record] };
}
