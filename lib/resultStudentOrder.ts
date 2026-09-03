const academicYearNumber: Record<string, number> = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 };
const rollSeries = (rollNo: string) => Number(rollNo.replace(/\D/g, "").slice(0, 2)) || 0;
export const expectedStudentSeries = (examYear: string, academicYear: string) => String(Number(examYear) - (academicYearNumber[academicYear] || 1));
export function compareResultStudentRolls(leftRoll: string, rightRoll: string, examYear: string, academicYear: string) {
  const expectedPrefix = Number(expectedStudentSeries(examYear, academicYear).slice(-2));
  const leftSeries = rollSeries(leftRoll), rightSeries = rollSeries(rightRoll);
  const group = Number(leftSeries !== expectedPrefix) - Number(rightSeries !== expectedPrefix);
  return group || rightSeries - leftSeries || leftRoll.localeCompare(rightRoll, undefined, { numeric: true });
}