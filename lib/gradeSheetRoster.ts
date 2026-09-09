type Selection = { examType: "Regular" | "Backlog"; examYear: string; academicYear: string; semester: string };
type Student = { studentId: string; rollNo?: string };
type Exam = { examYear: string; academicYear: string; semester: string };
type Archive = Exam & { students: Student[] };

// Older generated sheets may have saved results or course marks without an archive.
export function gradeSheetRoster(selection: Selection, archives: Archive[], results: Archive[], prepared: Archive[], backlog: (Exam & Student)[]): Student[] {
  const matches = (exam: Exam) => exam.examYear === selection.examYear && exam.academicYear === selection.academicYear && (selection.examType === "Backlog" || exam.semester === selection.semester);
  const archived = archives.filter(matches).flatMap(exam => exam.students);
  if (archived.length) return archived;
  const savedResults = results.filter(matches).flatMap(exam => exam.students);
  if (savedResults.length) return savedResults;
  return selection.examType === "Regular" ? prepared.filter(matches).flatMap(exam => exam.students) : backlog.filter(matches);
}
