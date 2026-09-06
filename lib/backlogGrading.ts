export const BACKLOG_MAX_GRADE = "B+";
export const BACKLOG_MAX_GRADE_POINT = 3.25;

export function backlogGrade(score: number) {
  if (score >= 65) return BACKLOG_MAX_GRADE;
  if (score >= 60) return "B";
  if (score >= 55) return "B-";
  if (score >= 50) return "C+";
  if (score >= 45) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function backlogGradePoint(score: number) {
  if (score >= 65) return BACKLOG_MAX_GRADE_POINT;
  if (score >= 60) return 3;
  if (score >= 55) return 2.75;
  if (score >= 50) return 2.5;
  if (score >= 45) return 2.25;
  if (score >= 40) return 2;
  return 0;
}
