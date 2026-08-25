import type { ImportedSummaryBill, SummaryTeacher } from "./summaryData";
import {
  aggregateTeachers,
  examinationIndexName,
  examinationSummaryTitle,
  teachersForBill,
} from "./summaryData";
import type { ExaminationBillData, TableLayoutSettings } from "../create/components/types";
import {
  buildExamLine,
  deriveGradeSheetRows,
  flattenAssignment,
  flattenBoardViva,
  flattenClassTest,
  flattenCourseFile,
  flattenPaperSetter,
  flattenSessional,
  formatDesignationDept,
  formatTeacher,
  flattenTabulation,
} from "../create/components/pdf/pdfHelpers";

const LEGAL_PAGE = { width: 12240, height: 20160 };
const PAGE_MARGINS = { top: 600, right: 720, bottom: 900, left: 720, header: 0, footer: 0, gutter: 0 };
const FONT = "Times New Roman";

type DocxModule = typeof import("docx");
type Row = Record<string, unknown>;
type TableDefinition = {
  layoutKey: keyof TableLayoutSettings;
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows: Row[];
};

const textValue = (value: unknown): string => {
  if (value === true) return "Yes";
  if (value === false || value === "" || value === null || value === undefined) return "-";
  return String(value);
};

const paragraph = (docx: DocxModule, text: string, options: Record<string, unknown> = {}) =>
  new docx.Paragraph({
    spacing: { before: 0, after: 80, line: 240 },
    ...options,
    children: [new docx.TextRun({ text, font: FONT, size: 20 })],
  });

function editableTable(
  docx: DocxModule,
  definition: TableDefinition,
  widths: Record<string, number>,
): InstanceType<DocxModule["Table"]> {
  const total = definition.columns.reduce(
    (sum, column) => sum + Math.max(0, widths[column.key] ?? 1),
    0,
  ) || definition.columns.length;
  const makeCell = (text: string, width: number, bold = false, centered = false) =>
    new docx.TableCell({
      width: { size: Math.round((width / total) * 100), type: docx.WidthType.PERCENTAGE },
      margins: { top: 70, bottom: 70, left: 80, right: 80 },
      children: [new docx.Paragraph({
        alignment: centered ? docx.AlignmentType.CENTER : docx.AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 220 },
        children: [new docx.TextRun({ text, bold, font: FONT, size: 19 })],
      })],
    });
  const header = new docx.TableRow({
    tableHeader: true,
    children: definition.columns.map((column) => makeCell(column.label, widths[column.key] ?? 1, true, column.key === "sl" || column.key === "count")),
  });
  const rows = definition.rows.map((row, rowIndex) => new docx.TableRow({
    children: definition.columns.map((column) => makeCell(
      column.key === "sl" ? String(rowIndex + 1).padStart(2, "0") : textValue(row[column.key]),
      widths[column.key] ?? 1,
      false,
      column.key === "sl" || column.key === "count" || column.key.endsWith("Count") || column.key === "students",
    )),
  }));
  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    borders: {
      top: { style: docx.BorderStyle.SINGLE, size: 6, color: "000000" },
      bottom: { style: docx.BorderStyle.SINGLE, size: 6, color: "000000" },
      left: { style: docx.BorderStyle.SINGLE, size: 6, color: "000000" },
      right: { style: docx.BorderStyle.SINGLE, size: 6, color: "000000" },
      insideHorizontal: { style: docx.BorderStyle.SINGLE, size: 6, color: "000000" },
      insideVertical: { style: docx.BorderStyle.SINGLE, size: 6, color: "000000" },
    },
    rows: [header, ...rows],
  });
}

const withCourse = <T extends { courseCode: string; courseTitle: string }>(rows: T[]): Row[] => rows.map((row) => ({
  course: `${textValue(row.courseCode)}\n${textValue(row.courseTitle)}`,
  ...row,
}));

function billTables(bill: ExaminationBillData): TableDefinition[] {
  const isShort = bill.billInfo.examType === "short";
  const isMixed = bill.billInfo.evaluationSystem === "mixed";
  const defaultStudents = Number(bill.billInfo.totalStudents) || "";
  const classTestObe = flattenClassTest(bill.courseDuties.obe, defaultStudents, isShort, isShort ? 4 : 2);
  const classTestRows = isMixed
    ? [...classTestObe, ...flattenClassTest(bill.courseDuties.nonObe, defaultStudents, isShort, isShort ? 4 : 2)]
    : classTestObe;
  const sessional = bill.sessionalDuties.filter((course) => bill.sessionalEvaluationSystem === "mixed" || (course.syllabus ?? "obe") === "obe");
  const paperRows = isMixed
    ? [...flattenPaperSetter(bill.courseDuties.obe), ...flattenPaperSetter(bill.courseDuties.nonObe)]
    : flattenPaperSetter(bill.courseDuties.obe);
  const sessionalRows = flattenSessional(sessional);
  const boardRows = flattenBoardViva(sessional, bill.vivaBoardTeachers, Number(bill.billInfo.totalStudents) || "", bill.boardVivaMemberOrder ?? []);
  const studentRows = flattenTabulation(bill.studentDuties);
  const gradeRows = deriveGradeSheetRows(bill.studentDuties, String(bill.tabulationStudentCount));
  const scrutinyRows = isMixed ? [...bill.scrutinies.obe, ...bill.scrutinies.nonObe] : bill.scrutinies.obe;
  const definitions: Record<string, TableDefinition> = {
    committee: {
      layoutKey: "committee",
      title: "Examination Committee",
      columns: [{ key: "sl", label: "Sl. No." }, { key: "name", label: "Name" }, { key: "designationDept", label: "Designation & Department" }, { key: "role", label: "Role" }],
      rows: bill.committees.filter((member) => member.name.trim()).map((member) => ({ name: member.name, designationDept: formatDesignationDept(member.designation, member.department), role: member.role })),
    },
    paperSetter: {
      layoutKey: "paperSetter",
      title: "List of Teachers Associated with Paper Setter & Examiner",
      columns: [{ key: "course", label: "Course No. & Title" }, { key: "part", label: "Part" }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "paperSetCount", label: "No. of Paper Set" }, { key: "scriptExamined", label: "No. of Script Examined" }],
      rows: withCourse(paperRows),
    },
    classTest: {
      layoutKey: "classTest",
      title: "List of Teachers Associated with Class Test",
      columns: [{ key: "course", label: "Course No. & Title" }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "classTestCount", label: "No. of Class Test" }, { key: "students", label: "No. of Students" }],
      rows: withCourse(classTestRows),
    },
    assignment: {
      layoutKey: "assignment",
      title: "List of Teachers Associated with Class Assignment",
      columns: [{ key: "course", label: "Course No. & Title" }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "assignmentValue", label: "No. of Class Assignment" }],
      rows: withCourse(isShort ? [] : flattenAssignment(bill.courseDuties.obe)),
    },
    courseFile: {
      layoutKey: "courseFile",
      title: "List of Teachers Associated with Course File",
      columns: [{ key: "course", label: "Course No. & Title" }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "count", label: "No. of Course File" }],
      rows: withCourse(isShort ? [] : flattenCourseFile(bill.courseDuties.obe, sessional)),
    },
    questionWork: {
      layoutKey: "questionWork",
      title: "List of Teachers Associated with Question Work",
      columns: [{ key: "sl", label: "Sl." }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "questionNumber", label: "No. of Questions" }],
      rows: bill.questionWorks.filter((teacher) => teacher.name.trim()).map((teacher) => ({ teacherLine: formatTeacher(teacher.name, teacher.designation, teacher.department), questionNumber: `${bill.questionWorkTotal || "5"}/${bill.questionWorks.length || 1}` })),
    },
    scrutiny: {
      layoutKey: isMixed ? "scrutinyObe" : "scrutinyObe",
      title: "List of Teachers Associated with Scrutiny",
      columns: [{ key: "sl", label: "Sl." }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "scriptCount", label: "No. of Scripts" }],
      rows: scrutinyRows.filter((teacher) => teacher.name.trim()).map((teacher) => ({ teacherLine: formatTeacher(teacher.name, teacher.designation, teacher.department), scriptCount: teacher.scriptCount })),
    },
    sessional: {
      layoutKey: "sessionalDuty",
      title: "List of Teachers Associated with Sessional Duty",
      columns: [{ key: "course", label: "Course No. & Title" }, { key: "credit", label: "Credit" }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "students", label: "No. of Students" }],
      rows: withCourse(isShort ? [] : sessionalRows),
    },
    boardViva: {
      layoutKey: "boardViva",
      title: "List of Teachers Associated with Board Viva",
      columns: [{ key: "sl", label: "Sl." }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "students", label: "No. of Students" }],
      rows: boardRows.map((row) => ({ teacherLine: row.teacherLine, students: row.students })),
    },
    tabulation: {
      layoutKey: "tabulation",
      title: "List of Teachers Associated with Tabulation",
      columns: [{ key: "sl", label: "Sl." }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "students", label: "No. of Students" }],
      rows: studentRows.map((row) => ({ teacherLine: row.teacherLine, students: row.students })),
    },
    gradePreparation: {
      layoutKey: "gradeSheetPreparation",
      title: "List of Teachers Associated with Grade Sheet Preparation",
      columns: [{ key: "sl", label: "Sl." }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "studentsDisplay", label: "No. of Students" }],
      rows: gradeRows.map((row) => ({ teacherLine: row.teacherLine, studentsDisplay: row.studentsDisplay })),
    },
    gradeVerification: {
      layoutKey: "gradeSheetVerification",
      title: "List of Teachers Associated with Grade Sheet Verification",
      columns: [{ key: "sl", label: "Sl." }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "studentsDisplay", label: "No. of Students" }],
      rows: gradeRows.map((row) => ({ teacherLine: row.teacherLine, studentsDisplay: row.studentsDisplay })),
    },
    courseAdviser: {
      layoutKey: "courseAdviser",
      title: "List of Course Advisers",
      columns: [{ key: "sl", label: "Sl." }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "students", label: "No. of Students" }],
      rows: bill.courseAdvisers.filter((teacher) => teacher.name.trim()).map((teacher) => ({ teacherLine: formatTeacher(teacher.name, teacher.designation, teacher.department), students: teacher.students })),
    },
    courseCoordinator: {
      layoutKey: "courseCoordinator",
      title: "List of Course Coordinators",
      columns: [{ key: "sl", label: "Sl." }, { key: "teacherLine", label: "Name of Teachers & Designation" }],
      rows: bill.courseCoordinatorTeachers.filter((teacher) => teacher.name.trim()).map((teacher) => ({ teacherLine: formatTeacher(teacher.name, teacher.designation, teacher.department) })),
    },
    thesis: {
      layoutKey: "thesis",
      title: "List of Teachers Associated with Thesis / Project",
      columns: [{ key: "sl", label: "Sl." }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "supervisorCount", label: "Supervisor" }, { key: "examinerCount", label: "Thesis Examiner" }, { key: "thesisViva", label: "Thesis Viva" }],
      rows: bill.thesisTeachers.filter((teacher) => teacher.name.trim()).map((teacher) => ({ teacherLine: formatTeacher(teacher.name, teacher.designation, teacher.department), supervisorCount: teacher.supervisorCount, examinerCount: teacher.examinerCount, thesisViva: teacher.attendsViva ? "Yes" : "No" })),
    },
    verification: {
      layoutKey: "verification",
      title: "List of Teachers Associated with Verification",
      columns: [{ key: "sl", label: "Sl." }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "students", label: "No. of Students" }],
      rows: bill.verificationTeachers.filter((teacher) => teacher.name.trim()).map((teacher) => ({ teacherLine: formatTeacher(teacher.name, teacher.designation, teacher.department), students: bill.verificationStudentCount })),
    },
    practical: {
      layoutKey: "practicalSurveying",
      title: "List of Teachers Associated with Practical Surveying",
      columns: [{ key: "sl", label: "Sl." }, { key: "teacherLine", label: "Name of Teachers & Designation" }, { key: "students", label: "No. of Students" }],
      rows: bill.practicalSurveyingTeachers.filter((teacher) => teacher.name.trim()).map((teacher) => ({ teacherLine: formatTeacher(teacher.name, teacher.designation, teacher.department), students: bill.practicalSurveyingStudentCount })),
    },
  };
  const aliases: Record<string, string> = {
    paperSetterObe: "paperSetter",
    scrutinyObe: "scrutiny",
    sessionalDuty: "sessional",
    gradeSheetPreparation: "gradePreparation",
    gradeSheetVerification: "gradeVerification",
    practicalSurveying: "practical",
  };
  return (bill.sectionOrder ?? [])
    .map((key) => definitions[aliases[key] ?? key])
    .filter((definition): definition is TableDefinition => Boolean(definition && definition.rows.length));
}

function summaryTable(docx: DocxModule, teachers: SummaryTeacher[]) {
  return editableTable(docx, {
    layoutKey: "committee",
    title: "Teacher Summary",
    columns: [{ key: "sl", label: "SL No." }, { key: "name", label: "Name" }, { key: "designation", label: "Designation" }, { key: "count", label: "Number of Bill" }],
    rows: teachers.map((teacher) => ({ name: teacher.name, designation: [teacher.designation, teacher.department].filter(Boolean).join(", "), count: teacher.billCount })),
  }, { sl: 9, name: 31, designation: 48, count: 12 });
}

function billChildren(docx: DocxModule, item: ImportedSummaryBill) {
  const children: Array<InstanceType<DocxModule["Paragraph"]> | InstanceType<DocxModule["Table"]>> = [
    paragraph(docx, `Bill No.: ${item.bill.billInfo.billNo || "-"}`, { alignment: docx.AlignmentType.RIGHT }),
    paragraph(docx, `${item.bill.billInfo.examination || "B.Sc. Engineering"} ${buildExamLine(item.bill.billInfo)} (Series ${item.bill.billInfo.series})`, { alignment: docx.AlignmentType.CENTER }),
  ];
  billTables(item.bill).forEach((definition, index) => {
    children.push(paragraph(docx, `${index + 1}. ${definition.title}`, { bold: true }));
    children.push(editableTable(docx, definition, item.bill.layoutSettings[definition.layoutKey]));
    const spacing = item.bill.tableSpacing?.[definition.layoutKey] ?? item.bill.layoutSpacing?.sectionGap ?? 0;
    if (spacing > 0) children.push(paragraph(docx, "", { spacing: { before: 0, after: Math.round(spacing * 20), line: 240 } }));
    if (item.bill.pageBreakAfter?.[definition.layoutKey]) children.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
  });
  children.push(paragraph(docx, `Chairman\nExamination Committee\n${buildExamLine(item.bill.billInfo)}\nRUET, Rajshahi`, { alignment: docx.AlignmentType.CENTER }));
  return children;
}

export async function generateEditableSummaryWordDocument(
  bills: ImportedSummaryBill[],
  remunerationListYear: string,
  indexTableWidth: number,
): Promise<Blob> {
  const docx = await import("docx");
  const sections: Array<{ properties: { page: typeof LEGAL_PAGE & { margin: typeof PAGE_MARGINS } }; children: unknown[] }> = [];
  const indexChildren: unknown[] = [
    paragraph(docx, "Department of BECM", { alignment: docx.AlignmentType.CENTER, bold: true }),
    paragraph(docx, `Remuneration List - ${remunerationListYear}`, { alignment: docx.AlignmentType.CENTER, bold: true }),
    editableTable(docx, {
      layoutKey: "committee",
      title: "Remuneration List Index",
      columns: [{ key: "sl", label: "Sl. No." }, { key: "examination", label: "Name of Examination" }, { key: "series", label: "Series" }],
      rows: bills.map(({ bill }) => ({ examination: examinationIndexName(bill), series: bill.billInfo.series })),
    }, { sl: 12 * (100 / indexTableWidth), examination: 58 * (100 / indexTableWidth), series: 30 * (100 / indexTableWidth) }),
  ];
  sections.push({ properties: { page: { ...LEGAL_PAGE, margin: PAGE_MARGINS } }, children: indexChildren });
  bills.forEach((item) => {
    sections.push({ properties: { page: { ...LEGAL_PAGE, margin: PAGE_MARGINS } }, children: billChildren(docx, item) });
  });
  bills.forEach((item) => {
    sections.push({
      properties: { page: { ...LEGAL_PAGE, margin: PAGE_MARGINS } },
      children: [
        paragraph(docx, examinationSummaryTitle(item.bill), { alignment: docx.AlignmentType.CENTER, bold: true }),
        summaryTable(docx, teachersForBill(item.bill)),
      ],
    });
  });
  sections.push({
    properties: { page: { ...LEGAL_PAGE, margin: PAGE_MARGINS } },
    children: [
      paragraph(docx, "Consolidated Remuneration List of Dept. of BECM for All Imported Examination Bills", { alignment: docx.AlignmentType.CENTER, bold: true }),
      summaryTable(docx, aggregateTeachers(bills)),
    ],
  });
  const document = new docx.Document({ sections: sections as never });
  return docx.Packer.toBlob(document);
}
