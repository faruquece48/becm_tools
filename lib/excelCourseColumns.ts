type Course = { id: string; code: string; semester: string };

export const excelCoursePrefix = (course: Course) => `${course.code} ${course.semester} [${course.id}]`;

export function excelCourseValue(record: Record<string, unknown>, course: Course, courses: Course[], heading: string) {
  const column = `${excelCoursePrefix(course)} ${heading}`;
  if (Object.hasOwn(record, column)) return record[column];
  // SheetJS suffixes duplicate headers in older exports. Keep each syllabus separate.
  const duplicates = courses.filter(item => item.code === course.code && item.semester === course.semester);
  const occurrence = duplicates.findIndex(item => item.id === course.id);
  const legacyColumn = `${course.code} ${course.semester} ${heading}${occurrence > 0 ? `_${occurrence}` : ""}`;
  return record[legacyColumn];
}
