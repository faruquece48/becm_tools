type Exam = { examYear: string; academicYear: string; semester: string };
type Eligibility = Exam & { courseId: string; students: Array<{ studentId: string; eligible: boolean }> };
type Student = { id: string; rollNo: string };
const normalize = (value: string) => value.replace(/\s/g, "").toLowerCase();

export function isObeRoll(rollNo: string) {
  const prefix = Number(rollNo.replace(/\D/g, "").slice(0, 2));
  return prefix >= 20;
}

export function countsAsSemesterBacklogged(row: { currentFailed: string[] }) {
  return row.currentFailed.length > 0;
}

export function countsAsSemesterUncleared(row: { currentFailed: string[]; currentRegister: string[] }) {
  return row.currentFailed.length > 0 || row.currentRegister.length > 0;
}

type ExamMark = { studentId: string; rollNo?: string; present?: boolean; partA?: string; partB?: string; classTestAttendance?: string; sessional?: string; internal?: string; external?: string; thesisViva?: string };
type PreparedExam = Exam & { courseId: string; students: ExamMark[] };

export function belongsToRegularExam(student: Student & { series: string; year?: string; semester?: string; placementExamYear?: string }, _directory: Student[], courseIds: string[], _prepared: PreparedExam[], exam: Exam) {
  const year = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 }[exam.academicYear];
  if (!year || !courseIds.length) return false;
  const placementExamYear = student.placementExamYear || String(Number(student.series) + year);
  return placementExamYear === exam.examYear && student.year === exam.academicYear && student.semester === exam.semester;
}

export function fullyIneligibleForExam(student: Student, directory: Student[], courseIds: string[], records: Eligibility[], exam: Exam) {
  if (!courseIds.length) return false;
  const identities = new Set([student.id, ...directory.filter(row => normalize(row.rollNo) === normalize(student.rollNo)).map(row => row.id)]);
  return courseIds.every(courseId => {
    const statuses = records.filter(row => row.examYear === exam.examYear && row.academicYear === exam.academicYear && row.semester === exam.semester && row.courseId === courseId).flatMap(row => row.students).filter(row => identities.has(row.studentId));
    // An omitted eligibility entry means eligible in the marking screens.
    return statuses.length > 0 && statuses.every(row => row.eligible === false);
  });
}

export function backlogFailedSubjects(result?: { failedSubjects?: string[]; registerAgain?: string[] }) {
  const register = new Set((result?.registerAgain || []).map(normalize));
  return [...new Map((result?.failedSubjects || []).filter(code => !register.has(normalize(code))).map(code => [normalize(code), code])).values()];
}
