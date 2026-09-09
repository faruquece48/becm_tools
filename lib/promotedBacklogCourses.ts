type Course = { id: string; code: string; title: string; semester?: string };

export function promotedBacklogCourses(courseIds: string[], syllabuses: { courses: Course[] }[]) {
  // An explicit promotion authorizes its historical syllabus, even when inactive.
  const byId = new Map(syllabuses.flatMap(segment => segment.courses).map(course => [course.id, course]));
  return courseIds.flatMap(id => {
    const course = byId.get(id);
    if (!course || course.semester !== "Odd" && course.semester !== "Even") return [];
    return [{ courseId: course.id, courseCode: course.code, courseTitle: course.title, semester: course.semester as "Odd" | "Even" }];
  });
}
