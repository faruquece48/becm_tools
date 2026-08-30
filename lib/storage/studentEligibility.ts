export type EligibilityStudent = { studentId: string; eligible: boolean };
export type CourseEligibility = { examYear: string; academicYear: string; semester: string; courseId: string; courseCode: string; courseTitle: string; students: EligibilityStudent[]; updatedAt: string };
export const academicYearNumber: Record<string,number> = {"1st":1,"2nd":2,"3rd":3,"4th":4};
export const cohortSeries = (examYear:string,academicYear:string) => String(Number(examYear)-(academicYearNumber[academicYear]||1));
