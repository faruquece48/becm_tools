"use client";
import type { ExaminationBillData } from "../../create/components/types";
import PreviewTable, { PreviewColumn } from "./PreviewTable";
import GroupedCourseTable from "./GroupedCourseTable";
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
} from "../../create/components/pdf/pdfHelpers";

interface Props {
  bill: ExaminationBillData;
}

const committeeCols: PreviewColumn[] = [
  { key: "sl", label: "Sl. No.", align: "center" },
  { key: "name", label: "Name" },
  { key: "designationDept", label: "Designation & Department" },
  { key: "role", label: "Role" },
];
const questionWorkCols: PreviewColumn[] = [
  { key: "sl", label: "Sl. No." },
  { key: "teacherLine", label: "Name of The Teachers & Designation" },
  { key: "questionNumber", label: "No. of Question", align: "center" },
];
const scrutinyCols: PreviewColumn[] = [
  { key: "sl", label: "Sl. No." },
  { key: "teacherLine", label: "Name of The Teachers & Designation" },
  { key: "scriptCount", label: "No. of Script", align: "center" },
];
const listCols: PreviewColumn[] = [
  { key: "sl", label: "Sl. No." },
  { key: "teacherLine", label: "Name of Teachers & Designation" },
  { key: "students", label: "No. of Students", align: "center" },
];
const gradeSheetCols: PreviewColumn[] = [
  { key: "sl", label: "Sl. No." },
  { key: "teacherLine", label: "Name of Teachers & Designation" },
  { key: "studentsDisplay", label: "No. of Students", align: "center" },
];
const courseCoordinatorCols: PreviewColumn[] = [
  { key: "sl", label: "Sl. No." },
  { key: "teacherLine", label: "Name of Teachers & Designation" },
];
const thesisCols: PreviewColumn[] = [
  { key: "sl", label: "Sl. No." },
  { key: "teacherLine", label: "Name of Teachers & Designation" },
  { key: "supervisorCount", label: "Supervisor", align: "center" },
  { key: "examinerCount", label: "Thesis Examiner", align: "center" },
  { key: "thesisViva", label: "Thesis Viva", align: "center" },
];
const verificationCols: PreviewColumn[] = [
  { key: "sl", label: "Sl. No." },
  { key: "teacherLine", label: "Name of Teachers & Designation" },
  { key: "students", label: "No. of Students", align: "center" },
];

export default function PreviewDocument({ bill }: Props) {
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
  const visibleSessionalDuties = sessionalIsMixed
    ? [...obeSessionalDuties, ...nonObeSessionalDuties]
    : obeSessionalDuties;
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

  const committeeRows = bill.committees.map((m) => ({
    name: m.name,
    designationDept: formatDesignationDept(m.designation, m.department),
    role: m.role,
  }));

  type Section = { title: string; hasData: boolean; content: React.ReactNode | ((sectionNumber: number) => React.ReactNode); includeInBacklog: boolean };

  const sections: Section[] = [
    {
      title: "Examination Committee",
      hasData: bill.committees.some((m) => m.name.trim() !== ""),
      includeInBacklog: true,
      content: (
        <PreviewTable
          columns={committeeCols}
          rows={committeeRows}
          widths={bill.layoutSettings.committee}
          showSerial
          showHeader={false}
        />
      ),
    },
    {
      title: "List of Teachers Associated with Paper Setter & Examiner",
      hasData: paperSetterRows.length > 0,
      includeInBacklog: true,
      content: (
        <div className="space-y-4">
          {isMixedEvaluation && <h3 className="font-bold">2.1 OBE (New Syllabus)</h3>}
          <GroupedCourseTable
            entryColumns={[
              { key: "part", label: "Part", align: "center" },
              { key: "teacherLine", label: "Name of Teachers & Designation" },
              { key: "paperSetCount", label: "No. of Paper Set", align: "center" },
              { key: "scriptExamined", label: "No. of Script Examined", align: "center" },
            ]}
            groups={obePaperSetterGroups}
            widths={bill.layoutSettings.paperSetter}
          />
          {isMixedEvaluation && (
            <>
              <h3 className="font-bold">2.2 Non-OBE (Old Syllabus)</h3>
              <GroupedCourseTable
                entryColumns={[
                  { key: "part", label: "Part", align: "center" },
                  { key: "teacherLine", label: "Name of Teachers & Designation" },
                  { key: "paperSetCount", label: "No. of Paper Set", align: "center" },
                  { key: "scriptExamined", label: "No. of Script Examined", align: "center" },
                ]}
                groups={nonObePaperSetterGroups}
                widths={bill.layoutSettings.paperSetterNonObe}
              />
            </>
          )}
        </div>
      ),
    },
    {
      title: "List of Teachers Associated with Class Test",
      hasData: classTestRows.length > 0,
      includeInBacklog: false,
      content: (
        <GroupedCourseTable
          entryColumns={[
            { key: "teacherLine", label: "Name of Teachers & Designation" },
            { key: "classTestCount", label: "No. of Class Test", align: "center" },
            { key: "students", label: "No. of Students", align: "center" },
          ]}
          groups={classTestGroups}
          widths={bill.layoutSettings.classTest}
        />
      ),
    },
    {
      title: "List of Teachers Associated with Assignment",
      hasData: assignmentRows.length > 0,
      includeInBacklog: false,
      content: (
        <GroupedCourseTable
          entryColumns={[
            { key: "teacherLine", label: "Name of Teachers & Designation" },
            { key: "assignmentValue", label: "No. of Class Assignment", align: "center" },
          ]}
          groups={assignmentGroups}
          widths={bill.layoutSettings.assignment}
        />
      ),
    },
    {
      title: "List of Teachers Associated with Course File",
      hasData: courseFileRows.length > 0,
      includeInBacklog: false,
      content: (
        <GroupedCourseTable
          entryColumns={[
            { key: "teacherLine", label: "Name of Teachers & Designation" },
          ]}
          groups={courseFileGroups}
          widths={bill.layoutSettings.courseFile}
          groupMergeColumn={{
            key: "count",
            label: "No. of Course File",
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
      hasData: questionTeachers.length > 0,
      includeInBacklog: true,
      content: (
        <PreviewTable
          columns={questionWorkCols}
          rows={questionTeachers.map((q) => ({
            teacherLine: formatTeacher(q.name, q.designation, q.department),
          }))}
          widths={bill.layoutSettings.questionWork}
          showSerial
          mergeColumnKey="questionNumber"
          mergeValue={questionShare}
        />
      ),
    },
    {
      title: "List of Teachers Associated with Scrutiny",
      hasData: allScrutiny.length > 0,
      includeInBacklog: true,
      content: (
        <div className="space-y-4">
          {isMixedEvaluation && <h3 className="font-bold">7.1 OBE (New Syllabus)</h3>}
          <PreviewTable
            columns={scrutinyCols}
            rows={bill.scrutinies.obe.map((s) => ({
              teacherLine: formatTeacher(s.name, s.designation, s.department),
              scriptCount: s.scriptCount,
            }))}
            widths={bill.layoutSettings.scrutinyObe}
            showSerial
          />
          {isMixedEvaluation && (
            <>
              <h3 className="font-bold">7.2 Non-OBE (Old Syllabus)</h3>
              <PreviewTable
                columns={scrutinyCols}
                rows={bill.scrutinies.nonObe.map((s) => ({
                  teacherLine: formatTeacher(s.name, s.designation, s.department),
                  scriptCount: s.scriptCount,
                }))}
                widths={bill.layoutSettings.scrutinyNonObe}
                showSerial
              />
            </>
          )}
        </div>
      ),
    },
    {
      title: "List of Teachers Associated with Sessional",
      hasData: sessionalRows.length > 0,
      includeInBacklog: false,
      content: (sectionNumber) => (
        <div className="space-y-4">
        {sessionalIsMixed && <h3 className="font-bold">{sectionNumber}.1 OBE (New Syllabus)</h3>}
        <GroupedCourseTable
          entryColumns={[
            { key: "credit", label: "Credit", align: "center" },
            { key: "teacherLine", label: "Name of Teachers & Designation" },
          ]}
          groups={groupByCourse(obeSessionalRows)}
          widths={{
            course: bill.layoutSettings.sessionalDuty.courseLine ?? 30,
            credit: bill.layoutSettings.sessionalDuty.credit ?? 8,
            teacherLine: bill.layoutSettings.sessionalDuty.teacherLine ?? 52,
            students: bill.layoutSettings.sessionalDuty.students ?? 10,
          }}
          groupedEntryKeys={["credit"]}
          groupMergeColumn={{ key: "students", label: "No. of Students", align: "center", value: (group) => group.entries[0]?.students }}
        />
        {sessionalIsMixed && (
          <>
            <h3 className="font-bold">{sectionNumber}.2 Non-OBE (Old Syllabus)</h3>
            <GroupedCourseTable
              entryColumns={[
                { key: "credit", label: "Credit", align: "center" },
                { key: "teacherLine", label: "Name of Teachers & Designation" },
              ]}
              groups={groupByCourse(nonObeSessionalRows)}
              widths={{
                course: bill.layoutSettings.sessionalDuty.courseLine ?? 30,
                credit: bill.layoutSettings.sessionalDuty.credit ?? 8,
                teacherLine: bill.layoutSettings.sessionalDuty.teacherLine ?? 52,
                students: bill.layoutSettings.sessionalDuty.students ?? 10,
              }}
              groupedEntryKeys={["credit"]}
              groupMergeColumn={{ key: "students", label: "No. of Students", align: "center", value: (group) => group.entries[0]?.students }}
            />
          </>
        )}
        </div>
      ),
    },
    {
      title: "List of Teachers Associated with Board Viva",
      hasData: boardVivaRows.length > 0,
      includeInBacklog: true,
      content: <PreviewTable columns={listCols} rows={boardVivaRows} widths={bill.layoutSettings.boardViva} showSerial mergeColumnKey="students" mergeValue={mixedSessionalTotal || bill.billInfo.totalStudents || "—"} />,
    },
    {
      title: "List of Teachers Associated with Tabulation",
      hasData: tabulationRows.length > 0,
      includeInBacklog: true,
      content: (
        <PreviewTable
          columns={listCols}
          rows={tabulationRows}
          widths={bill.layoutSettings.tabulation}
          showSerial
          mergeColumnKey="students"
          mergeValue={sharedStudentTotal || "—"}
        />
      ),
    },
    {
      title: isBacklog
        ? "List of Teachers Associated with Grade Sheet Preparation & Verification"
        : "List of Teachers Associated with Grade Sheet Preparation",
      hasData: gradeSheetRows.length > 0,
      includeInBacklog: true,
      content: (
        <PreviewTable
          columns={gradeSheetCols}
          rows={gradeSheetRows}
          widths={bill.layoutSettings.gradeSheetPreparation}
          showSerial
          mergeColumnKey="studentsDisplay"
          mergeValue={gradeSheetRows[0]?.studentsDisplay ?? "—"}
        />
      ),
    },
    {
      title: "List of Teachers Associated with Grade Sheet Verification",
      hasData: !isBacklog && gradeSheetRows.length > 0,
      includeInBacklog: false,
      content: (
        <PreviewTable
          columns={gradeSheetCols}
          rows={gradeSheetRows}
          widths={bill.layoutSettings.gradeSheetVerification}
          showSerial
          mergeColumnKey="studentsDisplay"
          mergeValue={gradeSheetRows[0]?.studentsDisplay ?? "—"}
        />
      ),
    },
    {
      title: "List of Course Advisers",
      hasData: bill.courseAdvisers.length > 0,
      includeInBacklog: false,
      content: (
        <PreviewTable
          columns={listCols}
          rows={bill.courseAdvisers.map((a) => ({
            teacherLine: formatTeacher(a.name, a.designation, a.department),
          }))}
          widths={bill.layoutSettings.courseAdviser}
          showSerial
          mergeColumnKey="students"
          mergeValue={
            formatCourseAdviserStudents(
              bill.courseAdviserStudentCount,
              bill.courseAdvisers.filter((a) => a.name.trim()).length
            ) || "—"
          }
        />
      ),
    },
    {
      title: "List of Teachers Associated with Course Coordinator",
      hasData: isCourseCoordinatorApplicable && bill.courseCoordinatorTeachers.length > 0,
      includeInBacklog: false,
      content: (
        <PreviewTable
          columns={courseCoordinatorCols}
          rows={bill.courseCoordinatorTeachers.map((t) => ({
            teacherLine: formatTeacher(t.name, t.designation, t.department),
          }))}
          widths={bill.layoutSettings.courseCoordinator}
          showSerial
        />
      ),
    },
    {
      title: "List of Teachers Associated with Thesis/Project Examination",
      hasData: isThesisApplicable && bill.thesisTeachers.length > 0,
      includeInBacklog: false,
      content: (
        <PreviewTable
          columns={thesisCols}
          rows={bill.thesisTeachers.map((t) => ({
            teacherLine: formatTeacher(t.name, t.designation, t.department),
            supervisorCount: t.supervisorCount,
            examinerCount: t.examinerCount,
          }))}
          widths={bill.layoutSettings.thesis}
          showSerial
          mergeColumnKey="thesisViva"
          mergeValue={thesisVivaFormula || "—"}
        />
      ),
    },
    {
      title: "List of Teachers Associated with Verification of Final Result",
      hasData: isVerificationApplicable && bill.verificationTeachers.length > 0,
      includeInBacklog: true,
      content: (
        <PreviewTable
          columns={verificationCols}
          rows={bill.verificationTeachers.map((t) => ({
            teacherLine: formatTeacher(t.name, t.designation, t.department),
          }))}
          widths={bill.layoutSettings.verification}
          showSerial
          mergeColumnKey="students"
          mergeValue={
            bill.verificationStudentCount
              ? `${bill.verificationStudentCount}/${bill.verificationTeachers.filter((teacher) => teacher.name.trim()).length || 1}`
              : "—"
          }
        />
      ),
    },
  ];

  const visible = sections.filter((s) => {
    if (!s.hasData) return false;
    if (isBacklog && !s.includeInBacklog) return false;
    return true;
  });

  return (
    <div className="w-full rounded-xl border bg-white p-6 shadow-sm space-y-8">
      <div className="text-center space-y-1">
        <p className="italic" style={{ fontFamily: "'Monotype Corsiva', cursive", fontSize: 10 }}>
          Heaven’s Light is Our Guide
        </p>
        <p className="text-[11px]">Department of Building Engineering &amp; Construction Management</p>
        <p className="text-[11px]">Rajshahi University of Engineering &amp; Technology</p>
        <p className="mt-1 text-[11px] font-bold">
          {bill.billInfo.examination || "B.Sc. Engineering"} {bill.billInfo.year}{" "}
          {bill.billInfo.examType === "semester" ? `${bill.billInfo.semester} Semester Examination` : bill.billInfo.examType === "short" ? "Short Semester" : "Backlog Examination"}{" "}
          {bill.billInfo.examYear} (Series {bill.billInfo.series})
        </p>
      </div>
      {visible.length === 0 && (
        <p className="text-center text-sm text-gray-400">No section data entered yet.</p>
      )}
      {visible.map((section, i) => (
        <div key={section.title} className="w-full space-y-2 text-[11px]">
          <h2 className="text-lg font-bold">
            {i + 1}. {section.title}
          </h2>
          {typeof section.content === "function" ? section.content(i + 1) : section.content}
        </div>
      ))}
      <div className="mt-8 border-t pt-3 text-center text-[11px] text-gray-500">
        <p className="italic">↓ This footer repeats on every PDF page ↓</p>
        <p>Chairman</p>
        <p>Examination Committee</p>
        <p>{buildExamLine(bill.billInfo)}</p>
        <p>RUET, Rajshahi</p>
      </div>
    </div>
  );
}
