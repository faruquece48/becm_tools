import { emptyBill } from "../create/components/emptyBill";
import type {
  Designation,
  ExaminationBillData,
} from "../create/components/types";
import {
  collectTeacherNames,
  deriveTeacherRows,
} from "../individual/individualBill";

export interface ImportedSummaryBill {
  id: string;
  fileName: string;
  bill: ExaminationBillData;
}

export interface SummaryTeacher {
  key: string;
  name: string;
  designation: string;
  department: string;
  billCount: number;
}

interface TeacherSource {
  name: string;
  designation?: Designation;
  department?: string;
}

const teacherKey = (name: string) =>
  name
    .trim()
    .replace(/^(mr|mrs|ms|mst)\.?\s+/i, "")
    .trim()
    .toLocaleLowerCase();

export function normalizeImportedBill(
  data: Partial<ExaminationBillData>
): ExaminationBillData {
  return {
    ...emptyBill,
    ...data,
    billInfo: { ...emptyBill.billInfo, ...data.billInfo },
    courseDuties: {
      obe: data.courseDuties?.obe ?? [],
      nonObe: data.courseDuties?.nonObe ?? [],
    },
    scrutinies: {
      obe: data.scrutinies?.obe ?? [],
      nonObe: data.scrutinies?.nonObe ?? [],
    },
    layoutSettings: {
      ...emptyBill.layoutSettings,
      ...data.layoutSettings,
    },
    layoutSpacing: {
      ...emptyBill.layoutSpacing,
      ...data.layoutSpacing,
    },
    pageBreakAfter: data.pageBreakAfter ?? {},
    tableSpacing: data.tableSpacing ?? {},
    sectionOrder: data.sectionOrder ?? emptyBill.sectionOrder,
  };
}

function teacherSources(bill: ExaminationBillData): TeacherSource[] {
  const courseTeachers = [
    ...bill.courseDuties.obe,
    ...bill.courseDuties.nonObe,
  ].flatMap((course) =>
    course.parts.flatMap((part) => [
      {
        name: part.teacher,
        designation: part.designation,
        department: part.department,
      },
      ...part.additionalTeachers,
    ])
  );
  const sessionalTeachers = bill.sessionalDuties.flatMap((course) => [
    {
      name: course.teacher,
      designation: course.designation,
      department: course.department,
    },
    ...course.additionalTeachers,
  ]);

  return [
    ...bill.committees,
    ...courseTeachers,
    ...sessionalTeachers,
    ...bill.questionWorks,
    ...bill.scrutinies.obe,
    ...bill.scrutinies.nonObe,
    ...bill.studentDuties,
    ...bill.courseAdvisers,
    ...bill.thesisTeachers,
    ...bill.verificationTeachers,
    ...bill.courseCoordinatorTeachers,
    ...bill.practicalSurveyingTeachers,
  ];
}

export function teachersForBill(bill: ExaminationBillData): SummaryTeacher[] {
  const sources = teacherSources(bill);
  return collectTeacherNames(bill)
    .filter((name) => deriveTeacherRows(bill, name).length > 0)
    .map((name) => {
      const source = sources.find((teacher) => teacherKey(teacher.name) === teacherKey(name));
      return {
        key: teacherKey(name),
        name,
        designation: source?.designation || "",
        department: source?.department || "",
        billCount: 1,
      };
    });
}

export function aggregateTeachers(
  bills: ImportedSummaryBill[]
): SummaryTeacher[] {
  const teachers = new Map<string, SummaryTeacher>();
  bills.forEach(({ bill }) => {
    teachersForBill(bill).forEach((teacher) => {
      const existing = teachers.get(teacher.key);
      if (existing) existing.billCount += 1;
      else teachers.set(teacher.key, { ...teacher });
    });
  });
  return Array.from(teachers.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

export function examinationSummaryTitle(bill: ExaminationBillData): string {
  const info = bill.billInfo;
  const type = info.examType === "backlog"
    ? `${info.year} Backlog`
    : info.examType === "short"
      ? `${info.year} Short Semester`
      : `${info.year} ${info.semester} Semester`;
  return `Remuneration List of Dept. of BECM for ${
    info.examination || "B.Sc. Engineering"
  } Examination-${info.examYear || ""} (${type.trim()})`;
}

export function examinationIndexName(bill: ExaminationBillData): string {
  const info = bill.billInfo;
  return info.examType === "backlog"
    ? `${info.year} Backlog Examination ${info.examYear}`.trim()
    : info.examType === "short"
      ? `${info.year} Short Semester ${info.examYear}`.trim()
      : `${info.year} ${info.semester} Semester Examination ${info.examYear}`.trim();
}
