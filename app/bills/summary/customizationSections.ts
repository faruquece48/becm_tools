import type { ExaminationBillData, TableLayoutSettings } from "../create/components/types";
import {
  combineClassTestRows,
  deriveGradeSheetRows,
  flattenAssignment,
  flattenBoardViva,
  flattenClassTest,
  flattenCourseFile,
  flattenPaperSetter,
  flattenSessional,
  flattenTabulation,
  mixedSessionalStudentTotal,
} from "../create/components/pdf/pdfHelpers";
import { practicalSurveyingStaffGroups, staffSessionalGroups } from "@/lib/staffRemunerationMatching";

export type SummaryCustomizationSection = {
  layoutKey: keyof TableLayoutSettings;
  breakKey: string;
  orderKey: string;
  title: string;
  suffix?: ".1" | ".2";
};

export function summaryCustomizationSections(bill: ExaminationBillData): SummaryCustomizationSection[] {
  const isBacklog = bill.billInfo.examType === "backlog";
  const isShort = bill.billInfo.examType === "short";
  const isMixed = bill.billInfo.evaluationSystem === "mixed";
  const obePaperRows = flattenPaperSetter(bill.courseDuties.obe);
  const nonObePaperRows = flattenPaperSetter(bill.courseDuties.nonObe);
  const paperRows = isMixed ? [...obePaperRows, ...nonObePaperRows] : obePaperRows;
  const defaultStudents = Number(bill.billInfo.totalStudents) || "";
  const obeClassTestRows = flattenClassTest(bill.courseDuties.obe, defaultStudents, isShort, isShort ? 4 : 2);
  const classTestRows = isMixed
    ? combineClassTestRows(obeClassTestRows, flattenClassTest(bill.courseDuties.nonObe, defaultStudents, isShort, isShort ? 4 : 2))
    : obeClassTestRows;
  const assignmentRows = isShort ? [] : flattenAssignment(bill.courseDuties.obe, defaultStudents);
  const obeSessional = bill.sessionalDuties.filter((course) => (course.syllabus ?? "obe") === "obe");
  const visibleSessional = bill.sessionalEvaluationSystem === "mixed"
    ? bill.sessionalDuties
    : obeSessional;
  const sessionalRows = flattenSessional(visibleSessional);
  const courseFileRows = isShort ? [] : flattenCourseFile(bill.courseDuties.obe, obeSessional);
  const sessionalTotal = mixedSessionalStudentTotal(visibleSessional);
  const boardRows = flattenBoardViva(
    visibleSessional,
    bill.vivaBoardTeachers,
    sessionalTotal || Number(bill.billInfo.totalStudents) || "",
    bill.boardVivaMemberOrder ?? [],
  );
  const tabulationRows = flattenTabulation(bill.studentDuties);
  const gradeRows = deriveGradeSheetRows(bill.studentDuties, String(sessionalTotal || bill.tabulationStudentCount));
  const scrutinyRows = isMixed ? [...bill.scrutinies.obe, ...bill.scrutinies.nonObe] : bill.scrutinies.obe;
  const fourthYear = bill.billInfo.examType === "semester" && bill.billInfo.year === "4th Year";
  const firstYearEven = !isBacklog && bill.billInfo.year === "1st Year" && bill.billInfo.semester === "Even";
  const practicalTeachers = firstYearEven && bill.practicalSurveyingTeachers.some((teacher) => teacher.name.trim());
  const staffSessional = !isBacklog && sessionalRows.length > 0 && staffSessionalGroups(bill).length > 0;
  const practicalStaff = practicalTeachers && practicalSurveyingStaffGroups(bill).length > 0;

  const primary: Array<SummaryCustomizationSection & { visible: boolean }> = [
    { layoutKey: "committee", breakKey: "committee", orderKey: "committee", title: "Examination Committee", visible: bill.committees.some((member) => member.name.trim()) },
    { layoutKey: "paperSetter", breakKey: "paperSetterObe", orderKey: "paperSetterObe", title: "List of Teachers Associated with Paper Setter & Examiner", visible: paperRows.length > 0 },
    { layoutKey: "classTest", breakKey: "classTest", orderKey: "classTest", title: "List of Teachers Associated with Class Test", visible: !isBacklog && classTestRows.length > 0 },
    { layoutKey: "assignment", breakKey: "assignment", orderKey: "assignment", title: "List of Teachers Associated with Assignment", visible: !isBacklog && assignmentRows.length > 0 },
    { layoutKey: "courseFile", breakKey: "courseFile", orderKey: "courseFile", title: "List of Teachers Associated with Course File", visible: !isBacklog && courseFileRows.length > 0 },
    { layoutKey: "questionWork", breakKey: "questionWork", orderKey: "questionWork", title: isBacklog ? "List of Teachers Associated with Question Typing, Sketching & Printing" : "List of Teachers Associated with Question Typing, Sketching, Comparing & Printing", visible: bill.questionWorks.some((teacher) => teacher.name.trim()) },
    { layoutKey: "scrutinyObe", breakKey: "scrutinyObe", orderKey: "scrutinyObe", title: "List of Teachers Associated with Scrutiny", visible: scrutinyRows.length > 0 },
    { layoutKey: "sessionalDuty", breakKey: "sessionalDuty", orderKey: "sessionalDuty", title: "List of Teachers Associated with Sessional", visible: !isBacklog && sessionalRows.length > 0 },
    { layoutKey: "staffSessional", breakKey: "staffSessional", orderKey: "staffSessional", title: "List of Officer & Staff Associated with Sessional", visible: staffSessional },
    { layoutKey: "boardViva", breakKey: "boardViva", orderKey: "boardViva", title: "List of Teachers Associated with Board Viva", visible: boardRows.length > 0 },
    { layoutKey: "tabulation", breakKey: "tabulation", orderKey: "tabulation", title: "List of Teachers Associated with Tabulation", visible: tabulationRows.length > 0 },
    { layoutKey: "gradeSheetPreparation", breakKey: "gradeSheetPreparation", orderKey: "gradeSheetPreparation", title: isBacklog ? "List of Teachers Associated with Grade Sheet Preparation & Verification" : "List of Teachers Associated with Grade Sheet Preparation", visible: gradeRows.length > 0 },
    { layoutKey: "gradeSheetVerification", breakKey: "gradeSheetVerification", orderKey: "gradeSheetVerification", title: "List of Teachers Associated with Grade Sheet Verification", visible: !isBacklog && gradeRows.length > 0 },
    { layoutKey: "courseAdviser", breakKey: "courseAdviser", orderKey: "courseAdviser", title: "List of Course Advisers", visible: !isBacklog && bill.courseAdvisers.length > 0 },
    { layoutKey: "courseCoordinator", breakKey: "courseCoordinator", orderKey: "courseCoordinator", title: "List of Teachers Associated with Course Coordinator", visible: fourthYear && (bill.billInfo.semester === "Odd" || bill.billInfo.semester === "Even") && bill.courseCoordinatorTeachers.length > 0 },
    { layoutKey: "thesis", breakKey: "thesis", orderKey: "thesis", title: "List of Teachers Associated with Thesis/Project Examination", visible: fourthYear && bill.billInfo.semester === "Even" && bill.thesisTeachers.length > 0 },
    { layoutKey: "verification", breakKey: "verification", orderKey: "verification", title: "List of Teachers Associated with Verification of Final Result", visible: bill.billInfo.hasGraduatingStudents === "yes" && bill.verificationTeachers.length > 0 },
    { layoutKey: "practicalSurveying", breakKey: "practicalSurveying", orderKey: "practicalSurveying", title: "List of Teachers Associated with Practical Surveying (CE 1226)", visible: practicalTeachers },
    { layoutKey: "staffPracticalSurveying", breakKey: "staffPracticalSurveying", orderKey: "staffPracticalSurveying", title: "List of Officer & Staff Associated with practical Surveying (CE 1226)", visible: practicalStaff },
  ];

  const order = bill.sectionOrder ?? [];
  const visible = primary.filter((section) => section.visible).sort((left, right) => {
    if (left.orderKey === "committee") return -1;
    if (right.orderKey === "committee") return 1;
    const leftIndex = order.indexOf(left.orderKey);
    const rightIndex = order.indexOf(right.orderKey);
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });

  return visible.flatMap(({ visible: _visible, ...section }, index) => {
    void _visible;
    const number = index + 1;
    if (section.layoutKey === "paperSetter" && isMixed) {
      return [
        { ...section, title: `${number}.1 OBE (New Syllabus) — Paper Setter & Examiner`, suffix: ".1" as const },
        ...(nonObePaperRows.length ? [{ ...section, layoutKey: "paperSetterNonObe" as const, breakKey: "paperSetterNonObe", title: `${number}.2 Non-OBE (Old Syllabus) — Paper Setter & Examiner`, suffix: ".2" as const }] : []),
      ];
    }
    if (section.layoutKey === "scrutinyObe" && isMixed) {
      return [
        { ...section, title: `${number}.1 OBE (New Syllabus) — Scrutiny`, suffix: ".1" as const },
        ...(bill.scrutinies.nonObe.length ? [{ ...section, layoutKey: "scrutinyNonObe" as const, breakKey: "scrutinyNonObe", title: `${number}.2 Non-OBE (Old Syllabus) — Scrutiny`, suffix: ".2" as const }] : []),
      ];
    }
    return [{ ...section, title: `${number}. ${section.title}` }];
  });
}
