import type { SyllabusCourse, SyllabusSegment } from "./storage/syllabuses";
import type { OldStudentRecord, StudentDirectoryRecord } from "./storage/studentDirectory";
import { orderBacklogCourses } from "./backlogCourseOrder";
import { graduationCreditForStudent } from "./resultFormatPolicy";
import { backlogGrade } from "./backlogGrading";
import { compareResultStudentGroups } from "./resultStudentOrder";
import { priorYearlyCredit } from "./yearlyEarnedCredit";

export type FourthYearExamType = "Backlog" | "Short Semester";
export type FourthYearCourseResult = { values: string[]; grade: string };
export type FourthYearRow = {
  id: string; roll: string; name: string; fatherName: string; gender: string; registration: string; session: string; nonObe: boolean; degreeCredit: number;
  results: Record<string, FourthYearCourseResult>; earned: number; gp: number; gpa: number;
  yearlyCredit: number; previousCredit: number; previousGp: number; totalCredit: number; totalGp: number; cgpa: number;
  failed: string[]; register: string[];
};
export type FourthYearSheet = { examYear: string; examType: FourthYearExamType; courses: SyllabusCourse[]; rows: FourthYearRow[] };
type Mark = { studentId: string; rollNo?: string; name?: string; studentName?: string; registrationNo?: string; courseId?: string; courseCode?: string; courseTitle?: string; examYear: string; academicYear: string; semester: string; partA?: string; partB?: string; classTestAttendance?: string; sessional?: string; internal?: string; external?: string; thesisViva?: string; marks?: string; result?: string; present?: boolean; withheld?: boolean };
type Prepared = Mark & { students: Mark[] };
type Registration = { studentId: string; rollNo: string; studentName?: string; registrationNo?: string; examYear: string; academicYear?: string; courses: { courseId?: string; courseCode: string; courseTitle?: string; semester: string }[] };
type ArchiveStudent = { studentId: string; rollNo?: string; earnedCredit?: number; gradePoints?: number; totalEarnedCredit?: number; totalGradePoints?: number; failedSubjects?: string[]; registerAgain?: string[] };
type NonObeLedger = { examYear: string; academicYear: string; semester: string; examType: "Regular" | "Backlog"; applied?: boolean; students: Array<{ studentId: string; credit: number; quality: number }> };
type Archive = { examYear: string; academicYear: string; semester: string; students: ArchiveStudent[] };
const norm = (value = "") => value.replace(/\s/g, "").toLowerCase();
const num = (value: unknown) => Number(value) || 0;
const points: Record<string, number> = { "B+": 3.25, B: 3, "B-": 2.75, "C+": 2.5, C: 2.25, D: 2 };
const rank = (exam: { examYear: string; academicYear: string; semester: string }, backlog = false) => num(exam.examYear) * 100 + num(exam.academicYear.slice(0, 1)) * 4 + (exam.semester === "Short Semester" ? 3 : backlog || !exam.semester || exam.semester === "Backlog" ? 2 : exam.semester === "Even" ? 1 : 0);

export function buildFourthYearSheet(data: Record<string, unknown>, registrations: Registration[], examYear: string, examType: FourthYearExamType): FourthYearSheet {
  const list = <T,>(section: string) => (Array.isArray(data[section]) ? data[section] : []) as T[];
  const syllabuses = list<SyllabusSegment>("syllabuses"), allCourses = syllabuses.flatMap(segment => segment.courses);
  const directory = list<StudentDirectoryRecord>("student-directory"), special = list<OldStudentRecord>("old-student-directory");
  const isShort = examType === "Short Semester", sameExam = (item: { examYear: string; academicYear?: string }) => item.examYear === examYear && (!item.academicYear || item.academicYear === "4th");
  const promotion = (student: OldStudentRecord) => student.promotions.find(item => sameExam(item) && item.examType === (isShort ? "Regular" : "Backlog") && item.semester === (isShort ? "Short Semester" : "Backlog"));
  const prepared = list<Prepared>("prepare-result");
  const marks: Mark[] = isShort ? prepared.filter(item => sameExam(item) && item.semester === "Short Semester").flatMap(item => item.students.map(student => ({ ...student, examYear, academicYear: "4th", semester: "Short Semester", courseId: item.courseId, courseCode: item.courseCode, courseTitle: item.courseTitle }))) : list<Mark>("prepare-result-backlog").filter(sameExam);
  const selectedRegistrations = registrations.filter(sameExam);
  type Person = { id: string; rollNo: string; name: string; registrationNo: string; series: string; nonObe: boolean; old?: OldStudentRecord; directory?: StudentDirectoryRecord };
  const people = new Map<string, Person>();
  const include = (id: string, rollNo = "", name = "", registrationNo = "") => {
    const old = special.find(student => student.id === id || rollNo && norm(student.rollNo) === norm(rollNo));
    const current = directory.find(student => student.id === id) || directory.find(student => rollNo && norm(student.rollNo) === norm(rollNo));
    const student = old && promotion(old) ? old : current || old;
    const roll = student?.rollNo || rollNo;
    if (!roll) return;
    people.set(norm(roll), { id: student?.id || id, rollNo: roll, name: student?.name || name, registrationNo: student?.registrationNo || registrationNo, series: student?.series || `20${roll.slice(0, 2)}`, nonObe: Boolean(old && num(old.series) < 2020), old, directory: current });
  };
  selectedRegistrations.forEach(item => include(item.studentId, item.rollNo, item.studentName, item.registrationNo));
  marks.forEach(item => include(item.studentId, item.rollNo, item.name || item.studentName, item.registrationNo));
  special.filter(student => promotion(student)?.courseIds.length).forEach(student => include(student.id, student.rollNo));
  const courseMap = new Map<string, SyllabusCourse>(), rowData: FourthYearRow[] = [];
  const regularArchives = list<Archive>("marks-sheet"), backlogArchives = list<Archive>("marks-sheet-backlog"), regularResults = list<Archive>("result-sheet"), backlogResults = list<Archive>("result-sheet-backlog"), nonObeHistory = list<NonObeLedger>("old-student-result-updates");
  const currentRank = rank({ examYear, academicYear: "4th", semester: isShort ? "Short Semester" : "Backlog" });
  for (const person of people.values()) {
    const sameStudent = (item: { studentId: string; rollNo?: string }) => item.studentId === person.id || item.studentId === person.directory?.id || Boolean(item.rollNo && norm(item.rollNo) === norm(person.rollNo));
    const promotedIds = person.old ? promotion(person.old)?.courseIds || [] : [];
    const placement = person.directory?.obeBatchPlacements?.filter(item => item.academicYear === "4th" && num(item.effectiveExamYear) <= num(examYear)).sort((a, b) => num(b.effectiveExamYear) - num(a.effectiveExamYear))[0];
    const series = placement?.series || person.series;
    const preferred = syllabuses.filter(segment => num(series) >= num(segment.fromSeries) && num(series) <= num(segment.toSeries)).sort((a, b) => (num(a.toSeries) - num(a.fromSeries)) - (num(b.toSeries) - num(b.fromSeries))).flatMap(segment => segment.courses);
    const resolve = (item: { courseId?: string; courseCode?: string; courseTitle?: string; semester: string }) => {
      const exact = allCourses.find(course => course.id === item.courseId);
      if (exact) return exact;
      const matches = (course: SyllabusCourse) => norm(course.code) === norm(item.courseCode) && (item.semester === "Short Semester" || course.semester === item.semester);
      return allCourses.find(course => promotedIds.includes(course.id) && matches(course)) || preferred.find(matches) || allCourses.find(matches);
    };
    const studentMarks = marks.filter(sameStudent), registered = new Map<string, SyllabusCourse>();
    allCourses.filter(course => promotedIds.includes(course.id)).forEach(course => registered.set(course.id, course));
    selectedRegistrations.filter(sameStudent).flatMap(item => item.courses).forEach(item => { const course = resolve(item); if (course) registered.set(course.id, course); });
    studentMarks.forEach(item => { const course = resolve(item); if (!course) throw new Error(`Syllabus course not found: ${item.courseCode || item.courseId}`); registered.set(course.id, course); });
    const results: Record<string, FourthYearCourseResult> = {};
    let earned = 0, gp = 0;
    const failed: string[] = [], register: string[] = [];
    for (const course of registered.values()) {
      if (!isShort && course.type !== "Theory") continue;
      courseMap.set(course.id, course);
      const mark = studentMarks.find(item => resolve(item)?.id === course.id);
      const eligible = !list<{ examYear: string; academicYear: string; semester: string; courseId: string; students: { studentId: string; eligible: boolean }[] }>("student-eligibility").some(item => isShort && sameExam(item) && item.semester === "Short Semester" && item.courseId === course.id && item.students.some(student => sameStudent(student) && !student.eligible));
      const viva = list<{ examYear: string; academicYear: string; semester: string; students: { id: string; present?: boolean; marks: string }[] }>("add-viva-marks").find(item => sameExam(item) && item.semester === "Short Semester")?.students.find(item => item.id === person.id);
      const vivaMark = viva?.present ? viva.marks : "0";
      const components = course.type === "Theory" ? [mark?.partA || "", mark?.partB || "", mark?.classTestAttendance || ""] : course.type === "Thesis" ? [mark?.internal || "", mark?.external || "", mark?.thesisViva || ""] : [mark?.sessional || "", vivaMark];
      const total = !isShort && mark ? num(mark.marks) : Math.round(components.reduce((sum, value) => sum + num(value), 0));
      const grade = !eligible ? "-" : !mark ? "" : mark.withheld ? "W" : mark.present === false || mark.result === "Fail" || course.type === "Theory" && num(mark.partA) + num(mark.partB) < 15 || course.type === "Sessional" && num(vivaMark) <= 0 ? "F" : backlogGrade(total);
      results[course.id] = { values: !eligible ? components.map(() => "-").concat("-", "-") : components.concat(mark ? String(total) : "", grade), grade };
      if (points[grade]) { earned += num(course.credit); gp += num(course.credit) * points[grade]; }
      if (grade === "F" || grade === "W") failed.push(course.code);
      if (!eligible) register.push(course.code);
    }
    const histories = [...regularResults.map(item => ({ item, backlog: false })), ...backlogResults.map(item => ({ item, backlog: true }))].filter(({ item, backlog }) => rank(item, backlog) < currentRank).sort((a, b) => rank(b.item, b.backlog) - rank(a.item, a.backlog));
    const latest = histories.map(({ item }) => item.students.find(sameStudent)).find(Boolean);
    const prior = [...regularArchives.map(item => ({ item, backlog: false })), ...backlogArchives.map(item => ({ item, backlog: true }))].filter(({ item, backlog }) => rank(item, backlog) < currentRank).map(({ item }) => item.students.find(sameStudent)).filter((item): item is ArchiveStudent => Boolean(item));
    const archivedCredit = prior.reduce((sum, item) => sum + num(item.earnedCredit), 0), archivedGp = prior.reduce((sum, item) => sum + num(item.gradePoints), 0);
    const currentAndLater = nonObeHistory.filter(entry => entry.applied && rank(entry, entry.examType === "Backlog") >= currentRank).flatMap(entry => entry.students).filter(sameStudent);
    const oldCredit = person.old ? Math.max(0, num(person.old.earnedCredit) - currentAndLater.reduce((sum, item) => sum + num(item.credit), 0)) : 0;
    const oldGp = person.old ? Math.max(0, num(person.old.gradePoints) - currentAndLater.reduce((sum, item) => sum + num(item.quality), 0)) : 0;
    const publishedCredit = num(latest?.totalEarnedCredit), useOld = Boolean(person.old) && oldCredit >= archivedCredit && oldCredit >= publishedCredit;
    const usePublished = Boolean(latest) && publishedCredit >= archivedCredit;
    const previousCredit = useOld ? oldCredit : usePublished ? publishedCredit : archivedCredit;
    const previousGp = useOld ? oldGp : usePublished ? num(latest?.totalGradePoints) : archivedGp;
    const historicalFailed = useOld ? person.old!.outstandingCourses.filter(item => item.status === "failed").map(item => allCourses.find(course => course.id === item.courseId)?.code || item.courseId) : latest?.failedSubjects || [];
    const historicalRegister = useOld ? person.old!.outstandingCourses.filter(item => item.status === "need-register").map(item => allCourses.find(course => course.id === item.courseId)?.code || item.courseId) : latest?.registerAgain || [];
    const yearlyHistory = new Map<string, number>();
    const yearlyKey = (entry: { examType: string; academicYear: string; semester: string }) => [entry.examType, entry.academicYear, entry.examType === "Backlog" ? "Backlog" : entry.semester].join("|");
    [...regularArchives.map(item => ({ item, examType: "Regular" })), ...backlogArchives.map(item => ({ item, examType: "Backlog" }))]
      .filter(({ item, examType }) => item.examYear === examYear && rank(item, examType === "Backlog") < currentRank)
      .forEach(({ item, examType }) => { const archived = item.students.find(sameStudent); if (archived) yearlyHistory.set(yearlyKey({ examType, academicYear: item.academicYear, semester: item.semester }), num(archived.earnedCredit)); });
    nonObeHistory.filter(entry => entry.applied && entry.examYear === examYear && rank(entry, entry.examType === "Backlog") < currentRank).forEach(entry => { const change = entry.students.find(sameStudent); if (change) yearlyHistory.set(yearlyKey(entry), num(change.credit)); });
    person.old?.specialPromotions?.filter(entry => entry.examYear === examYear && rank(entry, entry.examType === "Backlog") < currentRank).forEach(entry => yearlyHistory.set(yearlyKey(entry), num(entry.earnedCredit)));
    const currentHistoryArchive = (isShort ? regularArchives : backlogArchives).find(item => item.examYear === examYear && item.academicYear === "4th" && (isShort ? item.semester === "Short Semester" : true))?.students.find(sameStudent);
    const archivedCurrentCredit = num(currentHistoryArchive?.earnedCredit);
    const currentYearlyCredit = person.old && archivedCurrentCredit > 0 ? archivedCurrentCredit : earned;
    const passed = new Set([...registered.values()].filter(course => points[results[course.id]?.grade]).map(course => norm(course.code)));
    const totalCredit = previousCredit + earned, totalGp = previousGp + gp;
    rowData.push({ id: person.id, roll: person.rollNo, name: person.name, fatherName: person.old?.fatherName || person.directory?.fatherName || "", gender: person.old?.gender || person.directory?.gender || "", registration: person.registrationNo, session: `${person.series}-${num(person.series) + 1}`, nonObe: person.nonObe, degreeCredit: graduationCreditForStudent(person.old || person.directory || { series: person.series }), results, earned, gp, gpa: earned ? gp / earned : 0,
      yearlyCredit: currentYearlyCredit + (person.old ? [...yearlyHistory.values()].reduce((sum, credit) => sum + credit, 0) : priorYearlyCredit({ id: person.id, rollNo: person.rollNo }, { examYear, academicYear: "4th", semester: isShort ? "Short Semester" : "Backlog", examType: isShort ? "Regular" : "Backlog" }, regularArchives.map(item => ({ ...item, students: item.students.map(student => ({ ...student, earnedCredit: num(student.earnedCredit) })) })), backlogArchives.map(item => ({ ...item, students: item.students.map(student => ({ ...student, earnedCredit: num(student.earnedCredit) })) })), [...regularResults, ...backlogResults.map(item => ({ ...item, examType: "Backlog" }))])),
      previousCredit, previousGp, totalCredit, totalGp, cgpa: totalCredit ? totalGp / totalCredit : 0,
      failed: [...new Set([...historicalFailed, ...failed])].filter(code => !passed.has(norm(code))), register: [...new Set([...historicalRegister, ...register])].filter(code => !passed.has(norm(code))) });
  }
  return { examYear, examType, courses: orderBacklogCourses([...courseMap.values()], syllabuses), rows: rowData.sort((a, b) => compareResultStudentGroups(a.roll, b.roll, a.nonObe, b.nonObe, examYear, "4th")) };
}
