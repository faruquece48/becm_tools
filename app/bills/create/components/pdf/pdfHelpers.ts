import type {
  CourseDuty,
  SessionalCourse,
  StudentDuty,
  Designation,
  BillInfo,
  VivaBoardTeacher,
} from "../types";

export const formatPaddedTableValue = (value: unknown): string => {
  const text = String(value);
  if (/^[1-9]$/.test(text)) return text.padStart(2, "0");
  if (/^\d+(?:\/\d+)+$/.test(text)) {
    return text
      .split("/")
      .map((part) => (/^[1-9]$/.test(part) ? part.padStart(2, "0") : part))
      .join("/");
  }
  return text;
};

// ------------------------------
// Footer exam line, e.g. "4th Year Even Semester Examination-2023"
// ------------------------------
export function buildExamLine(bill: BillInfo): string {
  const year = bill.year || "";
  const semester = bill.examType === "semester" ? bill.semester || "" : "";
  const examYear = bill.examYear || "";
  const typeLabel = bill.examType === "semester" ? "Semester" : bill.examType === "short" ? "Short Semester" : "Backlog";
  return `${year} ${semester} ${typeLabel} Examination ${examYear}`
    .replace(/\s+/g, " ")
    .trim();
}

// Single-line bold title, e.g.
// "B.Sc. Engineering 4th Year Even Semester Examination-2023 (Series 2019)"
export function buildFullTitle(bill: BillInfo): string {
  const exam = bill.examination || "B.Sc. Engineering";
  const year = bill.year || "";
  const typeLabel =
    bill.examType === "semester"
      ? `${bill.semester || ""} Semester Examination`
      : bill.examType === "short"
        ? "Short Semester"
        : "Backlog Examination";
  const examYear = bill.examYear || "";
  const series = bill.series || "";
  return `${exam} ${year} ${typeLabel}-${examYear} (Series ${series})`
    .replace(/\s+/g, " ")
    .trim();
}

// "Name, Designation, Dept. of Department" — comma-joined single cell
export function formatTeacher(
  name: string,
  designation: Designation,
  department: string
): string {
  // NOTE: `department` already contains the "Dept. of ..." prefix as
  // stored (e.g. "Dept. of BECM"), so it's appended as-is here. Do not
  // re-prefix it — that was causing "Dept. of Dept. of BECM" in the
  // rendered teacher line.
  const parts = [name, designation].filter(Boolean);
  if (department) parts.push(department);
  return parts.join(", ");
}

// "Designation, Dept. of Department" — no name. Used for Committee's
// separate Name / Designation+Department columns.
export function formatDesignationDept(
  designation: Designation,
  department: string
): string {
  return [designation, department].filter(Boolean).join(", ");
}

// ------------------------------
// 2. Paper Setter & Examiner
// One row per part/additional-teacher, only if paperSetter or examiner is checked
// ------------------------------
export interface PaperSetterRow {
  courseCode: string;
  courseTitle: string;
  part: string;
  teacherLine: string;
  paperSetCount: string; // "01" if paperSetter checked, else ""
  scriptExamined: string; // examiner students value, else ""
}

export function flattenPaperSetter(courses: CourseDuty[]): PaperSetterRow[] {
  const rows: PaperSetterRow[] = [];
  courses.forEach((course) => {
    course.parts.forEach((part) => {
      const entries = [
        {
          name: part.teacher,
          designation: part.designation,
          department: part.department,
          duties: part.duties,
          students: part.students,
        },
        ...part.additionalTeachers.map((at) => ({
          name: at.name,
          designation: at.designation,
          department: at.department,
          duties: at.duties,
          students: at.students,
        })),
      ];
      entries.forEach((entry) => {
        if (!entry.duties.paperSetter && !entry.duties.examiner) return;
        rows.push({
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          part: part.part,
          teacherLine: formatTeacher(
            entry.name,
            entry.designation,
            entry.department
          ),
          paperSetCount: entry.duties.paperSetter ? "01" : "",
          scriptExamined: entry.duties.examiner ? entry.students.examiner : "",
        });
      });
    });
  });
  return rows;
}

// ------------------------------
// 3. Class Test
// One row per part/additional-teacher, only if classTest is checked
// ------------------------------
export interface ClassTestRow {
  courseCode: string;
  courseTitle: string;
  teacherLine: string;
  classTestCount: number | "";
  students: number | "";
}

export function flattenClassTest(
  courses: CourseDuty[],
  defaultStudentCount: number | "" = "",
  oneTeacherPerCourse = false,
  defaultClassTestCount = 2
): ClassTestRow[] {
  const rows = new Map<string, ClassTestRow>();
  courses.forEach((course) => {
    let courseRowAdded = false;
    course.parts.forEach((part) => {
      const entries = [
        {
          name: part.teacher,
          designation: part.designation,
          department: part.department,
          duties: part.duties,
          students: part.students,
        },
        ...(!oneTeacherPerCourse ? part.additionalTeachers : []).map((at) => ({
          name: at.name,
          designation: at.designation,
          department: at.department,
          duties: at.duties,
          students: at.students,
        })),
      ];
      entries.forEach((entry) => {
        if (oneTeacherPerCourse && courseRowAdded) return;
        if (!entry.duties.classTest) return;
        if (oneTeacherPerCourse && !entry.name.trim()) return;
        const courseStudentCount = entry.students.classTestStudents;
        const students = Number(
          courseStudentCount === "" || courseStudentCount == null
            ? defaultStudentCount
            : courseStudentCount
        ) || 0;
        const classTestCount =
          Number(entry.students.classTestCount) || defaultClassTestCount;
        if (students <= 0 || classTestCount <= 0) return;
        const teacherLine = formatTeacher(
          entry.name,
          entry.designation,
          entry.department
        );
        const key = `${course.courseCode}\u0000${course.courseTitle}\u0000${teacherLine}`;
        const current = rows.get(key);
        rows.set(key, {
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          teacherLine,
          classTestCount,
          // Repeated parts in the same syllabus represent the same student
          // cohort, so retain the larger total instead of duplicating it.
          students: Math.max(Number(current?.students) || 0, students) || "",
        });
        courseRowAdded = true;
      });
    });
  });
  return Array.from(rows.values());
}

export function combineClassTestRows(
  obeRows: ClassTestRow[],
  nonObeRows: ClassTestRow[]
): ClassTestRow[] {
  const courseKey = (row: ClassTestRow) =>
    `${row.courseCode}\u0000${row.courseTitle}`;
  const obeCourses = new Set(obeRows.map(courseKey));
  const nonObeStudentTotals = new Map<string, number>();

  nonObeRows.forEach((row) => {
    const key = courseKey(row);
    // Multiple teachers in one syllabus refer to the same cohort, so the
    // course total is represented once rather than summed per teacher.
    nonObeStudentTotals.set(
      key,
      Math.max(nonObeStudentTotals.get(key) || 0, Number(row.students) || 0)
    );
  });

  const combinedObeRows: ClassTestRow[] = obeRows.map((row) => {
    const totalStudents =
      (Number(row.students) || 0) +
      (nonObeStudentTotals.get(courseKey(row)) || 0);
    return {
      ...row,
      classTestCount: row.classTestCount,
      students: totalStudents || "",
    };
  });

  // A Non-OBE teacher is shown only when that course has no OBE Class Test
  // entry to carry the combined student total.
  const nonObeOnlyRows = nonObeRows.filter(
    (row) => !obeCourses.has(courseKey(row))
  );

  return [...combinedObeRows, ...nonObeOnlyRows];
}

// ------------------------------
// 4. Assignment
// One row per part/additional-teacher, only if assignment is checked
// ------------------------------
export interface AssignmentRow {
  courseCode: string;
  courseTitle: string;
  teacherLine: string;
  assignmentValue: string;
}

export function flattenAssignment(courses: CourseDuty[]): AssignmentRow[] {
  const rows: AssignmentRow[] = [];
  courses.forEach((course) => {
    course.parts.forEach((part) => {
      const entries = [
        {
          name: part.teacher,
          designation: part.designation,
          department: part.department,
          duties: part.duties,
          students: part.students,
        },
        ...part.additionalTeachers.map((at) => ({
          name: at.name,
          designation: at.designation,
          department: at.department,
          duties: at.duties,
          students: at.students,
        })),
      ];
      entries.forEach((entry) => {
        if (!entry.duties.assignment) return;
        rows.push({
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          teacherLine: formatTeacher(
            entry.name,
            entry.designation,
            entry.department
          ),
          assignmentValue: "",
        });
      });
    });
  });
  return rows;
}

// ------------------------------
// 5. Course File
// Merged from BOTH course-duty parts AND sessional courses, wherever
// courseFile is checked. Sessional courses come after course-duty rows,
// matching the reference document's ordering.
// ------------------------------
export interface CourseFileRow {
  courseCode: string;
  courseTitle: string;
  teacherLine: string;
}

export function flattenCourseFile(
  courseDuties: CourseDuty[],
  sessionalDuties: SessionalCourse[]
): CourseFileRow[] {
  const rows: CourseFileRow[] = [];
  courseDuties.forEach((course) => {
    course.parts.forEach((part) => {
      const entries = [
        {
          name: part.teacher,
          designation: part.designation,
          department: part.department,
          duties: part.duties,
        },
        ...part.additionalTeachers.map((at) => ({
          name: at.name,
          designation: at.designation,
          department: at.department,
          duties: at.duties,
        })),
      ];
      entries.forEach((entry) => {
        if (!entry.duties.courseFile) return;
        rows.push({
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          teacherLine: formatTeacher(
            entry.name,
            entry.designation,
            entry.department
          ),
        });
      });
    });
  });
  sessionalDuties.forEach((course) => {
    const entries = [
      {
        name: course.teacher,
        designation: course.designation,
        department: course.department,
        duties: course.duties,
      },
      ...course.additionalTeachers.map((at) => ({
        name: at.name,
        designation: at.designation,
        department: at.department,
        duties: at.duties,
      })),
    ];
    if (isIndustrialAttachmentCourse(course.courseCode)) {
      entries.slice(1).filter((entry) => entry.name.trim()).forEach((entry) => {
        rows.push({
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          teacherLine: formatTeacher(entry.name, entry.designation, entry.department),
        });
      });
      return;
    }
    entries.forEach((entry) => {
      if (!entry.duties.courseFile) return;
      rows.push({
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        teacherLine: formatTeacher(
          entry.name,
          entry.designation,
          entry.department
        ),
      });
    });
  });
  return rows;
}

// ------------------------------
// 8. Sessional (credit not modeled yet — left blank if not in type)
// ------------------------------
export interface SessionalRow {
  courseCode: string;
  courseTitle: string;
  courseLine: string;
  credit: string;
  teacherLine: string;
  students: number | string;
}

const normalizedCourseCode = (courseCode: string) =>
  courseCode.replace(/\s+/g, "").toUpperCase();

export const isIndustrialAttachmentCourse = (courseCode: string) =>
  normalizedCourseCode(courseCode) === "BECM4100";

const dividedStudentCount = (total: number | "", engagedTeachers: number) => {
  const students = Number(total) || 0;
  if (!students || !engagedTeachers) return "";
  const share = students / engagedTeachers;
  return Number.isInteger(share) ? share : String(Math.round(share * 100) / 100);
};

export function flattenSessional(courses: SessionalCourse[]): SessionalRow[] {
  const rows: SessionalRow[] = [];
  courses.forEach((course) => {
    const entries = [
      {
        name: course.teacher,
        designation: course.designation,
        department: course.department,
        duties: course.duties,
        students: course.students,
      },
      ...course.additionalTeachers.map((at) => ({
        name: at.name,
        designation: at.designation,
        department: at.department,
        duties: at.duties,
        students: at.students,
      })),
    ];
    if (isIndustrialAttachmentCourse(course.courseCode)) {
      const engagedEntries = entries.slice(1).filter((entry) => entry.name.trim());
      const students = dividedStudentCount(
        course.students.sessional,
        engagedEntries.length
      );
      engagedEntries.forEach((entry) => {
        rows.push({
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          courseLine: course.courseTitle ? `${course.courseCode}\n${course.courseTitle}` : course.courseCode,
          credit: course.credit ?? "",
          teacherLine: formatTeacher(entry.name, entry.designation, entry.department),
          students: course.students.sessional && engagedEntries.length
            ? `${course.students.sessional}/${engagedEntries.length}`
            : students,
        });
      });
      return;
    }
    entries.forEach((entry) => {
      if (!entry.duties.sessional) return;
      rows.push({
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        courseLine: course.courseTitle ? `${course.courseCode}\n${course.courseTitle}` : course.courseCode,
        credit: course.credit ?? "",
        teacherLine: formatTeacher(entry.name, entry.designation, entry.department),
        students: entry.students.sessional,
      });
    });
  });
  return rows;
}

// ------------------------------
// Board Viva — same source as Sessional (duties.boardViva), separate table
// ------------------------------
export interface BoardVivaRow {
  teacherLine: string;
  students: number | "";
}

export function flattenBoardViva(
  courses: SessionalCourse[],
  additionalTeachers: VivaBoardTeacher[] = [],
  defaultStudents: number | "" = "",
  memberOrder: string[] = [],
): BoardVivaRow[] {
  const rows: BoardVivaRow[] = [];
  const seen = new Set<string>();
  courses.forEach((course) => {
    if (course.courseCode.replace(/\s+/g, "").toUpperCase() === "BECM4100") return;
    const entries = [
      {
        name: course.teacher,
        designation: course.designation,
        department: course.department,
        duties: course.duties,
        students: course.students,
      },
      ...course.additionalTeachers.map((at) => ({
        name: at.name,
        designation: at.designation,
        department: at.department,
        duties: at.duties,
        students: at.students,
      })),
    ];
    entries.forEach((entry) => {
      if (!entry.duties.boardViva) return;
      const line = formatTeacher(entry.name, entry.designation, entry.department);
      // De-duplicate: same teacher may attend viva for multiple sessional courses
      if (seen.has(line)) return;
      seen.add(line);
      rows.push({ teacherLine: line, students: defaultStudents });
    });
  });
  additionalTeachers.forEach((teacher) => {
    if (!teacher.name.trim()) return;
    const line = formatTeacher(teacher.name, teacher.designation, teacher.department);
    if (seen.has(line)) return;
    seen.add(line);
    rows.push({ teacherLine: line, students: defaultStudents });
  });
  const orderIndex = new Map(memberOrder.map((teacherLine, index) => [teacherLine, index]));
  return rows
    .map((row, sourceIndex) => ({ row, sourceIndex }))
    .sort((left, right) => {
      const leftIndex = orderIndex.get(left.row.teacherLine);
      const rightIndex = orderIndex.get(right.row.teacherLine);
      if (leftIndex == null && rightIndex == null) return left.sourceIndex - right.sourceIndex;
      if (leftIndex == null) return 1;
      if (rightIndex == null) return -1;
      return leftIndex - rightIndex;
    })
    .map(({ row }) => row);
}

// ------------------------------
// Tabulation (reused as-is for section "Tabulation")
// ------------------------------
export interface TabulationRow {
  teacherLine: string;
  students: number | "";
}

export function flattenTabulation(duties: StudentDuty[]): TabulationRow[] {
  return duties.map((d) => ({
    teacherLine: formatTeacher(d.name, d.designation, d.department),
    students: d.students,
  }));
}

// ------------------------------
// Grade Sheet Preparation & Verification
// Same teacher list and shared student total as Tabulation. The total is
// divided by the number of teachers engaged in these sections.
// ------------------------------
export interface GradeSheetRow {
  teacherLine: string;
  studentsDisplay: string; // e.g. "31/3"
}

export function deriveGradeSheetRows(
  duties: StudentDuty[],
  totalStudents: string
): GradeSheetRow[] {
  const studentsDisplay =
    totalStudents && duties.length > 0 ? `${totalStudents}/${duties.length}` : "";

  return duties.map((d) => ({
    teacherLine: formatTeacher(d.name, d.designation, d.department),
    studentsDisplay,
  }));
}

export function formatCourseAdviserStudents(
  totalStudents: string,
  adviserCount: number
): string {
  if (!totalStudents) return "";

  return adviserCount > 1 ? `${totalStudents}/${adviserCount}` : totalStudents;
}

/**
 * When old-syllabus sessional courses are present, the shared student total
 * is the largest OBE sessional batch plus the largest Non-OBE sessional batch.
 */
export function mixedSessionalStudentTotal(
  courses: SessionalCourse[],
): number | "" {
  const nonObeCourses = courses.filter((course) => course.syllabus === "nonObe");
  if (nonObeCourses.length === 0) return "";

  const maximum = (items: SessionalCourse[]) =>
    Math.max(0, ...items.map((course) => Number(course.students.sessional) || 0));
  const obeCourses = courses.filter((course) => (course.syllabus ?? "obe") === "obe");
  const total = maximum(obeCourses) + maximum(nonObeCourses);
  return total || "";
}

// ------------------------------
// Group flattened rows by course (courseCode + courseTitle), so Part A
// and Part B of the same course share a single serial number and a
// single merged "Course No. & Title" cell instead of repeating it on
// every row.
// ------------------------------
export interface CourseGroup<T> {
  sl: number;
  courseCode: string;
  courseTitle: string;
  entries: T[];
}

export function groupByCourse<
  T extends { courseCode: string; courseTitle: string }
>(rows: T[]): CourseGroup<T>[] {
  const map = new Map<string, CourseGroup<T>>();
  let nextSl = 1;
  rows.forEach((row) => {
    const key = `${row.courseCode}||${row.courseTitle}`;
    if (!map.has(key)) {
      map.set(key, {
        sl: nextSl++,
        courseCode: row.courseCode,
        courseTitle: row.courseTitle,
        entries: [],
      });
    }
    map.get(key)!.entries.push(row);
  });
  return Array.from(map.values());
}

// ------------------------------
// Thesis Viva formula display, e.g. "(30 x 5)/10" — matches the source
// document's format: (total viva students x 5) / (no. of teachers
// attending viva). Shown as one merged cell for the whole column,
// not evaluated to a single number.
//
// ASSUMPTION: "total viva students" is taken from the Board Viva batch
// size (bill.sessionalDuties' boardViva student count), since that's the
// only "total students attending a viva" figure available in the data
// model. If this isn't the right source field, let me know and I'll
// repoint it.
// ------------------------------
export function buildThesisVivaFormula(
  totalVivaStudents: number | "",
  teachersAttendingViva: number
): string {
  if (totalVivaStudents === "" || teachersAttendingViva <= 0) return "";
  return `(${totalVivaStudents} x 5)/${teachersAttendingViva}`;
}

// ------------------------------
// Course grouping helper — merges consecutive rows sharing the same
// course (e.g. Part A / Part B of one course) into one visual group.
// Only the first row in each group gets a serial number and shows the
// course code/title; later rows in the same group get blanks there so
// tables can render a "merged cell" look without native rowSpan.
// ------------------------------
export function groupConsecutiveByCourse<
  T extends { courseCode: string; courseTitle: string }
>(rows: T[]): (T & { sl: number | ""; showCourse: boolean })[] {
  let counter = 0;
  let lastCode: string | null = null;
  return rows.map((row) => {
    const isNew = row.courseCode !== lastCode;
    if (isNew) {
      counter += 1;
      lastCode = row.courseCode;
    }
    return {
      ...row,
      sl: isNew ? counter : "",
      showCourse: isNew,
    };
  });
}

export function courseLabel(courseCode: string, courseTitle: string): string {
  return courseTitle ? `${courseCode}\n${courseTitle}` : courseCode;
}

// Add near formatTeacher()

// "Name, Designation" only — no department. Used for Committee, where
// Department already has its own separate column.
export function formatTeacherOnly(name: string, designation: Designation): string {
  return [name, designation].filter(Boolean).join(", ");
}

// ------------------------------
// Thesis Viva merged formula: (totalVivaStudents x 5)/(teachers attending viva)
// totalVivaStudents comes from the Board Viva batch size (first Board Viva
// row's student count — all rows share the same batch). If Board Viva has
// no data, or no thesis teacher has attendsViva checked, returns "".
// ------------------------------
export function computeThesisVivaFormula(
  boardVivaRows: { students: number | "" }[],
  thesisTeachers: { attendsViva: boolean }[]
): string {
  const totalStudents = boardVivaRows.length > 0 ? boardVivaRows[0].students : "";
  const attendingCount = thesisTeachers.filter((t) => t.attendsViva).length;
  if (totalStudents === "" || attendingCount === 0) return "";
  return `(${totalStudents} x 5)/${attendingCount}`;
}
