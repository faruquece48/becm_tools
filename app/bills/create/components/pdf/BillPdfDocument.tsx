"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import type { ExaminationBillData } from "../types";
import {
  flattenPaperSetter,
  flattenClassTest,
  combineClassTestRows,
  flattenAssignment,
  flattenCourseFile,
  flattenSessional,
  flattenBoardViva,
  mixedSessionalStudentTotal,
  flattenTabulation,
  deriveGradeSheetRows,
  formatCourseAdviserStudents,
  groupByCourse,
  computeThesisVivaFormula,
  formatTeacher,
  formatDesignationDept,
  buildExamLine,
  formatPaddedTableValue,
} from "./pdfHelpers";
// Requires the actual Monotype Corsiva .ttf file at /public/fonts/monotype-corsiva.ttf
// (Monotype Corsiva is proprietary — typically bundled with Windows/Office — so you must
// supply your own licensed copy). If that file is missing, PDF generation will fail the
// same way it did before. If you don't have a licensed copy, swap the src for a free
// script font instead (e.g. Google Fonts "Dancing Script" or "Mrs Saint Delafield").
Font.register({ family: "MonotypeCorsiva", src: "/fonts/monotype-corsiva.ttf" });
// Disable automatic word-hyphenation (e.g. "Professor" -> "Profes-sor").
Font.registerHyphenationCallback((word) => [word]);
const BORDER = "#000000";
const BW = 0.75;
const styles = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 68, paddingHorizontal: 36, fontSize: 10, fontFamily: "Times-Roman" },
  headerBlock: { textAlign: "center", marginBottom: 14 },
  scriptLine: { fontSize: 9, fontFamily: "MonotypeCorsiva", marginBottom: 2 },
  deptLine: { fontSize: 10, marginBottom: 2 },
  titleLine: { fontSize: 10, fontWeight: 700, marginTop: 4 },
  billNo: {
    position: "absolute",
    top: 30,
    right: 36,
    borderWidth: BW,
    borderColor: BORDER,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: 700,
  },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginTop: 0, marginBottom: 4 },
  subSectionTitle: { fontSize: 10, fontWeight: 700, marginTop: 5, marginBottom: 4 },
  // Table wrapper no longer carries a left/right border. A single View
  // spanning every row would get its border drawn as one continuous box
  // even when react-pdf splits it across a page break — producing a
  // "phantom" vertical line that dangles into the blank space after the
  // last row on one page, and a mismatched fragment on the next. Instead,
  // every row (each already wrap={false}, so it can never itself be cut
  // mid-row) supplies its own left border (on its first cell) and right
  // border (on its last cell), making each row a fully self-contained
  // box regardless of which page it lands on.
  table: { width: "100%" },
  row: { flexDirection: "row", width: "100%" },
  cell: { borderRightWidth: BW, borderColor: BORDER, padding: 4, fontSize: 10, justifyContent: "center" },
  headerCell: {
    borderRightWidth: BW,
    borderColor: BORDER,
    padding: 4,
    fontSize: 10,
    fontWeight: 700,
    justifyContent: "center",
  },
  cellLeftEdge: { borderLeftWidth: BW },
  cellNoRightEdge: { borderRightWidth: 0 },
  rowTopEdge: { borderTopWidth: BW, borderColor: BORDER },
  // Each grouped row is a complete, page-safe fragment. The negative top
  // margin overlaps adjacent horizontal borders so the table reads as one
  // continuous grid instead of a stack of double-bordered boxes.
  groupedRow: {
    borderTopWidth: BW,
    borderBottomWidth: BW,
    borderColor: BORDER,
    marginTop: -BW,
  },
  innerRowDivider: { borderTopWidth: BW, borderColor: BORDER },
  groupedEntryArea: { flexDirection: "column", alignSelf: "stretch" },
  groupedEntryRow: { flexDirection: "row", alignItems: "stretch", flexGrow: 1 },
  cellBottomEdge: { borderBottomWidth: BW },
  center: { textAlign: "center" },
  // Right-corner footer block: fixed width, anchored to the bottom-right,
  // text centered within that block. The page's reserved footer area is
  // controlled from Preview & Layout Customization.
  footer: { position: "absolute", bottom: 24, right: 36, width: 190, textAlign: "center", fontSize: 10 },
});
interface Col {
  key: string;
  label: string;
  width: number;
  align?: "left" | "center" | "right";
}

/**
 * Layout settings are relative column weights, not fixed percentages. This
 * keeps every table exactly as wide as its printable container even when a
 * saved layout's values do not add up to 100.
 */
function normalizeColumns(columns: Col[]): Col[] {
  if (columns.length === 0) return columns;

  const total = columns.reduce((sum, column) => sum + Math.max(0, column.width), 0);
  if (total <= 0) {
    return columns.map((column) => ({ ...column, width: 100 / columns.length }));
  }
  return columns.map((column) => ({ ...column, width: (Math.max(0, column.width) / total) * 100 }));
}

function formatCell(value: any): string {
  if (value === true) return "Yes";
  if (
    value === false ||
    value === 0 ||
    value === "0" ||
    (typeof value === "string" && value.trim() === "") ||
    value === undefined ||
    value === null
  )
    return "-";
  return formatPaddedTableValue(value);
}
function SimpleTable({
  columns,
  rows,
  showHeader = true,
}: {
  columns: Col[];
  rows: Record<string, any>[];
  showHeader?: boolean;
}) {
  const normalizedColumns = normalizeColumns(columns);

  return (
    <View style={styles.table}>
      {showHeader && (
        <View style={[styles.row, styles.rowTopEdge]} wrap={false}>
          {normalizedColumns.map((c, i) => (
            <View key={c.key} style={[styles.headerCell, { width: `${c.width}%` }, i === 0 ? styles.cellLeftEdge : {}]}>
              <Text style={c.align === "center" || c.key === "sl" ? styles.center : undefined}>{c.label}</Text>
            </View>
          ))}
        </View>
      )}
      {rows.map((row, ri) => (
        <View style={[styles.row, styles.rowTopEdge]} key={ri} wrap={false}>
          {normalizedColumns.map((c, i) => (
            <View key={c.key} style={[styles.cell, { width: `${c.width}%` }, i === 0 ? styles.cellLeftEdge : {}, ri === rows.length - 1 ? styles.cellBottomEdge : {}]}>
              <Text style={c.align === "center" || c.key === "sl" ? styles.center : undefined}>
                {c.key === "sl" ? formatPaddedTableValue(ri + 1) : formatCell(row[c.key])}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
/**
 * GroupedTable: left column is the Course (spans the full height of the
 * group), middle section repeats one row per entry (e.g. Part A, Part B),
 * and an optional right-most groupColumn spans the full group height too
 * (e.g. a single merged "No. of Course File" value shared by every entry
 * in that course).
 */
function GroupedTable({
  courseWidth,
  entryColumns,
  groups,
  groupMergeColumn,
  groupedEntryKeys,
}: {
  courseWidth: number;
  entryColumns: Col[];
  groups: { courseCode: string; courseTitle: string; entries: Record<string, any>[] }[];
  groupMergeColumn?: { key: string; label: string; width: number; align?: "left" | "center" | "right"; value: (group: { courseCode: string; courseTitle: string; entries: Record<string, any>[] }) => React.ReactNode };
  groupedEntryKeys?: string[];
}) {
  const normalized = normalizeColumns([
    { key: "course", label: "Course No. & Title", width: courseWidth },
    ...entryColumns,
    ...(groupMergeColumn ? [groupMergeColumn] : []),
  ]);
  const normalizedCourseWidth = normalized[0].width;
  const normalizedEntryColumns = normalized.slice(1, 1 + entryColumns.length);
  const mergedEntryColumns = normalizedEntryColumns.filter((c) => groupedEntryKeys?.includes(c.key));
  const repeatingEntryColumns = normalizedEntryColumns.filter((c) => !groupedEntryKeys?.includes(c.key));
  const normalizedMergeColumn = groupMergeColumn ? normalized[normalized.length - 1] : undefined;
  const entryTotal = repeatingEntryColumns.reduce((sum, column) => sum + column.width, 0) || 1;

  return (
    <>
      {/* Keep the heading outside the pageable list of course groups. If a
          complete course does not fit, react-pdf can move that group to the
          next page without cloning the table heading into the continuation. */}
      <View style={[styles.table, styles.row, styles.rowTopEdge]} wrap={false}>
        <View style={[styles.headerCell, { width: `${normalizedCourseWidth}%` }, styles.cellLeftEdge]}>
          <Text>Course No. &amp; Title</Text>
        </View>
        {normalizedEntryColumns.map((c) => (
          <View
            key={c.key}
            style={[
              styles.headerCell,
              { width: `${c.width}%` },
            ]}
          >
            <Text style={c.align === "center" ? styles.center : undefined}>{c.label}</Text>
          </View>
        ))}
        {normalizedMergeColumn && (
          <View style={[styles.headerCell, { width: `${normalizedMergeColumn.width}%` }]}>
            <Text style={normalizedMergeColumn.align === "center" ? styles.center : undefined}>
              {normalizedMergeColumn.label}
            </Text>
          </View>
        )}
      </View>

      {groups.map((group, groupIndex) => (
        <View key={groupIndex} style={[styles.table, styles.row, styles.groupedRow, { alignItems: "stretch" }]} wrap={false}>
          <View style={[styles.cell, styles.cellLeftEdge, { width: `${normalizedCourseWidth}%`, justifyContent: "center" }]}>
            <Text>{formatCell(group.courseCode)}</Text>
            <Text>{formatCell(group.courseTitle)}</Text>
          </View>
          {mergedEntryColumns.map((c) => (
            <View key={c.key} style={[styles.cell, { width: `${c.width}%`, justifyContent: "center" }]}>
              <Text style={c.align === "center" ? styles.center : undefined}>{formatCell(group.entries[0]?.[c.key])}</Text>
            </View>
          ))}
          <View style={[styles.groupedEntryArea, { width: `${entryTotal}%` }]}>
            {group.entries.map((entry, ei) => (
              <View
                key={ei}
                  style={[
                    styles.groupedEntryRow,
                    ei > 0 ? styles.innerRowDivider : {},
                  ]}
                  wrap={false}
              >
                {repeatingEntryColumns.map((c) => (
                    <View key={c.key} style={[styles.cell, { width: `${(c.width / entryTotal) * 100}%` }]}>
                      <Text style={c.align === "center" ? styles.center : undefined}>{formatCell(entry[c.key])}</Text>
                    </View>
                ))}
              </View>
            ))}
          </View>
          {normalizedMergeColumn && groupMergeColumn && (
            <View style={[styles.cell, { width: `${normalizedMergeColumn.width}%`, justifyContent: "center" }]}>
              <Text style={styles.center}>{formatCell(groupMergeColumn.value(group))}</Text>
            </View>
          )}
        </View>
      ))}
    </>
  );
}
function MergedColumnTable({
  columns,
  rows,
  mergeKey,
  mergeValue,
  keepTogether = false,
}: {
  columns: Col[];
  rows: Record<string, any>[];
  mergeKey: string;
  mergeValue: React.ReactNode;
  keepTogether?: boolean;
}) {
  const normalizedColumns = normalizeColumns(columns);
  const mergeCol = normalizedColumns.find((c) => c.key === mergeKey)!;
  const mergeIndex = normalizedColumns.findIndex((c) => c.key === mergeKey);
  const leftCols = normalizedColumns.slice(0, mergeIndex);
  const rightCols = normalizedColumns.slice(mergeIndex + 1);
  const leftTotal = leftCols.reduce((s, c) => s + c.width, 0) || 1;
  const rightTotal = rightCols.reduce((s, c) => s + c.width, 0) || 1;
  const hasLeft = leftCols.length > 0;
  const hasRight = rightCols.length > 0;
  return (
    <View style={styles.table} wrap={!keepTogether}>
      <View style={[styles.row, styles.rowTopEdge]} wrap={false}>
        {normalizedColumns.map((c, i) => (
          <View key={c.key} style={[styles.headerCell, { width: `${c.width}%` }, i === 0 ? styles.cellLeftEdge : {}]}>
            <Text style={c.align === "center" || c.key === "sl" ? styles.center : undefined}>{c.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.row}>
        {hasLeft && (
          <View style={{ width: `${leftTotal}%` }}>
            {rows.map((row, ri) => (
              <View key={ri} style={[{ flexDirection: "row" }, styles.rowTopEdge]} wrap={false}>
                {leftCols.map((c, ci) => (
                  <View key={c.key} style={[styles.cell, { width: `${(c.width / leftTotal) * 100}%` }, ci === 0 ? styles.cellLeftEdge : {}, ri === rows.length - 1 ? styles.cellBottomEdge : {}]}>
                    <Text style={c.align === "center" || c.key === "sl" ? styles.center : undefined}>
                      {c.key === "sl" ? formatPaddedTableValue(ri + 1) : formatCell(row[c.key])}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
        <View style={[styles.cell, styles.rowTopEdge, styles.cellBottomEdge, { width: `${mergeCol.width}%`, justifyContent: "center", alignItems: "center" }, !hasLeft ? styles.cellLeftEdge : {}]}>
          <Text style={styles.center}>{formatCell(mergeValue)}</Text>
        </View>
        {hasRight && (
          <View style={{ width: `${rightTotal}%` }}>
            {rows.map((row, ri) => (
              <View key={ri} style={[{ flexDirection: "row" }, styles.rowTopEdge]} wrap={false}>
                {rightCols.map((c) => (
                  <View key={c.key} style={[styles.cell, { width: `${(c.width / rightTotal) * 100}%` }, ri === rows.length - 1 ? styles.cellBottomEdge : {}]}>
                    <Text style={c.align === "center" ? styles.center : undefined}>{formatCell(row[c.key])}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
function Footer({ bill }: { bill: ExaminationBillData["billInfo"] }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Chairman</Text>
      <Text>Examination Committee</Text>
      <Text>{buildExamLine(bill)}</Text>
      <Text>RUET, Rajshahi</Text>
    </View>
  );
}
export function BillPdfPages({ bill }: { bill: ExaminationBillData }) {
  const isBacklog = bill.billInfo.examType === "backlog";
  const isThesisApplicable =
    bill.billInfo.examType === "semester" &&
    bill.billInfo.year === "4th Year" &&
    bill.billInfo.semester === "Even";
  const isVerificationApplicable = bill.billInfo.hasGraduatingStudents === "yes";
  const isCourseCoordinatorApplicable =
    bill.billInfo.examType === "semester" &&
    bill.billInfo.year === "4th Year" &&
    (bill.billInfo.semester === "Odd" || bill.billInfo.semester === "Even");
  const isPracticalSurveyingApplicable =
    !isBacklog &&
    bill.billInfo.year === "1st Year" &&
    bill.billInfo.semester === "Even";
  const isMixedEvaluation = bill.billInfo.evaluationSystem === "mixed";
  const isShortSemester = bill.billInfo.examType === "short";
  const obePaperSetterRows = flattenPaperSetter(bill.courseDuties.obe);
  const nonObePaperSetterRows = flattenPaperSetter(bill.courseDuties.nonObe);
  const paperSetterRows = isMixedEvaluation
    ? [...obePaperSetterRows, ...nonObePaperSetterRows]
    : obePaperSetterRows;
  const defaultClassTestStudents = Number(bill.billInfo.totalStudents) || "";
  const obeClassTestRows = flattenClassTest(bill.courseDuties.obe, defaultClassTestStudents, isShortSemester, isShortSemester ? 4 : 2);
  const classTestRows = isMixedEvaluation
    ? combineClassTestRows(
        obeClassTestRows,
        flattenClassTest(bill.courseDuties.nonObe, defaultClassTestStudents, isShortSemester, isShortSemester ? 4 : 2)
      )
    : obeClassTestRows;
  const assignmentRows = isShortSemester ? [] : flattenAssignment(bill.courseDuties.obe);
  const sessionalIsMixed = bill.sessionalEvaluationSystem === "mixed";
  const obeSessionalDuties = bill.sessionalDuties.filter((course) => (course.syllabus ?? "obe") === "obe");
  const nonObeSessionalDuties = bill.sessionalDuties.filter((course) => course.syllabus === "nonObe");
  const visibleSessionalDuties = sessionalIsMixed ? [...obeSessionalDuties, ...nonObeSessionalDuties] : obeSessionalDuties;
  const courseFileRows = isShortSemester ? [] : flattenCourseFile(bill.courseDuties.obe, obeSessionalDuties);
  const obeSessionalRows = flattenSessional(obeSessionalDuties);
  const nonObeSessionalRows = flattenSessional(nonObeSessionalDuties);
  const sessionalRows = sessionalIsMixed ? [...obeSessionalRows, ...nonObeSessionalRows] : obeSessionalRows;
  const mixedSessionalTotal = mixedSessionalStudentTotal(visibleSessionalDuties);
  const sharedStudentTotal = mixedSessionalTotal || bill.tabulationStudentCount;
  const boardVivaRows = flattenBoardViva(
    visibleSessionalDuties,
    bill.vivaBoardTeachers,
    mixedSessionalTotal || Number(bill.billInfo.totalStudents) || "",
    bill.boardVivaMemberOrder ?? [],
  );
  const tabulationRows = flattenTabulation(bill.studentDuties);
  const gradeSheetRows = deriveGradeSheetRows(
    bill.studentDuties,
    String(sharedStudentTotal)
  );
  const allScrutiny = isMixedEvaluation
    ? [...bill.scrutinies.obe, ...bill.scrutinies.nonObe]
    : bill.scrutinies.obe;
  const questionTeachers = bill.questionWorks.filter((teacher) => teacher.name.trim() !== "");
  const questionShare = `${bill.questionWorkTotal || "5"}/${questionTeachers.length || 1}`;
  const obePaperSetterGroups = groupByCourse(obePaperSetterRows);
  const nonObePaperSetterGroups = groupByCourse(nonObePaperSetterRows);
  const classTestGroups = groupByCourse(classTestRows);
  const assignmentGroups = groupByCourse(assignmentRows);
  const courseFileGroups = groupByCourse(courseFileRows);
  const thesisVivaFormula = computeThesisVivaFormula(boardVivaRows, bill.thesisTeachers);
  const lw = bill.layoutSettings;
  const committeeRows = bill.committees.map((m) => ({
    name: m.name,
    designationDept: formatDesignationDept(m.designation, m.department),
    role: m.role,
  }));
  type Section = {
    title: string;
    breakAfterKey: string;
    hasData: boolean;
    content: React.ReactNode | ((sectionNumber: number) => React.ReactNode);
    includeInBacklog: boolean;
  };
  const sections: Section[] = [
    {
      title: "Examination Committee",
      breakAfterKey: "committee",
      hasData: bill.committees.some((m) => m.name.trim() !== ""),
      includeInBacklog: true,
      content: (
        <SimpleTable
          columns={[
            { key: "sl", label: "Sl. No.", width: lw.committee.sl ?? 8, align: "center" },
            { key: "name", label: "Name", width: lw.committee.name ?? 30 },
            { key: "designationDept", label: "Designation & Department", width: lw.committee.designationDept ?? 42 },
            { key: "role", label: "Role", width: lw.committee.role ?? 20, align: "center" },
          ]}
          rows={committeeRows}
          showHeader={false}
        />
      ),
    },
    {
      title: "List of Teachers Associated with Paper Setter & Examiner",
      breakAfterKey: "paperSetterObe",
      hasData: paperSetterRows.length > 0,
      includeInBacklog: true,
      content: (
        <View>
          {isMixedEvaluation && <Text style={styles.subSectionTitle}>2.1 OBE (New Syllabus)</Text>}
          <GroupedTable
            courseWidth={lw.paperSetter.course ?? 18}
            entryColumns={[
              { key: "part", label: "Part", width: lw.paperSetter.part ?? 5, align: "center" },
              { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.paperSetter.teacherLine ?? 55 },
              { key: "paperSetCount", label: "No. of Paper Set", width: lw.paperSetter.paperSetCount ?? 10, align: "center" },
              { key: "scriptExamined", label: "No. of Script Examined", width: lw.paperSetter.scriptExamined ?? 12, align: "center" },
            ]}
            groups={obePaperSetterGroups}
          />
          {isMixedEvaluation && (
            <View break={Boolean(bill.pageBreakAfter?.paperSetterNonObe)}>
              <Text style={styles.subSectionTitle}>2.2 Non-OBE (Old Syllabus)</Text>
              <GroupedTable
                courseWidth={lw.paperSetterNonObe.course ?? 18}
                entryColumns={[
                  { key: "part", label: "Part", width: lw.paperSetterNonObe.part ?? 5, align: "center" },
                  { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.paperSetterNonObe.teacherLine ?? 55 },
                  { key: "paperSetCount", label: "No. of Paper Set", width: lw.paperSetterNonObe.paperSetCount ?? 10, align: "center" },
                  { key: "scriptExamined", label: "No. of Script Examined", width: lw.paperSetterNonObe.scriptExamined ?? 12, align: "center" },
                ]}
                groups={nonObePaperSetterGroups}
              />
            </View>
          )}
        </View>
      ),
    },
    {
      title: "List of Teachers Associated with Class Test",
      breakAfterKey: "classTest",
      hasData: classTestRows.length > 0,
      includeInBacklog: false,
      content: (
        <GroupedTable
          courseWidth={lw.classTest.course ?? 18}
          entryColumns={[
            { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.classTest.teacherLine ?? 62 },
            { key: "classTestCount", label: "No. of Class Test", width: lw.classTest.classTestCount ?? 10, align: "center" },
            { key: "students", label: "No. of Students", width: lw.classTest.students ?? 10, align: "center" },
          ]}
          groups={classTestGroups}
        />
      ),
    },
    {
      title: "List of Teachers Associated with Assignment",
      breakAfterKey: "assignment",
      hasData: assignmentRows.length > 0,
      includeInBacklog: false,
      content: (
          <GroupedTable
            courseWidth={lw.assignment.course ?? 18}
            entryColumns={[
              { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.assignment.teacherLine ?? 70 },
            ]}
            groups={assignmentGroups}
            groupMergeColumn={{
              key: "assignmentValue",
              label: "No. of Class Assignment",
              width: lw.assignment.assignmentValue ?? 12,
              align: "center",
              value: (group) => group.entries[0]?.assignmentValue,
            }}
          />
      ),
    },
    {
      title: "List of Teachers Associated with Course File",
      breakAfterKey: "courseFile",
      hasData: courseFileRows.length > 0,
      includeInBacklog: false,
      content: (
        <GroupedTable
          courseWidth={lw.courseFile.course ?? 18}
          entryColumns={[
            { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.courseFile.teacherLine ?? 70 },
          ]}
          groups={courseFileGroups}
          groupMergeColumn={{
            key: "count",
            label: "No. of Course File",
            width: lw.courseFile.count ?? 12,
            align: "center",
            value: () => "01",
          }}
        />
      ),
    },
    {
      title: isBacklog
        ? "List of Teachers Associated with Question Typing, Sketching & Printing"
        : "List of Teachers Associated with Question Typing, Sketching, Comparing & Printing",
      breakAfterKey: "questionWork",
      hasData: questionTeachers.length > 0,
      includeInBacklog: true,
      content: (
        <MergedColumnTable
          columns={[
            { key: "sl", label: "Sl. No.", width: lw.questionWork.sl ?? 7, align: "center" },
            { key: "teacherLine", label: "Name of The Teachers & Designation", width: lw.questionWork.teacherLine ?? 78 },
            { key: "questionNumber", label: "No. of Question", width: lw.questionWork.questionNumber ?? 15, align: "center" },
          ]}
          rows={questionTeachers.map((q) => ({
            teacherLine: formatTeacher(q.name, q.designation, q.department),
          }))}
          mergeKey="questionNumber"
          mergeValue={questionShare}
        />
      ),
    },
    {
      title: "List of Teachers Associated with Scrutiny",
      breakAfterKey: "scrutinyObe",
      hasData: allScrutiny.length > 0,
      includeInBacklog: true,
      content: (
        <View>
          {isMixedEvaluation && <Text style={styles.subSectionTitle}>7.1 OBE (New Syllabus)</Text>}
          <SimpleTable
            columns={[
              { key: "sl", label: "Sl. No.", width: lw.scrutinyObe.sl ?? 7, align: "center" },
              { key: "teacherLine", label: "Name of The Teachers & Designation", width: lw.scrutinyObe.teacherLine ?? 78 },
              { key: "scriptCount", label: "No. of Script", width: lw.scrutinyObe.scriptCount ?? 15, align: "center" },
            ]}
            rows={bill.scrutinies.obe.map((s) => ({
              teacherLine: formatTeacher(s.name, s.designation, s.department),
              scriptCount: s.scriptCount,
            }))}
          />
          {isMixedEvaluation && (
            <View break={Boolean(bill.pageBreakAfter?.scrutinyNonObe)}>
              <Text style={styles.subSectionTitle}>7.2 Non-OBE (Old Syllabus)</Text>
              <SimpleTable
                columns={[
                  { key: "sl", label: "Sl. No.", width: lw.scrutinyNonObe.sl ?? 7, align: "center" },
                  { key: "teacherLine", label: "Name of The Teachers & Designation", width: lw.scrutinyNonObe.teacherLine ?? 78 },
                  { key: "scriptCount", label: "No. of Script", width: lw.scrutinyNonObe.scriptCount ?? 15, align: "center" },
                ]}
                rows={bill.scrutinies.nonObe.map((s) => ({
                  teacherLine: formatTeacher(s.name, s.designation, s.department),
                  scriptCount: s.scriptCount,
                }))}
              />
            </View>
          )}
        </View>
      ),
    },
    {
      title: "List of Teachers Associated with Sessional",
      breakAfterKey: "sessionalDuty",
      hasData: sessionalRows.length > 0,
      includeInBacklog: false,
      content: (sectionNumber) => (
        <View>
        {sessionalIsMixed && <Text style={styles.subSectionTitle}>{sectionNumber}.1 OBE (New Syllabus)</Text>}
        <GroupedTable
          courseWidth={lw.sessionalDuty.courseLine ?? 25}
          entryColumns={[
            { key: "credit", label: "Credit", width: lw.sessionalDuty.credit ?? 7, align: "center" },
            { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.sessionalDuty.teacherLine ?? 54 },
          ]}
          groups={groupByCourse(obeSessionalRows)}
          groupedEntryKeys={["credit"]}
          groupMergeColumn={{ key: "students", label: "No. of Students", width: lw.sessionalDuty.students ?? 14, align: "center", value: (group) => group.entries[0]?.students }}
        />
        {sessionalIsMixed && (
          <View>
            <Text style={styles.subSectionTitle}>{sectionNumber}.2 Non-OBE (Old Syllabus)</Text>
            <GroupedTable
              courseWidth={lw.sessionalDuty.courseLine ?? 25}
              entryColumns={[
                { key: "credit", label: "Credit", width: lw.sessionalDuty.credit ?? 7, align: "center" },
                { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.sessionalDuty.teacherLine ?? 54 },
              ]}
              groups={groupByCourse(nonObeSessionalRows)}
              groupedEntryKeys={["credit"]}
              groupMergeColumn={{ key: "students", label: "No. of Students", width: lw.sessionalDuty.students ?? 14, align: "center", value: (group) => group.entries[0]?.students }}
            />
          </View>
        )}
        </View>
      ),
    },
    {
      title: "List of Teachers Associated with Board Viva",
      breakAfterKey: "boardViva",
      hasData: boardVivaRows.length > 0,
      includeInBacklog: true,
      content: (
        <MergedColumnTable
          columns={[
            { key: "sl", label: "Sl. No.", width: lw.boardViva.sl ?? 7, align: "center" },
            { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.boardViva.teacherLine ?? 78 },
            { key: "students", label: "No. of Students", width: lw.boardViva.students ?? 15, align: "center" },
          ]}
          rows={boardVivaRows}
          mergeKey="students"
          mergeValue={mixedSessionalTotal || bill.billInfo.totalStudents || "—"}
        />
      ),
    },
    {
  title: "List of Teachers Associated with Tabulation",
  breakAfterKey: "tabulation",
  hasData: tabulationRows.length > 0,
  includeInBacklog: true,
  content: (
    <MergedColumnTable
      columns={[
        { key: "sl", label: "Sl. No.", width: lw.tabulation.sl ?? 7 },
        { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.tabulation.teacherLine ?? 78 },
        { key: "students", label: "No. of Students", width: lw.tabulation.students ?? 15, align: "center" },
      ]}
      rows={tabulationRows}
      mergeKey="students"
      mergeValue={sharedStudentTotal || "—"}
    />
  ),
},
{
  title: isBacklog
    ? "List of Teachers Associated with Grade Sheet Preparation & Verification"
    : "List of Teachers Associated with Grade Sheet Preparation",
  breakAfterKey: "gradeSheetPreparation",
  hasData: gradeSheetRows.length > 0,
  includeInBacklog: true,
  content: (
    <MergedColumnTable
      columns={[
        { key: "sl", label: "Sl. No.", width: lw.gradeSheetPreparation.sl ?? 7 },
        { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.gradeSheetPreparation.teacherLine ?? 78 },
        { key: "studentsDisplay", label: "No. of Students", width: lw.gradeSheetPreparation.studentsDisplay ?? 15, align: "center" },
      ]}
      rows={gradeSheetRows}
      mergeKey="studentsDisplay"
      mergeValue={gradeSheetRows[0]?.studentsDisplay ?? "—"}
    />
  ),
},
{
  title: "List of Teachers Associated with Grade Sheet Verification",
  breakAfterKey: "gradeSheetVerification",
  hasData: !isBacklog && gradeSheetRows.length > 0,
  includeInBacklog: false,
  content: (
    <MergedColumnTable
      columns={[
        { key: "sl", label: "Sl. No.", width: lw.gradeSheetVerification.sl ?? 7 },
        { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.gradeSheetVerification.teacherLine ?? 78 },
        { key: "studentsDisplay", label: "No. of Students", width: lw.gradeSheetVerification.studentsDisplay ?? 15, align: "center" },
      ]}
      rows={gradeSheetRows}
      mergeKey="studentsDisplay"
      mergeValue={gradeSheetRows[0]?.studentsDisplay ?? "—"}
    />
  ),
},
    {
      title: "List of Course Advisers",
      breakAfterKey: "courseAdviser",
      hasData: bill.courseAdvisers.length > 0,
      includeInBacklog: false,
      content: (
        <MergedColumnTable
          columns={[
            { key: "sl", label: "Sl. No.", width: lw.courseAdviser.sl ?? 7, align: "center" },
            { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.courseAdviser.teacherLine ?? 78 },
            { key: "students", label: "No. of Students", width: lw.courseAdviser.students ?? 15, align: "center" },
          ]}
          rows={bill.courseAdvisers.map((a) => ({
            teacherLine: formatTeacher(a.name, a.designation, a.department),
          }))}
          mergeKey="students"
          mergeValue={
            formatCourseAdviserStudents(
              bill.courseAdviserStudentCount,
              bill.courseAdvisers.filter((a) => a.name.trim()).length
            ) || "—"
          }
          keepTogether
        />
      ),
    },
    {
      title: "List of Teachers Associated with Course Coordinator",
      breakAfterKey: "courseCoordinator",
      hasData: isCourseCoordinatorApplicable && bill.courseCoordinatorTeachers.length > 0,
      includeInBacklog: false,
      content: (
        <SimpleTable
          columns={[
            { key: "sl", label: "Sl. No.", width: lw.courseCoordinator.sl ?? 10, align: "center" },
            { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.courseCoordinator.teacherLine ?? 90 },
          ]}
          rows={bill.courseCoordinatorTeachers.map((t) => ({
            teacherLine: formatTeacher(t.name, t.designation, t.department),
          }))}
        />
      ),
    },
    {
      title: "List of Teachers Associated with Thesis/Project Examination",
      breakAfterKey: "thesis",
      hasData: isThesisApplicable && bill.thesisTeachers.length > 0,
      includeInBacklog: false,
      content: (
        <MergedColumnTable
          columns={[
            { key: "sl", label: "Sl. No.", width: lw.thesis.sl ?? 7 },
            { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.thesis.teacherLine ?? 57 },
            { key: "supervisorCount", label: "Supervisor", width: lw.thesis.supervisorCount ?? 10, align: "center" },
            { key: "examinerCount", label: "Thesis Examiner", width: lw.thesis.examinerCount ?? 15, align: "center" },
            { key: "thesisViva", label: "Thesis Viva", width: lw.thesis.thesisViva ?? 11, align: "center" },
          ]}
          rows={bill.thesisTeachers.map((t) => ({
            teacherLine: formatTeacher(t.name, t.designation, t.department),
            supervisorCount: t.supervisorCount,
            examinerCount: t.examinerCount,
          }))}
          mergeKey="thesisViva"
          mergeValue={thesisVivaFormula || "—"}
        />
      ),
    },
    {
      title: "List of Teachers Associated with Verification of Final Result",
      breakAfterKey: "verification",
      hasData: isVerificationApplicable && bill.verificationTeachers.length > 0,
      includeInBacklog: true,
      content: (
        <MergedColumnTable
          columns={[
            { key: "sl", label: "Sl. No.", width: lw.verification.sl ?? 10 },
            { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.verification.teacherLine ?? 76 },
            { key: "students", label: "No. of Students", width: lw.verification.students ?? 14, align: "center" },
          ]}
          rows={bill.verificationTeachers.map((t) => ({
            teacherLine: formatTeacher(t.name, t.designation, t.department),
          }))}
          mergeKey="students"
          mergeValue={
            bill.verificationStudentCount
              ? `${bill.verificationStudentCount}/${bill.verificationTeachers.filter((teacher) => teacher.name.trim()).length || 1}`
              : "—"
          }
        />
      ),
    },
    {
      title: "List of Teachers Associated with Practical Surveying (CE 1226)",
      breakAfterKey: "practicalSurveying",
      hasData:
        isPracticalSurveyingApplicable &&
        bill.practicalSurveyingTeachers.some((teacher) => teacher.name.trim()),
      includeInBacklog: false,
      content: (
        <MergedColumnTable
          columns={[
            { key: "sl", label: "SL No.", width: lw.practicalSurveying.sl ?? 7, align: "center" },
            { key: "teacherLine", label: "Name of Teachers & Designation", width: lw.practicalSurveying.teacherLine ?? 79 },
            { key: "students", label: "No. of Students", width: lw.practicalSurveying.students ?? 14, align: "center" },
          ]}
          rows={bill.practicalSurveyingTeachers
            .filter((teacher) => teacher.name.trim())
            .map((teacher) => ({
              teacherLine: formatTeacher(
                teacher.name,
                teacher.designation,
                teacher.department
              ),
            }))}
          mergeKey="students"
          mergeValue={`${bill.practicalSurveyingStudentCount || "27"}/${
            bill.practicalSurveyingTeachers.filter((teacher) => teacher.name.trim()).length || 1
          }`}
          keepTogether
        />
      ),
    },
  ];
  const sectionOrder = bill.sectionOrder ?? [];
  const orderedSections = [...sections].sort((a, b) => {
    if (a.breakAfterKey === "committee") return -1;
    if (b.breakAfterKey === "committee") return 1;
    const ai = sectionOrder.indexOf(a.breakAfterKey);
    const bi = sectionOrder.indexOf(b.breakAfterKey);
    return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
  });
  const visible = orderedSections.filter((s) => {
    if (!s.hasData) return false;
    if (isBacklog && !s.includeInBacklog) return false;
    return true;
  });
  return (
      <Page
        size="LEGAL"
        style={[
          styles.page,
          { paddingBottom: Math.max(45, bill.layoutSpacing?.footerArea ?? 68) },
        ]}
        wrap
      >
        <View style={styles.billNo}>
          <Text>Bill No.: {bill.billInfo.billNo || "—"}</Text>
        </View>
        <View style={styles.headerBlock}>
          <Text style={styles.scriptLine}>Heaven’s Light is Our Guide</Text>
          <Text style={styles.deptLine}>Department of Building Engineering &amp; Construction Management</Text>
          <Text style={styles.deptLine}>Rajshahi University of Engineering &amp; Technology</Text>
          <Text style={styles.titleLine}>
            {bill.billInfo.examination || "B.Sc. Engineering"} {bill.billInfo.year}{" "}
            {bill.billInfo.examType === "semester" ? `${bill.billInfo.semester} Semester Examination` : bill.billInfo.examType === "short" ? "Short Semester" : "Backlog Examination"}{" "}
            {bill.billInfo.examYear} (Series {bill.billInfo.series})
          </Text>
        </View>
        {visible.map((section, i) => (
          <View
            key={section.title}
            style={{ marginBottom: 0 }}
            break={Boolean(bill.pageBreakAfter?.[section.breakAfterKey])}
          >
            <Text style={styles.sectionTitle}>
              {i + 1}. {section.title}
            </Text>
            {typeof section.content === "function" ? section.content(i + 1) : section.content}
            <View
              style={{
                height: Math.max(
                  0,
                  bill.tableSpacing?.[section.breakAfterKey] ??
                    bill.layoutSpacing?.sectionGap ??
                    0
                ),
              }}
            />
          </View>
        ))}
        <Footer bill={bill.billInfo} />
      </Page>
  );
}

export default function BillPdfDocument({ bill }: { bill: ExaminationBillData }) {
  return (
    <Document>
      <BillPdfPages bill={bill} />
    </Document>
  );
}
