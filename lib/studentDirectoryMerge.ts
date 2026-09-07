type StudentIdentity = { id: string; rollNo: string };
const normalize = (value: string) => value.trim().toLowerCase();

export class DuplicateStudentError extends Error {}

export function mergeStudentDirectory<T extends StudentIdentity>(current: T[], incoming: T[]): T[] {
  const ids = new Set<string>();
  const rolls = new Set<string>();
  for (const student of incoming) {
    const roll = normalize(student.rollNo);
    if (ids.has(student.id) || rolls.has(roll)) {
      throw new DuplicateStudentError(`Duplicate student roll ${student.rollNo} in this submission. No students were saved.`);
    }
    if (current.some(existing => normalize(existing.rollNo) === roll && existing.id !== student.id)) {
      throw new DuplicateStudentError(`Student roll ${student.rollNo} already exists. Use Edit in the student list to update that student. No students were saved.`);
    }
    ids.add(student.id);
    rolls.add(roll);
  }
  const next = [...current];
  for (const student of incoming) {
    const index = next.findIndex(existing => existing.id === student.id);
    if (index < 0) next.push(student);
    else next[index] = student;
  }
  return next;
}
