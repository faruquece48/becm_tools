import type { StudentDirectoryRecord } from "@/lib/storage/studentDirectory";
import { defaultSyllabuses, syllabusCoursesForExam, type SyllabusCourse, type SyllabusSegment } from "@/lib/storage/syllabuses";

type ExamSelection = { academicYear: string; semester: string };
type ArchiveStudent = { studentId: string; rollNo?: string };
type ExamArchive = { academicYear: string; semester: string; students: ArchiveStudent[] };

const years = ["1st", "2nd", "3rd", "4th"] as const;
const terms = ["Odd", "Even"] as const;
const normalize = (value: string) => value.replace(/\s/g, "").toLowerCase();
const position = (academicYear: string, semester: string) => years.indexOf(academicYear as typeof years[number]) * 2 + terms.indexOf(semester as typeof terms[number]);

function coursesFor(syllabuses: SyllabusSegment[], series: string, academicYear: typeof years[number], semester: typeof terms[number]) {
  const loaded = syllabusCoursesForExam(syllabuses, series, academicYear, semester);
  if (loaded.length) return loaded;
  const fallbackSeries = Math.min(2024, Math.max(2020, Number(series) || 2020)).toString();
  return syllabusCoursesForExam(defaultSyllabuses, fallbackSeries, academicYear, semester);
}

export function missedRegistrationCourseCodes(student: StudentDirectoryRecord, selection: ExamSelection, syllabuses: SyllabusSegment[], archives: ExamArchive[], preparedExams: ExamArchive[] = []) {
  const codes = new Set<string>();
  const sameStudent = (candidate: ArchiveStudent) => candidate.studentId === student.id || Boolean(candidate.rollNo) && normalize(candidate.rollNo || "") === normalize(student.rollNo);
  const hasRegistration = (academicYear: string, semester: string) => [...archives, ...preparedExams].some((archive) => archive.academicYear === academicYear && archive.semester === semester && archive.students.some(sameStudent));
  const addSemester = (series: string, academicYear: typeof years[number], semester: typeof terms[number]) => {
    coursesFor(syllabuses, series, academicYear, semester).forEach((course: SyllabusCourse) => codes.add(course.code));
  };

  (student.obeBatchPlacements || []).forEach((placement) =>
    (placement.missedSemesters || []).forEach((missed) => {
      if (!hasRegistration(missed.academicYear, missed.semester)) addSemester(placement.series, missed.academicYear, missed.semester);
    }),
  );

  const currentPosition = position(selection.academicYear, selection.semester);
  if (currentPosition < 0) return [...codes];
  for (const academicYear of years) {
    for (const semester of terms) {
      if (position(academicYear, semester) >= currentPosition) continue;
      const registered = hasRegistration(academicYear, semester);
      if (!registered) addSemester(student.series, academicYear, semester);
    }
  }
  return [...codes];
}
