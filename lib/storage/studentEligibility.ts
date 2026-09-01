export type EligibilityStudent = { studentId: string; eligible: boolean };
export type CourseEligibility = { examYear: string; academicYear: string; semester: string; courseId: string; courseCode: string; courseTitle: string; students: EligibilityStudent[]; updatedAt: string };
export const academicYearNumber: Record<string,number> = {"1st":1,"2nd":2,"3rd":3,"4th":4};
export const cohortSeries = (examYear:string,academicYear:string) => String(Number(examYear)-(academicYearNumber[academicYear]||1));

type ExamSelection = { examYear: string; academicYear: string; semester: string };

export function examIneligibleStudentIds(eligibility: CourseEligibility[], courseIds: string[], selection: ExamSelection) {
  if (!courseIds.length) return new Set<string>();
  const records = courseIds.map((courseId) => eligibility.find((record) => record.examYear === selection.examYear && record.academicYear === selection.academicYear && record.semester === selection.semester && record.courseId === courseId));
  const studentIds = new Set(records.flatMap((record) => record?.students.map((student) => student.studentId) || []));
  return new Set([...studentIds].filter((studentId) => records.every((record) => record?.students.find((student) => student.studentId === studentId)?.eligible === false)));
}
