export type ExpelledStudentRecord = {
  studentId: string;
  name: string;
  rollNo: string;
  registrationNo: string;
  series: string;
  resumeExamYear: string;
  resumeAcademicYear: "1st" | "2nd" | "3rd" | "4th";
  resumeSemester: "Odd" | "Even" | "Short Semester";
  reason: string;
  createdAt: string;
  updatedAt: string;
};

const academicYearOrder = ["1st", "2nd", "3rd", "4th"];
const semesterOrder = ["Odd", "Even", "Short Semester"];

export function isStudentSuspendedForExam(record: ExpelledStudentRecord, examYear: string, academicYear: string, semester: string) {
  const current = [Number(examYear), academicYearOrder.indexOf(academicYear), semesterOrder.indexOf(semester)];
  const resumes = [Number(record.resumeExamYear), academicYearOrder.indexOf(record.resumeAcademicYear), semesterOrder.indexOf(record.resumeSemester)];
  for (let index = 0; index < current.length; index += 1) {
    if (current[index] !== resumes[index]) return current[index] < resumes[index];
  }
  return false;
}
export function isExpelledStudentIdentity(record: ExpelledStudentRecord, student: { id: string; rollNo: string; registrationNo: string }) {
  const normalize = (value: string) => value.trim().toLowerCase();
  return record.studentId === student.id ||
    Boolean(normalize(record.rollNo) && normalize(record.rollNo) === normalize(student.rollNo)) ||
    false;
}