type Promotion = { id: string; examYear: string; academicYear: string; semester: string; examType: string; courseIds: string[] };
export function promotionCoursesChanged(before: Promotion[], after: Promotion[], exam: Omit<Promotion, "id" | "courseIds">) {
  const courses = (items: Promotion[]) => [...new Set(items.filter(item => samePromotionExam(item, exam)).flatMap(item => item.courseIds))].sort();
  return JSON.stringify(courses(before)) !== JSON.stringify(courses(after));
}
export function editPromotion<T extends Promotion>(existing: T[], incoming: T): T[] {
  if (!existing.some(item => item.id === incoming.id)) throw new Error("Promotion no longer exists. Refresh the page.");
  if (existing.some(item => item.id !== incoming.id && samePromotionExam(item, incoming))) throw new Error("A promotion already exists for the selected examination. Edit that registration instead, or choose another examination.");
  return existing.flatMap(item => item.id !== incoming.id ? [item] : incoming.courseIds.length ? [{ ...incoming, courseIds: [...new Set(incoming.courseIds)] }] : []);
}
export function samePromotionExam(a: Omit<Promotion, "id" | "courseIds">, b: Omit<Promotion, "id" | "courseIds">) {
  return a.examYear === b.examYear && a.academicYear === b.academicYear && a.examType === b.examType && (a.examType === "Backlog" || a.semester === b.semester);
}
export function savePromotion<T extends Promotion>(existing: T[], incoming: T, replace: boolean): T[] {
  const matches = existing.filter(item => samePromotionExam(item, incoming));
  const courseIds = [...new Set([...(replace ? [] : matches.flatMap(item => item.courseIds)), ...incoming.courseIds])];
  const remaining = existing.filter(item => !samePromotionExam(item, incoming));
  return courseIds.length ? [...remaining, { ...incoming, id: matches[0]?.id || incoming.id, courseIds }] : remaining;
}
