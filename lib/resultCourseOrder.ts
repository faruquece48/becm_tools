import { defaultSyllabuses, type SyllabusSegment } from "@/lib/storage/syllabuses";

const normalize = (value: string) => value.replace(/\s/g, "").toLowerCase();

export function sortCourseCodesBySyllabus(values: string[], syllabuses: SyllabusSegment[] = defaultSyllabuses, series?: string) {
  const byCode = new Map<string, string>();
  values.forEach(value => { const cleaned = value.trim(), key = normalize(cleaned); if (key && !byCode.has(key)) byCode.set(key, cleaned); });
  const unique = [...byCode.values()];
  const matching = syllabuses.filter(segment => segment.active !== false && (!series || Number(series) >= Number(segment.fromSeries) && Number(series) <= Number(segment.toSeries)));
  const source = matching.length ? matching : syllabuses.filter(segment => segment.active !== false);
  const order = new Map<string, number>();
  source.flatMap(segment => segment.courses || []).forEach((course, index) => { const key = normalize(course.code); if (!order.has(key)) order.set(key, index); });
  return unique.map((value, index) => ({ value, index, order: order.get(normalize(value)) ?? Number.MAX_SAFE_INTEGER })).sort((left, right) => left.order - right.order || left.index - right.index).map(item => item.value);
}
