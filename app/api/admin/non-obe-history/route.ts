import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getPrisma } from "@/lib/prisma";
import type { OldStudentRecord } from "@/lib/storage/studentDirectory";
import type { SyllabusSegment } from "@/lib/storage/syllabuses";

type Store = { section: string; data: Prisma.JsonValue };
type ArchiveStudent = { studentId: string; rollNo?: string; earnedCredit: number; gradePoints: number };
type Archive = { examYear: string; academicYear: string; semester: string; students: ArchiveStudent[] };
type Publication = { examType?: string; examYear: string; academicYear: string; semester: string; published?: boolean };
type Ledger = { key: string; examYear: string; academicYear: string; semester: string; examType: string; applied: boolean; approvedAt: string; students: Array<{ studentId: string; credit: number; quality: number; courses: Array<{ courseId: string; after: string | null }> }> };
type HistorySource = "ledger" | "archive" | "special";
const sections = ["old-student-directory", "old-student-result-updates", "syllabuses", "marks-sheet", "marks-sheet-backlog", "add-viva-marks"];
const array = <T,>(rows: Store[], section: string) => { const data = rows.find((row) => row.section === section)?.data; return Array.isArray(data) ? data as T[] : []; };
const norm = (value = "") => value.replace(/\s/g, "").toLowerCase();
const historyRank = (entry: { academicYear: string; semester: string; examType: string }) => (Number.parseInt(entry.academicYear) || 0) * 4 + (entry.semester === "Short Semester" ? 3 : entry.examType === "Backlog" || entry.semester === "Backlog" ? 2 : entry.semester === "Even" ? 1 : 0);

export async function GET() {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  try {
    const rows = await prisma.$queryRaw<Store[]>(Prisma.sql`SELECT "section","data" FROM "ResultSectionStore" WHERE "section" IN (${Prisma.join(sections)})`);
    const students = array<OldStudentRecord>(rows, "old-student-directory");
    const ledger = array<Ledger>(rows, "old-student-result-updates").filter((entry) => entry.applied);
    const publications = array<Publication>(rows, "add-viva-marks");
    const courses = array<SyllabusSegment>(rows, "syllabuses").flatMap((segment) => segment.courses);
    const courseById = new Map(courses.map((course) => [course.id, course.code]));
    const records = students.map((student) => {
      const normalizedRoll = norm(student.rollNo);
      const archived = [["Regular", array<Archive>(rows, "marks-sheet")], ["Backlog", array<Archive>(rows, "marks-sheet-backlog")]] as const;
      const archiveHistory = archived.flatMap(([examType, exams]) => exams.flatMap((exam) => { const published = publications.some((item) => item.published === true && (item.examType || "Regular") === examType && item.examYear === exam.examYear && item.academicYear === exam.academicYear && (examType === "Backlog" || item.semester === exam.semester)); const result = published ? exam.students.find((item) => item.studentId === student.id || norm(item.rollNo) === normalizedRoll) : undefined; return result ? [{ id: [examType, exam.examYear, exam.academicYear, exam.semester || "Backlog"].join("|"), source: "archive" as HistorySource, examYear: exam.examYear, academicYear: exam.academicYear, semester: examType === "Backlog" ? "Backlog" : exam.semester, examType, earnedCredit: Number(result.earnedCredit || 0), gradePoints: Number(result.gradePoints || 0), clearedCourses: [] as string[], approvedAt: "" }] : []; }));
      const ledgerHistory = ledger.flatMap((entry) => { const change = entry.students.find((item) => item.studentId === student.id); return change ? [{ id: entry.key, source: "ledger" as HistorySource, examYear: entry.examYear, academicYear: entry.academicYear, semester: entry.examType === "Backlog" ? "Backlog" : entry.semester, examType: entry.examType, earnedCredit: Number(change.credit || 0), gradePoints: Number(change.quality || 0), clearedCourses: change.courses.filter((course) => course.after === null).map((course) => courseById.get(course.courseId) || course.courseId), approvedAt: entry.approvedAt }] : []; });
      const history = [...new Map([...archiveHistory, ...ledgerHistory].map((entry) => [entry.id, entry])).values()];
      const special = (student.specialPromotions || []).map((entry) => ({ id: entry.id, source: "special" as HistorySource, examYear: entry.examYear, academicYear: entry.academicYear, semester: entry.semester, examType: entry.examType, earnedCredit: entry.earnedCredit, gradePoints: entry.gradePoints, clearedCourses: entry.courses.map((course) => course.code), approvedAt: entry.recordedAt }));
      const combined = [...history, ...special], yearlyHistory = combined.map((entry) => ({ ...entry, yearlyEarnedCredit: combined.filter((candidate) => candidate.examYear === entry.examYear && historyRank(candidate) <= historyRank(entry)).reduce((sum, candidate) => sum + Number(candidate.earnedCredit || 0), 0) }));
      return { id: student.id, name: student.name, rollNo: student.rollNo, registrationNo: student.registrationNo, series: student.series, earnedCredit: student.earnedCredit, gradePoints: student.gradePoints, degreeCredit: student.degreeCredit || 161, outstandingCourses: student.outstandingCourses.map((course) => ({ code: courseById.get(course.courseId) || course.courseId, status: course.status })), history: yearlyHistory.sort((a, b) => Number(b.examYear) - Number(a.examYear) || historyRank(b) - historyRank(a)) };
    });
    return NextResponse.json({ records }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { console.error("Unable to load Non-OBE history", error); return NextResponse.json({ error: "Unable to load Non-OBE history" }, { status: 503 }); }
}
