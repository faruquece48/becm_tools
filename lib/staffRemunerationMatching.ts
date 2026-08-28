import type { ExaminationBillData, SessionalCourse } from "@/app/bills/create/components/types";
import type { StaffRemunerationCourse, StaffRemunerationData } from "@/lib/storage/staffRemuneration";

export interface StaffSessionalEntry { staffMember: string }
export interface StaffSessionalGroup {
  courseCode: string;
  courseTitle: string;
  students: number | string;
  entries: StaffSessionalEntry[];
}

const semesterSectionIds: Record<string, string> = {
  "1st Year|Odd": "first-year-odd",
  "1st Year|Even": "first-year-even",
  "2nd Year|Odd": "second-year-odd",
  "2nd Year|Even": "second-year-even",
  "3rd Year|Odd": "third-year-odd",
  "3rd Year|Even": "third-year-even",
  "4th Year|Odd": "fourth-year-odd",
  "4th Year|Even": "fourth-year-even",
};

const normalizeCourseCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
const baseCourseCode = (value: string) => normalizeCourseCode(value).replace(/NONOBE|OBE$/g, "");

function sectionIdForBill(bill: ExaminationBillData): string | null {
  if (bill.billInfo.examType === "short") return bill.billInfo.year === "4th Year" ? "fourth-year-short" : null;
  if (bill.billInfo.examType !== "semester") return null;
  return semesterSectionIds[`${bill.billInfo.year}|${bill.billInfo.semester}`] ?? null;
}

function hasSessionalDuty(course: SessionalCourse): boolean {
  return course.duties.sessional || course.additionalTeachers.some((teacher) => teacher.duties.sessional);
}

function findStaffCourse(courses: StaffRemunerationCourse[], code: string): StaffRemunerationCourse | undefined {
  const normalized = normalizeCourseCode(code);
  const exact = courses.find((course) => normalizeCourseCode(course.code) === normalized);
  if (exact) return exact;
  const base = baseCourseCode(code);
  const candidates = courses.filter((course) => baseCourseCode(course.code) === base);
  return candidates.length === 1 ? candidates[0] : undefined;
}

function fullStudentCount(course: SessionalCourse, bill: ExaminationBillData): number | string {
  const additionalCount = course.additionalTeachers.find((teacher) => teacher.duties.sessional && teacher.students.sessional !== "")?.students.sessional;
  return course.students.sessional || additionalCount || bill.billInfo.totalStudents || "-";
}

export function staffSessionalGroups(bill: ExaminationBillData): StaffSessionalGroup[] {
  const sectionId = sectionIdForBill(bill);
  const section = bill.staffRemunerationData?.semesters.find((semester) => semester.id === sectionId);
  if (!section) return [];
  return bill.sessionalDuties
    .filter((course) => (bill.sessionalEvaluationSystem === "mixed" || (course.syllabus ?? "obe") === "obe") && hasSessionalDuty(course))
    .map((course) => ({ course, staffCourse: findStaffCourse(section.courses, course.courseCode) }))
    .filter((item): item is { course: SessionalCourse; staffCourse: StaffRemunerationCourse } => Boolean(item.staffCourse?.staff.some((member) => member.name.trim())))
    .map(({ course, staffCourse }) => ({
      courseCode: staffCourse.code || course.courseCode,
      courseTitle: staffCourse.title || course.courseTitle,
      students: fullStudentCount(course, bill),
      entries: staffCourse.staff.filter((member) => member.name.trim()).map((member) => ({ staffMember: member.name })),
    }));
}

export function practicalSurveyingStaffGroups(bill: ExaminationBillData): StaffSessionalGroup[] {
  if (bill.billInfo.examType !== "semester" || bill.billInfo.year !== "1st Year" || bill.billInfo.semester !== "Even" || !bill.practicalSurveyingTeachers.some((teacher) => teacher.name.trim())) return [];
  const section = bill.staffRemunerationData?.semesters.find((semester) => semester.id === "practical-surveying-ce-1226");
  const course = section?.courses.find((item) => normalizeCourseCode(item.code) === "CE1226");
  if (!course?.staff.some((member) => member.name.trim())) return [];
  return [{
    courseCode: course.code,
    courseTitle: course.title,
    students: bill.practicalSurveyingStudentCount || bill.billInfo.totalStudents || "-",
    entries: course.staff.filter((member) => member.name.trim()).map((member) => ({ staffMember: member.name })),
  }];
}

export function withStaffRemunerationData(bill: ExaminationBillData, data: StaffRemunerationData | null): ExaminationBillData {
  return data ? { ...bill, staffRemunerationData: data } : bill;
}

export function mergeStaffSectionOrder(order: string[] | undefined, defaults: string[]): string[] {
  const current = order?.length ? [...order] : [...defaults];
  for (const key of defaults) {
    if (current.includes(key)) continue;
    const defaultIndex = defaults.indexOf(key);
    const previous = [...defaults.slice(0, defaultIndex)].reverse().find((candidate) => current.includes(candidate));
    const insertAt = previous ? current.indexOf(previous) + 1 : current.length;
    current.splice(insertAt, 0, key);
  }
  return current;
}