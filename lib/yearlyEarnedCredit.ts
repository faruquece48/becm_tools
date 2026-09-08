type Exam = { examYear: string; academicYear: string; semester: string; examType?: string };
type Identity = { id: string; rollNo: string };
type Archive = Exam & { students: Array<{ studentId: string; rollNo?: string; earnedCredit: number }> };
const normalize = (value: string) => value.replace(/\s/g, "").toLowerCase();
const order = (exam: Exam) => exam.examType === "Backlog" || exam.semester === "Backlog" || !exam.semester ? 4 : exam.semester === "Odd" ? 1 : exam.semester === "Even" ? 2 : 3;
type Result = Exam & { students: Array<{ studentId: string; rollNo?: string; totalEarnedCredit?: number }> };
export function priorYearlyCredit(student: Identity, exam: Exam, regular: Archive[], backlog: Archive[] = [], results: Result[] = []) {
  const credits = new Map<string, number>();
  for (const archive of [...regular.map(item => ({ ...item, examType: "Regular" })), ...backlog.map(item => ({ ...item, examType: "Backlog" }))]) {
    if (archive.semester === "Short Semester") continue;
    if (archive.examYear !== exam.examYear || archive.academicYear !== exam.academicYear || order(archive) >= order(exam)) continue;
    const row = archive.students.find(item => item.studentId === student.id || Boolean(item.rollNo) && normalize(item.rollNo!) === normalize(student.rollNo));
    if (row) credits.set(`${archive.examType}|${archive.semester}`, Number(row.earnedCredit) || 0);
  }
  const rank = (value: Exam) => Number(value.examYear) * 100 + (Number.parseInt(value.academicYear) || 0) * 10 + order(value);
  const start = Number(exam.examYear) * 100 + (Number.parseInt(exam.academicYear) || 0) * 10;
  const snapshots = results.flatMap(result => {
    const row = result.students.find(item => item.studentId === student.id || Boolean(item.rollNo) && normalize(item.rollNo!) === normalize(student.rollNo));
    return row?.totalEarnedCredit !== undefined ? [{ rank: rank(result), credit: row.totalEarnedCredit, semester: result.semester }] : [];
  }).sort((a,b) => b.rank-a.rank);
  const latest = snapshots.find(item => item.rank > start && item.rank < rank(exam) && item.semester !== "Short Semester");
  const baseline = snapshots.find(item => item.rank < start);
  // A missing baseline is not evidence that this student's earlier credits were zero.
  const canInferBaseline = Boolean(baseline) || exam.academicYear === "1st";
  return Math.max([...credits.values()].reduce((sum, credit) => sum + credit, 0), latest && canInferBaseline ? Math.max(0, latest.credit - (baseline?.credit || 0)) : 0);
}

type CreditHistory = Exam & { applied?: boolean; students: Array<{ studentId: string; credit?: number }> };
export function specialPriorYearlyCredit(student: Identity & { specialPromotions?: Array<Exam & { earnedCredit: number }> }, exam: Exam, history: CreditHistory[]) {
  const entries = new Map<string, number>();
  for (const entry of history) {
    if (!entry.applied || entry.examYear !== exam.examYear || entry.academicYear !== exam.academicYear || entry.semester === "Short Semester" || order(entry) >= order(exam)) continue;
    const change = entry.students.find(item => item.studentId === student.id);
    if (change) entries.set(`${entry.examType}|${entry.semester}`, Number(change.credit) || 0);
  }
  for (const entry of student.specialPromotions || []) {
    if (entry.examYear === exam.examYear && entry.academicYear === exam.academicYear && entry.semester !== "Short Semester" && order(entry) < order(exam)) entries.set(`${entry.examType}|${entry.semester}`, entry.earnedCredit);
  }
  return [...entries.values()].reduce((sum, value) => sum + value, 0);
}
