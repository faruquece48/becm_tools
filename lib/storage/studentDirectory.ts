export type BacklogEligibility = { examYear: string; academicYear: string; semester: "Odd" | "Even"; createdAt: string };
export type PromotionSource = { examYear: string; academicYear: string; semester: "Even"; promotedAt: string };

export type StudentDirectoryRecord = {
  id: string;
  department: string;
  series: string;
  year: string;
  semester: string;
  section: string;
  name: string;
  rollNo: string;
  registrationNo: string;
  fatherName: string;
  motherName: string;
  localGuardian: string;
  gender: string;
  birthDate: string;
  backlogEligibility?: BacklogEligibility[];
  promotionSource?: PromotionSource;
};

export type OldStudentCourseStatus = "failed" | "need-register";
export type OldStudentExamType = "Regular" | "Backlog";
export type OldStudentCourse = { courseId: string; status: OldStudentCourseStatus };
export type OldStudentPromotion = {
  id: string;
  examYear: string;
  academicYear: "1st" | "2nd" | "3rd" | "4th";
  semester: "Odd" | "Even" | "Short Semester" | "Backlog";
  examType: OldStudentExamType;
  courseIds: string[];
  promotedAt: string;
};
export type OldStudentRecord = Omit<StudentDirectoryRecord, "year" | "semester" | "backlogEligibility" | "promotionSource"> & {
  earnedCredit: number;
  gradePoints: number;
  outstandingCourses: OldStudentCourse[];
  promotions: OldStudentPromotion[];
  createdAt: string;
  updatedAt: string;
};
export function oldStudentPromotionForExam(student: OldStudentRecord, examYear: string, academicYear: string, semester: string, examType?: OldStudentExamType) {
  return student.promotions.find((promotion) => promotion.examYear === examYear && promotion.academicYear === academicYear && promotion.semester === semester && (!examType || promotion.examType === examType));
}
export const departmentName = "Building Engineering & Construction Management";
export const academicYears = ["1st", "2nd", "3rd", "4th"];
export const semesters = ["Odd", "Even", "Short Semester"];
