import type { SyllabusCourse, SyllabusSegment } from "./storage/syllabuses";

export function orderBacklogCourses(courses: SyllabusCourse[], syllabuses: SyllabusSegment[]) {
  // Preserve each syllabus's serial order, including inactive historical syllabuses.
  const orderedSegments = [...syllabuses].sort(
    (left, right) => Number(Number(left.fromSeries) < 2020) - Number(Number(right.fromSeries) < 2020),
  );
  const ranks = new Map<string, number>();
  for (const segment of orderedSegments) {
    for (const course of segment.courses) {
      const key = `${course.semester}|${course.id}`;
      if (!ranks.has(key)) ranks.set(key, ranks.size);
    }
  }
  const rank = (course: SyllabusCourse) => ranks.get(`${course.semester}|${course.id}`) ?? ranks.size;
  return [...courses].sort((left, right) => rank(left) - rank(right));
}
