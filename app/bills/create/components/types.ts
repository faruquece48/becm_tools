export type Designation =
  | ""
  | "Lecturer"
  | "Assistant Professor"
  | "Associate Professor"
  | "Assistant Professor & Head"
  | "Professor";

export interface BillInfo {
  billNo: string;
  examination: string;
  year: string;
  examType: "semester" | "backlog" | "short";
  semester: string;
  examYear: string;
  series: string;
  evaluationSystem: "obe" | "mixed";
  hasGraduatingStudents: "yes" | "no";
  totalStudents: string;
}

export interface CommitteeMember {
  name: string;
  designation: Designation;
  department: string;
  role: "Chairman" | "Member" | "External Member";
}

// ------------------------------
// Paper Setter & Examiner Duty Types
// ------------------------------
export interface DutyOption {
  paperSetter: boolean;
  examiner: boolean;
  classTest: boolean;
  assignment: boolean;
  courseFile: boolean;
}

// paperSetter / courseFile are fixed/shared values (just a checkbox, no count).
// examiner / assignment accept a fraction-style string (e.g. "1", "1/2").
// classTest is split into its own count + total students.
export interface DutyStudentCount {
  examiner: string;
  assignment: string;
  classTestCount: number | "";
  classTestStudents: number | "";
}

export interface AdditionalTeacher {
  name: string;
  designation: Designation;
  department: string;
  duties: DutyOption;
  students: DutyStudentCount;
}

export interface CoursePart {
  part: "A" | "B";
  teacher: string;
  designation: Designation;
  department: string;
  duties: DutyOption;
  students: DutyStudentCount;
  additionalTeachers: AdditionalTeacher[];
}

export interface CourseDuty {
  courseCode: string;
  courseTitle: string;
  parts: CoursePart[];
}

// ------------------------------
// Sessional Duty Types
// ------------------------------
export interface SessionalDutyOption {
  courseFile: boolean;
  sessional: boolean;
  boardViva: boolean;
}

export interface StudentCount {
  courseFile: number | "";
  sessional: number | "";
  boardViva: number | "";
}

export interface SessionalAdditionalTeacher {
  name: string;
  designation: Designation;
  department: string;
  duties: SessionalDutyOption;
  students: StudentCount;
}

export interface SessionalCourse {
  syllabus?: "obe" | "nonObe";
  courseCode: string;
  courseTitle: string;
  credit: string;
  teacher: string;
  designation: Designation;
  department: string;
  duties: SessionalDutyOption;
  students: StudentCount;
  additionalTeachers: SessionalAdditionalTeacher[];
  teacherCount?: 1 | 2;
}

export interface VivaBoardTeacher {
  name: string;
  designation: Designation;
  department: string;
}


// ------------------------------
// Question Work Types
// ------------------------------
export interface QuestionWork {
  name: string;
  designation: Designation;
  department: string;
}

// ------------------------------
// Scrutiny
// ------------------------------
export interface ScrutinyTeacher {
  name: string;
  designation: Designation;
  department: string;
  scriptCount: number | "";
}

export interface ScrutinySection {
  teachers: ScrutinyTeacher[];
}

// ------------------------------
// Student Duty (Tabulation) Types
// ------------------------------
export interface StudentDuty {
  name: string;
  designation: Designation;
  department: string;
  students: number | "";
}

// ------------------------------
// Course Adviser Types
// ------------------------------
export interface CourseAdviser {
  name: string;
  designation: Designation;
  department: string;
  students: number | "";
}

// ------------------------------
// Thesis / Project Examination Types
// ------------------------------
export interface ThesisTeacher {
  name: string;
  designation: Designation;
  department: string;
  supervisorCount: number | "";
  examinerCount: number | "";
  attendsViva: boolean;
}

export interface VerificationTeacher {
  name: string;
  designation: Designation;
  department: string;
}

// ------------------------------
// Course Coordinator Types
// ------------------------------
export interface CourseCoordinatorTeacher {
  name: string;
  designation: Designation;
  department: string;
}

// ==============================
// Complete Examination Bill Data
// ==============================
export interface ExaminationBillData {
  billInfo: BillInfo;
  committees: CommitteeMember[];
  courseDuties: { obe: CourseDuty[]; nonObe: CourseDuty[] };
  sessionalDuties: SessionalCourse[];
  sessionalEvaluationSystem: "obe" | "mixed";
  vivaBoardTeachers: VivaBoardTeacher[];
  boardVivaMemberOrder: string[];
  questionWorks: QuestionWork[];
  questionWorkTotal: string;
  pageBreakAfter: Record<string, boolean>;
  sectionOrder: string[];
  tableSpacing: Record<string, number>;
  scrutinies: { obe: ScrutinyTeacher[]; nonObe: ScrutinyTeacher[] };
  studentDuties: StudentDuty[];
  tabulationStudentCount: string;
  courseAdvisers: CourseAdviser[];
  courseAdviserStudentCount: string;
  practicalSurveyingTeachers: VerificationTeacher[];
  practicalSurveyingStudentCount: string;
  thesisTeachers: ThesisTeacher[];
  verificationTeachers: VerificationTeacher[];
  verificationStudentCount: string;
  courseCoordinatorTeachers: CourseCoordinatorTeacher[];
  layoutSettings: TableLayoutSettings;
  layoutSpacing: { sectionGap: number; footerArea: number };
}

// ------------------------------
// PDF Table Layout / Column Width Settings
// ------------------------------

export interface ColumnWidths {
  [columnKey: string]: number; // percentage (0-100), should sum to ~100 per table
}

export interface TableLayoutSettings {
  committee: ColumnWidths;
  courseDutyObe: ColumnWidths;
  courseDutyNonObe: ColumnWidths;
  paperSetter: ColumnWidths;
  paperSetterNonObe: ColumnWidths;
  classTest: ColumnWidths;
  assignment: ColumnWidths;
  courseFile: ColumnWidths;
  sessionalDuty: ColumnWidths;
  questionWork: ColumnWidths;
  scrutinyObe: ColumnWidths;
  scrutinyNonObe: ColumnWidths;
  studentDuty: ColumnWidths;
  boardViva: ColumnWidths;
  tabulation: ColumnWidths;
  gradeSheetPreparation: ColumnWidths;
  gradeSheetVerification: ColumnWidths;
  courseAdviser: ColumnWidths;
  practicalSurveying: ColumnWidths;
  thesis: ColumnWidths;
  verification: ColumnWidths;
  courseCoordinator: ColumnWidths;
}

export const defaultLayoutSettings: TableLayoutSettings = {
  committee: { sl: 8, name: 30, designationDept: 42, role: 20 },
  courseDutyObe: {
    courseCode: 8,
    courseTitle: 18,
    part: 6,
    name: 16,
    designation: 12,
    department: 10,
    paperSetter: 6,
    examiner: 8,
    classTest: 6,
    assignment: 8,
    courseFile: 2,
  },
  courseDutyNonObe: {
    courseCode: 8,
    courseTitle: 18,
    part: 6,
    name: 16,
    designation: 12,
    department: 10,
    paperSetter: 6,
    examiner: 8,
    classTest: 6,
    assignment: 8,
    courseFile: 2,
  },
  // Used by GroupedCourseTable in PreviewDocument.tsx — needs a "course"
  // width plus one width per entryColumns key passed for that section.
  paperSetter: {
    course: 18,
    part: 5,
    teacherLine: 55,
    paperSetCount: 10,
    scriptExamined: 12,
  },
  paperSetterNonObe: {
    course: 18,
    part: 5,
    teacherLine: 55,
    paperSetCount: 10,
    scriptExamined: 12,
  },
  classTest: {
    course: 18,
    teacherLine: 62,
    classTestCount: 10,
    students: 10,
  },
  assignment: {
    course: 18,
    teacherLine: 70,
    assignmentValue: 12,
  },
  courseFile: { course: 18, teacherLine: 70, count: 12 },
  sessionalDuty: {
    courseLine: 25,
    credit: 7,
    teacherLine: 54,
    students: 14,
  },
  questionWork: { sl: 7, teacherLine: 78, questionNumber: 15 },
  scrutinyObe: { sl: 7, teacherLine: 78, scriptCount: 15 },
  scrutinyNonObe: { sl: 7, teacherLine: 78, scriptCount: 15 },
  studentDuty: { sl: 10, teacherLine: 65, students: 25 },
  boardViva: { sl: 7, teacherLine: 78, students: 15 },
  tabulation: { sl: 7, teacherLine: 78, students: 15 },
  gradeSheetPreparation: { sl: 7, teacherLine: 78, studentsDisplay: 15 },
  gradeSheetVerification: { sl: 7, teacherLine: 78, studentsDisplay: 15 },
  courseAdviser: { sl: 7, teacherLine: 78, students: 15 },
  practicalSurveying: { sl: 7, teacherLine: 79, students: 14 },
  thesis: {
    sl: 7,
    teacherLine: 57,
    supervisorCount: 10,
    examinerCount: 15,
    thesisViva: 11,
  },
  verification: { sl: 10, teacherLine: 76, students: 14 },
  courseCoordinator: { sl: 10, teacherLine: 90 },
};
