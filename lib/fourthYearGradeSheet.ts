import type { FourthYearSheet } from "./fourthYearExamData";

/** Project the tabulation model into an individual grade sheet. */
export function fourthYearGradeSheetTotals(sheet: FourthYearSheet, student: { id: string; rollNo: string }) {
  const normalize = (value: string) => value.replace(/\s/g, "").toLowerCase();
  const row = sheet.rows.find(item => item.id === student.id || normalize(item.roll) === normalize(student.rollNo));
  if (!row) throw new Error(`No fourth-year backlog tabulation data found for ${student.rollNo}.`);
  const courses = sheet.courses.filter(course => Object.hasOwn(row.results, course.id));
  return {
    courses, grades: courses.map(course => row.results[course.id].grade),
    registered: courses.reduce((sum, course) => sum + (Number(course.credit) || 0), 0),
    earned: row.earned, gpa: row.gpa, cum: row.totalCredit, cgpa: row.cgpa,
  };
}
