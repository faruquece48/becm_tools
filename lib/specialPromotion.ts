import type { OldStudentRecord, SpecialPromotion } from "./storage/studentDirectory";
type Input = Pick<SpecialPromotion, "id" | "examYear" | "academicYear" | "semester" | "examType" | "gradePoints"> & { courseIds: string[] };
export function applySpecialPromotion(student: OldStudentRecord, input: Input, courses: Array<{ id: string; code: string; credit: string | number }>): OldStudentRecord {
  const history = student.specialPromotions || [];
  if (history.some(item => item.id === input.id || item.examYear === input.examYear && item.academicYear === input.academicYear && item.examType === input.examType && item.semester === input.semester)) throw Error("A special promotion already exists for this examination.");
  if (!input.courseIds.length || new Set(input.courseIds).size !== input.courseIds.length) throw Error("Select unique cleared subjects.");
  const cleared = input.courseIds.map(id => {
    const course = courses.find(item => item.id === id), outstanding = student.outstandingCourses.find(item => item.courseId === id);
    if (!course || !outstanding) throw Error("A selected subject is no longer outstanding. Refresh the student.");
    if (input.examType === "Backlog" && outstanding.status === "need-register") throw Error("Need-to-register subjects cannot be cleared through a backlog examination.");
    const credit = Number(course.credit);
    if (!Number.isFinite(credit) || credit <= 0) throw Error("Invalid syllabus credit for a selected subject.");
    return { courseId: id, code: course.code, credit, before: outstanding.status };
  });
  const earnedCredit = cleared.reduce((sum, item) => sum + item.credit, 0);
  if (!Number.isFinite(input.gradePoints) || input.gradePoints < earnedCredit * 2 - .001 || input.gradePoints > earnedCredit * 4 + .001) throw Error(`Grade points for ${earnedCredit} cleared credits must be between ${earnedCredit * 2} and ${earnedCredit * 4}.`);
  const entry: SpecialPromotion = { ...input, courses: cleared, earnedCredit, recordedAt: new Date().toISOString() };
  return { ...student, earnedCredit: Number((student.earnedCredit + earnedCredit).toFixed(3)), gradePoints: Number((student.gradePoints + input.gradePoints).toFixed(3)), outstandingCourses: student.outstandingCourses.filter(item => !input.courseIds.includes(item.courseId)), specialPromotions: [...history, entry], updatedAt: entry.recordedAt };
}
