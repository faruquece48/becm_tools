type Exam = { examYear: string; academicYear: string; semester: string; examType?: string };
type Mark = Exam & { studentId: string; rollNo?: string; courseCode: string; result: string; marks: string; present?: boolean };
const normalize = (value: string) => value.replace(/\s/g, "").toLowerCase();
const rank = (exam: Exam) => Number(exam.examYear) * 100 + Number.parseInt(exam.academicYear) * 10 + (exam.examType === "Backlog" ? 4 : exam.semester === "Odd" ? 1 : exam.semester === "Even" ? 2 : 3);
export function clearedBacklogSubjects(student: { id: string; rollNo: string }, selection: Exam, marks: Mark[]) {
  return [...new Set(marks.filter(mark =>
    (mark.studentId === student.id || Boolean(mark.rollNo) && normalize(mark.rollNo!) === normalize(student.rollNo)) &&
    rank({ ...mark, examType: "Backlog" }) < rank(selection) &&
    mark.result === "Pass" && mark.present !== false && Number(mark.marks) >= 40
  ).map(mark => normalize(mark.courseCode)))];
}
