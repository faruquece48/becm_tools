import type { StudentDirectoryRecord } from "./storage/studentDirectory";
export type PromotionAudit = { id: string; studentId: string; name: string; rollNo: string; series: string; promotedAt: string; before: StudentDirectoryRecord; after: StudentDirectoryRecord; cancelledAt?: string };
export function promotionRegistrationReason(student: StudentDirectoryRecord, sections: Array<{ section: string; data: unknown }>) {
  const same = (item: Record<string, unknown>) => item.studentId === student.id || item.id === student.id || Boolean(item.rollNo) && String(item.rollNo).trim() === student.rollNo.trim();
  for (const section of sections) {
    if (!Array.isArray(section.data)) continue;
    for (const exam of section.data as Array<Record<string, unknown>>) {
      if (exam.examYear !== student.placementExamYear || exam.academicYear !== student.year) continue;
      if (section.section.includes('backlog')) continue;
      if (exam.semester !== student.semester) continue;
      const students = Array.isArray(exam.students) ? exam.students as Array<Record<string, unknown>> : [];
      if (students.some(same)) return "Course eligibility, marks, viva or result records already exist for this semester.";
    }
  }
  return "";
}
