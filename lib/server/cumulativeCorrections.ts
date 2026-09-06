type Exam = { examYear: string; academicYear: string; semester: string };
type SemesterStudent = { studentId: string; rollNo?: string; earnedCredit: number; gradePoints: number };
export type SemesterArchive = Exam & { students: SemesterStudent[] };
type ResultStudent = { studentId: string; rollNo?: string; totalEarnedCredit?: number; totalGradePoints?: number; cgpa?: string };
export type CumulativeArchive = Exam & { students: ResultStudent[]; updatedAt?: string };
type Identity = { id: string; rollNo: string };
const normalize = (value?: string) => (value || "").replace(/\s/g, "").toLowerCase();
const rank = (row: Exam) => Number(row.examYear) * 100 + ({ "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 }[row.academicYear] || 0) * 3 + (row.semester === "Odd" ? 0 : row.semester === "Even" ? 1 : 2);

// Apply the semester difference to existing results, retaining historical and
// backlog contributions already included in those results. Never add the whole
// semester a second time when a marksheet is regenerated.
export function propagateSemesterCorrections(
  before: SemesterArchive[], after: SemesterArchive[], results: CumulativeArchive[],
  identities: Identity[], backlog = false, backlogResults = false,
): CumulativeArchive[] {
  const rolls = new Map(identities.map(row => [row.id, normalize(row.rollNo)]));
  for (const archive of [...before, ...after]) for (const row of archive.students) if (row.rollNo) rolls.set(row.studentId, normalize(row.rollNo));
  const identity = (row: { studentId: string; rollNo?: string }) => normalize(row.rollNo) || rolls.get(row.studentId) || row.studentId;
  function index(archives: SemesterArchive[]) {
    const values = new Map<string, { rank: number; identity: string; credit: number; gp: number }>();
    for (const archive of archives) for (const student of archive.students) {
      const eventRank = rank(backlog ? { ...archive, semester: "" } : archive), id = identity(student);
      const value = { rank: eventRank, identity: id, credit: Number(student.earnedCredit), gp: Number(student.gradePoints) };
      if (!Number.isFinite(value.credit) || !Number.isFinite(value.gp)) throw Error("Invalid semester totals");
      const key = `${eventRank}|${id}`, existing = values.get(key);
      if (existing && (existing.credit !== value.credit || existing.gp !== value.gp)) throw Error("Conflicting duplicate semester totals");
      values.set(key, value);
    }
    return values;
  }
  const previous = index(before), current = index(after);
  const deltas = [...current].flatMap(([key, value]) => {
    const old = previous.get(key);
    if (!old || (old.credit === value.credit && old.gp === value.gp)) return [];
    return [{ ...value, credit: value.credit - old.credit, gp: value.gp - old.gp }];
  });
  return results.map(result => {
    const eventRank = rank(backlogResults ? { ...result, semester: "" } : result);
    let changed = false;
    const students = result.students.map(student => {
      const changes = deltas.filter(delta => delta.identity === identity(student) && delta.rank <= eventRank);
      if (!changes.length) return student;
      const credit = Number(student.totalEarnedCredit) + changes.reduce((sum, change) => sum + change.credit, 0);
      const gp = Number(student.totalGradePoints) + changes.reduce((sum, change) => sum + change.gp, 0);
      if (!Number.isFinite(credit) || !Number.isFinite(gp) || credit < 0 || gp < 0 || gp > credit * 4) throw Error("Invalid corrected cumulative totals");
      changed = true;
      return { ...student, totalEarnedCredit: Number(credit.toFixed(3)), totalGradePoints: Number(gp.toFixed(3)), cgpa: (Math.round(((credit ? gp / credit : 0) + Number.EPSILON) * 100) / 100).toFixed(2) };
    });
    return changed ? { ...result, students, updatedAt: new Date().toISOString() } : result;
  });
}
