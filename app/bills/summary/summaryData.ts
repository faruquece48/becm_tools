import { emptyBill } from "../create/components/emptyBill";
import {
  mergeStaffSectionOrder,
  practicalSurveyingStaffGroups,
  staffSessionalGroups,
} from "@/lib/staffRemunerationMatching";
import type { TeacherRankData } from "@/lib/storage/teacherRank";
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

export type SummaryStaff = SummaryTeacher;

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

const departmentOrder = ["becm", "ce", "arch", "eee", "me", "math", "chem", "phy", "hum"] as const;

function normalizedDepartment(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isOtherUniversity(department: string): boolean {
  const normalized = normalizedDepartment(department);
  if (!normalized || /\bruet\b/.test(normalized)) return false;
  return /\b(?:buet|cuet|duet|kuet|uet|iut|sust|aust|mist|bau|ju|du|cu|ru)\b/.test(normalized)
    || /\b(?:university|institute of technology)\b/.test(normalized);
}

function departmentKey(department: string): string {
  const normalized = normalizedDepartment(department);
  if (/\bbecm\b|building engineering|construction management/.test(normalized)) return "becm";
  if (/\bce\b|civil engineering/.test(normalized)) return "ce";
  if (/\barch\b|architecture/.test(normalized)) return "arch";
  if (/\beee\b|electrical and electronic/.test(normalized)) return "eee";
  if (/\bme\b|mechanical engineering/.test(normalized)) return "me";
  if (/\bmath\b|mathematics/.test(normalized)) return "math";
  if (/\bchem\b|chemistry/.test(normalized)) return "chem";
  if (/\bphy\b|physics/.test(normalized)) return "phy";
  if (/\bhum\b|humanities/.test(normalized)) return "hum";
  return "other";
}

function summaryTeacherComparator(rankData?: TeacherRankData) {
  const departmentRanks = new Map(
    rankData?.departments.map((department) => [
      department.id,
      new Map(department.teachers.map((teacher, index) => [teacherKey(teacher.name), index])),
    ]) ?? [],
  );
  return (left: SummaryTeacher, right: SummaryTeacher): number => {
    const leftExternal = isOtherUniversity(left.department);
    const rightExternal = isOtherUniversity(right.department);
    if (leftExternal !== rightExternal) return leftExternal ? 1 : -1;
    const leftKey = departmentKey(left.department);
    const rightKey = departmentKey(right.department);
    const leftIndex = departmentOrder.indexOf(leftKey as typeof departmentOrder[number]);
    const rightIndex = departmentOrder.indexOf(rightKey as typeof departmentOrder[number]);
    const leftDepartmentRank = leftIndex < 0 ? departmentOrder.length : leftIndex;
    const rightDepartmentRank = rightIndex < 0 ? departmentOrder.length : rightIndex;
    if (leftDepartmentRank !== rightDepartmentRank) return leftDepartmentRank - rightDepartmentRank;
    const rankSection = leftExternal && rightExternal ? "other-university" : leftKey === rightKey ? leftKey : "";
    const ranks = departmentRanks.get(rankSection);
    if (ranks) {
      const leftTeacherRank = ranks.get(left.key) ?? Number.MAX_SAFE_INTEGER;
      const rightTeacherRank = ranks.get(right.key) ?? Number.MAX_SAFE_INTEGER;
      if (leftTeacherRank !== rightTeacherRank) return leftTeacherRank - rightTeacherRank;
    }
    return left.name.localeCompare(right.name);
  };
}

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
    sectionOrder: mergeStaffSectionOrder(data.sectionOrder, emptyBill.sectionOrder),
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

export function teachersForBill(bill: ExaminationBillData, rankData?: TeacherRankData): SummaryTeacher[] {
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
    })
    .sort(summaryTeacherComparator(rankData));
}

export function aggregateTeachers(
  bills: ImportedSummaryBill[],
  rankData?: TeacherRankData,
): SummaryTeacher[] {
  const teachers = new Map<string, SummaryTeacher>();
  bills.forEach(({ bill }) => {
    teachersForBill(bill, rankData).forEach((teacher) => {
      const existing = teachers.get(teacher.key);
      if (existing) existing.billCount += 1;
      else teachers.set(teacher.key, { ...teacher });
    });
  });
  return Array.from(teachers.values()).sort(summaryTeacherComparator(rankData));
}

function parseStaffMember(value: string): Omit<SummaryStaff, "key" | "billCount"> {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  const departmentIndex = parts.findIndex((part) => /^(?:dept\.?|department)\b/i.test(part));
  const designationEnd = departmentIndex < 0 ? parts.length : departmentIndex;
  return {
    name: parts[0] || value.trim(),
    designation: parts.slice(1, designationEnd).join(", "),
    department: departmentIndex < 0 ? "" : parts.slice(departmentIndex).join(", "),
  };
}

function configuredStaffRanks(bill: ExaminationBillData): Map<string, number> {
  const ranks = new Map<string, number>();
  bill.staffRemunerationData?.semesters.forEach((semester) => {
    semester.courses.forEach((course) => {
      course.staff.forEach((member) => {
        const key = teacherKey(parseStaffMember(member.name).name);
        if (key && !ranks.has(key)) ranks.set(key, ranks.size);
      });
    });
  });
  return ranks;
}

function summaryStaffComparator(ranks: Map<string, number>) {
  return (left: SummaryStaff, right: SummaryStaff): number => {
    const leftKey = departmentKey(left.department || left.designation);
    const rightKey = departmentKey(right.department || right.designation);
    const leftIndex = departmentOrder.indexOf(leftKey as typeof departmentOrder[number]);
    const rightIndex = departmentOrder.indexOf(rightKey as typeof departmentOrder[number]);
    const leftDepartmentRank = leftIndex < 0 ? departmentOrder.length : leftIndex;
    const rightDepartmentRank = rightIndex < 0 ? departmentOrder.length : rightIndex;
    if (leftDepartmentRank !== rightDepartmentRank) return leftDepartmentRank - rightDepartmentRank;
    const configuredDifference = (ranks.get(left.key) ?? Number.MAX_SAFE_INTEGER)
      - (ranks.get(right.key) ?? Number.MAX_SAFE_INTEGER);
    return configuredDifference || left.name.localeCompare(right.name);
  };
}

export function staffForBill(bill: ExaminationBillData): SummaryStaff[] {
  const staff = new Map<string, SummaryStaff>();
  const groups = [...staffSessionalGroups(bill), ...practicalSurveyingStaffGroups(bill)];
  groups.forEach((group) => group.entries.forEach(({ staffMember }) => {
    const parsed = parseStaffMember(staffMember);
    const key = teacherKey(parsed.name);
    if (key && !staff.has(key)) staff.set(key, { key, ...parsed, billCount: 1 });
  }));
  return Array.from(staff.values()).sort(summaryStaffComparator(configuredStaffRanks(bill)));
}

export function aggregateStaff(bills: ImportedSummaryBill[]): SummaryStaff[] {
  const staff = new Map<string, SummaryStaff>();
  const ranks = new Map<string, number>();
  bills.forEach(({ bill }) => {
    configuredStaffRanks(bill).forEach((_rank, key) => {
      if (!ranks.has(key)) ranks.set(key, ranks.size);
    });
    staffForBill(bill).forEach((member) => {
      const existing = staff.get(member.key);
      if (existing) existing.billCount += 1;
      else staff.set(member.key, { ...member });
    });
  });
  return Array.from(staff.values()).sort(summaryStaffComparator(ranks));
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
