"use client";
import { useEffect, useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { academicYears, departmentName, oldStudentPromotionForExam, semesters, type OldStudentRecord, type StudentDirectoryRecord } from "@/lib/storage/studentDirectory";
import { cohortSeries } from "@/lib/storage/studentEligibility";
import type { SyllabusSegment } from "@/lib/storage/syllabuses";
import { loadResultSection, saveResultSection } from "@/lib/storage/resultSections";
import { formatTabulatorDate } from "@/lib/storage/tabulators";
import { loadExamCommittees, type ExamCommitteeRecord } from "@/lib/storage/examCommittees";
import { completionStatus, GRADUATION_CREDIT, NON_OBE_GRADUATION_CREDIT, usesLegacyResultFormat } from "@/lib/resultFormatPolicy";

type ArchiveStudent = { studentId: string; rollNo: string; earnedCredit: number; gradePoints: number; sgpa: string; failedSubjects: string[]; registerAgain: string[] };
type PreparedMark = { studentId: string; present: boolean; withheld: boolean; partA: string; partB: string; classTestAttendance: string; sessional?: string };
type PreparedCourse = { examYear: string; academicYear: string; semester: string; courseId: string; students: PreparedMark[] };
type EligibilityRecord = { examYear: string; academicYear: string; semester: string; courseId: string; students: Array<{ studentId: string; eligible: boolean }> };
type VivaRecord = { examYear: string; academicYear: string; semester: string; students: Array<{ id: string; marks: string; present: boolean }> };
type BacklogMark = { studentId: string; rollNo?: string; examYear: string; courseCode: string; marks: string; result?: "Pass" | "Fail" };
type MarkSheetArchive = { examYear: string; academicYear: string; semester: string; series: string; students: ArchiveStudent[]; updatedAt?: string };
type ResultHistoryStudent = { studentId: string; failedSubjects: string[]; registerAgain: string[]; totalEarnedCredit: number; totalGradePoints: number; cgpa: string };
type ResultHistory = { examYear: string; academicYear: string; semester: string; series: string; committeeId?: string; examDate?: string; memoNo?: string; memoDate?: string; resultPublishDate?: string; students: ResultHistoryStudent[]; updatedAt: string };
type Props = { title: string };
type SummaryRow = { student: StudentDirectoryRecord; degreeCredit: number; semesterPoints: number; semesterCredit: number; totalPoints: number; totalCredit: number; sgpa: number; cgpa: number; failed: string[]; register: string[]; currentFailed: string[]; currentRegister: string[]; historicalFailed: string[]; historicalRegister: string[] };

const order: Record<string, number> = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 };
const ordinal: Record<string, string> = { "1st": "1st", "2nd": "2nd", "3rd": "3rd", "4th": "4th" };
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
const cumulativeFailed = (row: SummaryRow) => unique([...row.historicalFailed, ...row.failed]);
const cumulativeRegister = (row: SummaryRow) => unique([...row.historicalRegister, ...row.register]);
const normalizedRoll = (value: string) => value.replace(/\s/g, "").toLowerCase();
const rollSeries = (rollNo: string) => rollNo.trim().slice(0, 2);
const gradePoints: Record<string, number> = { "A+": 4, A: 3.75, "A-": 3.5, "B+": 3.25, B: 3, "B-": 2.75, "C+": 2.5, C: 2.25, D: 2, F: 0 };
const numeric = (value?: string) => Number(value) || 0;
const roundedTwo = (value: number) => {
  const thousandths = Math.floor((value + 1e-10) * 1000);
  const hundredths = Math.floor(thousandths / 10) + (thousandths % 10 >= 5 ? 1 : 0);
  return (hundredths / 100).toFixed(2);
};
const letterGrade = (score: number, mark: PreparedMark | undefined, theory: boolean) => !mark ? "" : mark.withheld ? "W" : !mark.present || (theory && numeric(mark.partA) + numeric(mark.partB) < 15) ? "F" : score >= 80 ? "A+" : score >= 75 ? "A" : score >= 70 ? "A-" : score >= 65 ? "B+" : score >= 60 ? "B" : score >= 55 ? "B-" : score >= 50 ? "C+" : score >= 45 ? "C" : score >= 40 ? "D" : "F";

export default function AcademicResultSheet({ title }: Props) {
  const currentYear = String(new Date().getFullYear());
  const years = Array.from({ length: Math.max(1, Number(currentYear) - 2018 + 1) }, (_, index) => String(Number(currentYear) - index));
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [oldStudents, setOldStudents] = useState<OldStudentRecord[]>([]);
  const [syllabuses, setSyllabuses] = useState<SyllabusSegment[]>([]);
  const [prepared, setPrepared] = useState<PreparedCourse[]>([]);
  const [eligibility, setEligibility] = useState<EligibilityRecord[]>([]);
  const [vivas, setVivas] = useState<VivaRecord[]>([]);
  const [backlogMarks, setBacklogMarks] = useState<BacklogMark[]>([]);
  const [marksheets, setMarksheets] = useState<MarkSheetArchive[]>([]);
  const [backlogMarksheets, setBacklogMarksheets] = useState<MarkSheetArchive[]>([]);
  const [history, setHistory] = useState<ResultHistory[]>([]);
  const [committees, setCommittees] = useState<ExamCommitteeRecord[]>([]);
  const [selection, setSelection] = useState({ examYear: "2021", academicYear: "1st", semester: "Odd" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const series = cohortSeries(selection.examYear, selection.academicYear);
  const field = "h-10 w-full rounded border border-slate-300 bg-white px-3";

  useEffect(() => {
    Promise.all([
      fetch("/api/students/directory?includeHistorical=true", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body; }),
      loadResultSection<MarkSheetArchive[]>("marks-sheet"),
      loadResultSection<MarkSheetArchive[]>("marks-sheet-backlog"),
      loadResultSection<ResultHistory[]>("result-sheet"),
      loadExamCommittees(),
      fetch("/api/students/old", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body; }),
      fetch("/api/syllabuses", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body; }),
      loadResultSection<PreparedCourse[]>("prepare-result"),
      fetch("/api/student-eligibility", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body; }),
      loadResultSection<VivaRecord[]>("add-viva-marks"),
      loadResultSection<BacklogMark[]>("prepare-result-backlog"),
    ]).then(([studentBody, markRows, backlogMarkRows, resultRows, committeeRows, oldStudentBody, syllabusBody, preparedRows, eligibilityBody, vivaRows, backlogRows]) => {
      setStudents(studentBody.records || []);
      setOldStudents(oldStudentBody.records || []);
      setSyllabuses(syllabusBody.syllabuses || []);
      setPrepared(Array.isArray(preparedRows) ? preparedRows : []);
      setEligibility(eligibilityBody.records || []);
      setVivas(Array.isArray(vivaRows) ? vivaRows : []);
      setBacklogMarks(Array.isArray(backlogRows) ? backlogRows : []);
      setMarksheets(Array.isArray(markRows) ? markRows : []);
      setBacklogMarksheets(Array.isArray(backlogMarkRows) ? backlogMarkRows : []);
      setHistory(Array.isArray(resultRows) ? resultRows : []);
      setCommittees(committeeRows);
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load result-sheet data from Neon."));
  }, []);

  const currentArchive = marksheets.find((item) => item.examYear === selection.examYear && item.academicYear === selection.academicYear && item.semester === selection.semester);
  const committee = committees.find((item) => item.examType === "Regular" && item.examYear === selection.examYear && item.academicYear === selection.academicYear && item.semester === selection.semester);
  const promotedOldStudents = useMemo(() => oldStudents
    .filter((student) => Boolean(oldStudentPromotionForExam(student, selection.examYear, selection.academicYear, selection.semester, "Regular")))
    .sort((left, right) => left.rollNo.localeCompare(right.rollNo, undefined, { numeric: true })), [oldStudents, selection]);
  const cohort = useMemo(() => {
    const appeared = new Set(currentArchive?.students.map((student) => student.studentId) || []);
    const oldIdentityKeys = new Set(promotedOldStudents.flatMap((student) => [`id:${student.id}`, `roll:${normalizedRoll(student.rollNo)}`]));
    const matching = students.filter((student) => appeared.has(student.id) && Number(student.series) >= 2020 && Number(student.series) <= Number(series) && student.year === selection.academicYear && !oldIdentityKeys.has(`id:${student.id}`) && !oldIdentityKeys.has(`roll:${normalizedRoll(student.rollNo)}`));
    const byRoll = new Map<string, StudentDirectoryRecord>();
    matching.forEach((student) => { const key = normalizedRoll(student.rollNo); if (!byRoll.has(key)) byRoll.set(key, student); });
    const regular = [...byRoll.values()];
    const seriesCounts = new Map<string, number>();
    regular.forEach((student) => { const key = rollSeries(student.rollNo); seriesCounts.set(key, (seriesCounts.get(key) || 0) + 1); });
    return regular.sort((left, right) => (seriesCounts.get(rollSeries(right.rollNo)) || 0) - (seriesCounts.get(rollSeries(left.rollNo)) || 0) || left.rollNo.localeCompare(right.rollNo, undefined, { numeric: true }));
  }, [students, series, selection.academicYear, currentArchive, promotedOldStudents]);

  const summaryRows = useMemo<SummaryRow[]>(() => {
    if (!currentArchive) return [];
    const prior = (item: MarkSheetArchive | ResultHistory) => {
      if (item.examYear === selection.examYear && item.academicYear === selection.academicYear && item.semester === selection.semester) return false;
      if (Number(item.examYear) !== Number(selection.examYear)) return Number(item.examYear) < Number(selection.examYear);
      if (order[item.academicYear] !== order[selection.academicYear]) return order[item.academicYear] < order[selection.academicYear];
      return item.semester === "Odd" && selection.semester === "Even";
    };
    const clearedBacklogCodes = (studentId: string, rollNo: string) => new Set(backlogMarks.filter((mark) => Number(mark.examYear) < Number(selection.examYear) && (mark.studentId === studentId || normalizedRoll(mark.rollNo || "") === normalizedRoll(rollNo)) && mark.result !== "Fail" && numeric(mark.marks) >= 40).map((mark) => normalizedRoll(mark.courseCode)));
    const regularRows = cohort.map((student) => {
      const current = currentArchive.students.find((item) => item.studentId === student.id);
      const clearedCodes = clearedBacklogCodes(student.id, student.rollNo);
      const previousMarks = [...marksheets, ...backlogMarksheets].filter(prior).flatMap((archive) => archive.students.filter((item) => item.studentId === student.id || normalizedRoll(item.rollNo || "") === normalizedRoll(student.rollNo)));
      const previousResults = history.filter(prior).flatMap((archive) => archive.students.filter((item) => item.studentId === student.id));
      const semesterCredit = current?.earnedCredit || 0;
      const semesterPoints = current?.gradePoints || 0;
      const previousCredit = previousMarks.reduce((sum, item) => sum + item.earnedCredit, 0);
      const previousPoints = previousMarks.reduce((sum, item) => sum + item.gradePoints, 0);
      const totalCredit = previousCredit + semesterCredit;
      const totalPoints = previousPoints + semesterPoints;
      return {
        student,
        degreeCredit: GRADUATION_CREDIT,
        semesterPoints,
        semesterCredit,
        totalPoints,
        totalCredit,
        sgpa: semesterCredit ? semesterPoints / semesterCredit : 0,
        cgpa: totalCredit ? totalPoints / totalCredit : 0,
        failed: current?.failedSubjects || [],
        register: current?.registerAgain || [],
        currentFailed: current?.failedSubjects || [],
        currentRegister: current?.registerAgain || [],
        historicalFailed: unique(previousResults.flatMap((item) => item.failedSubjects).concat(previousMarks.flatMap((item) => item.failedSubjects))).filter((code) => !clearedCodes.has(normalizedRoll(code))),
        historicalRegister: unique(previousResults.flatMap((item) => item.registerAgain).concat(previousMarks.flatMap((item) => item.registerAgain))).filter((code) => !clearedCodes.has(normalizedRoll(code))),
      };
    });
    const allCourses = syllabuses.flatMap((syllabus) => syllabus.courses);
    const courseCodes = new Map(allCourses.map((course) => [course.id, course.code]));
    const nonObeRows = promotedOldStudents.map((oldStudent): SummaryRow => {
      const promotion = oldStudentPromotionForExam(oldStudent, selection.examYear, selection.academicYear, selection.semester, "Regular");
      const clearedCodes = clearedBacklogCodes(oldStudent.id, oldStudent.rollNo);
      const vivaStudent = vivas.find((record) => record.examYear === selection.examYear && record.academicYear === selection.academicYear && record.semester === selection.semester)?.students.find((student) => student.id === oldStudent.id);
      const viva = vivaStudent?.present ? numeric(vivaStudent.marks) : 0;
      const outcomes = (promotion?.courseIds || []).flatMap((courseId) => {
        const course = allCourses.find((item) => item.id === courseId);
        if (!course) return [];
        const nonEligible = eligibility.find((record) => record.examYear === selection.examYear && record.academicYear === selection.academicYear && record.semester === selection.semester && record.courseId === courseId)?.students.find((student) => student.studentId === oldStudent.id)?.eligible === false;
        const mark = prepared.find((record) => record.examYear === selection.examYear && record.academicYear === selection.academicYear && record.semester === selection.semester && record.courseId === courseId)?.students.find((student) => student.studentId === oldStudent.id);
        const theory = course.type === "Theory";
        const total = mark ? Math.round(theory ? (mark.present ? numeric(mark.partA) + numeric(mark.partB) : 0) + numeric(mark.classTestAttendance) : numeric(mark.sessional) + viva) : 0;
        const letter = nonEligible ? "-" : letterGrade(total, mark, theory);
        const credit = !nonEligible && letter && letter !== "F" && letter !== "W" ? Number(course.credit) : 0;
        return [{ course, nonEligible, letter, credit, points: credit * (gradePoints[letter] || 0) }];
      });
      const semesterCredit = outcomes.reduce((sum, outcome) => sum + outcome.credit, 0);
      const semesterPoints = outcomes.reduce((sum, outcome) => sum + outcome.points, 0);
      const totalCredit = oldStudent.earnedCredit + semesterCredit;
      const totalPoints = oldStudent.gradePoints + semesterPoints;
      const graduated = totalCredit >= NON_OBE_GRADUATION_CREDIT;
      const failedSet = new Set<string>();
      const registerSet = new Set<string>();
      oldStudent.outstandingCourses.forEach((item) => {
        const code = courseCodes.get(item.courseId) || item.courseId;
        const outcome = outcomes.find((value) => value.course.id === item.courseId);
        if (outcome?.credit || ((!outcome || !outcome.letter) && clearedCodes.has(normalizedRoll(code)))) return;
        if (outcome?.nonEligible) registerSet.add(code);
        else if (outcome?.letter === "F" || outcome?.letter === "W") failedSet.add(code);
        else if (item.status === "need-register") registerSet.add(code);
        else failedSet.add(code);
      });
      outcomes.forEach((outcome) => { if (outcome.nonEligible) registerSet.add(outcome.course.code); else if (outcome.letter === "F" || outcome.letter === "W") failedSet.add(outcome.course.code); });
      const currentFailed = outcomes.filter((outcome) => outcome.letter === "F" || outcome.letter === "W").map((outcome) => outcome.course.code);
      const currentRegister = outcomes.filter((outcome) => outcome.nonEligible).map((outcome) => outcome.course.code);
      const failed = graduated ? [] : [...failedSet];
      const register = graduated ? [] : [...registerSet];
      const student: StudentDirectoryRecord = { ...oldStudent, year: selection.academicYear, semester: selection.semester };
      return { student, degreeCredit: NON_OBE_GRADUATION_CREDIT, semesterPoints, semesterCredit, totalPoints, totalCredit, sgpa: semesterCredit ? semesterPoints / semesterCredit : 0, cgpa: totalCredit ? totalPoints / totalCredit : 0, failed, register, currentFailed, currentRegister, historicalFailed: [], historicalRegister: [] };
    });
    return [...regularRows, ...nonObeRows];
  }, [cohort, promotedOldStudents, currentArchive, marksheets, backlogMarksheets, history, selection, syllabuses, prepared, eligibility, vivas, backlogMarks]);

  async function generate() {
    if (!currentArchive) { setMessage("Generate the marksheet for this examination before generating the result sheet."); return; }
    if (!committee) { setMessage("No matching examination committee record found."); return; }
    setBusy(true); setMessage("");
    const legacyFormat = usesLegacyResultFormat(committee.resultPublishDate);
    try {
            const appeared = summaryRows.length;
      const cleared = summaryRows.filter((row) => !row.currentFailed.length && !row.currentRegister.length).length;
      const backlogged = summaryRows.filter((row) => row.currentFailed.length > 0 || row.currentRegister.length > 0).length;
      const completed = summaryRows.filter((row) => row.totalCredit >= row.degreeCredit).length;
      const needRegister = summaryRows.filter((row) => cumulativeRegister(row).length > 0).length;
      const totalHistoricalBacklog = summaryRows.filter((row) => cumulativeFailed(row).length > 0 || cumulativeRegister(row).length > 0).length;
      const record: ResultHistory = { ...selection, series, committeeId: committee.id, examDate: committee.examDate, memoNo: committee.memoNo, memoDate: committee.memoDate, resultPublishDate: committee.resultPublishDate, students: summaryRows.map((row) => ({ studentId: row.student.id, failedSubjects: cumulativeFailed(row), registerAgain: cumulativeRegister(row), totalEarnedCredit: row.totalCredit, totalGradePoints: row.totalPoints, cgpa: roundedTwo(row.cgpa) })), updatedAt: new Date().toISOString() };
      const next = [...history.filter((item) => !(item.examYear === record.examYear && item.academicYear === record.academicYear && item.semester === record.semester)), record];
      setHistory(await saveResultSection("result-sheet", next));

      const { jsPDF } = await import("jspdf");
      const font = async (url: string) => { const response = await fetch(url); if (!response.ok) throw new Error("Unable to load FreeSerif PDF font."); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ""; for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768)); return btoa(binary); };
      const [regular, bold, boldItalic] = await Promise.all([font("/fonts/FreeSerif.ttf"), font("/fonts/FreeSerifBold.ttf"), font("/fonts/FreeSerifBoldItalic.ttf")]);
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      [["FreeSerif.ttf", regular, "normal"], ["FreeSerifBold.ttf", bold, "bold"], ["FreeSerifBoldItalic.ttf", boldItalic, "bolditalic"]].forEach(([name, data, style]) => { doc.addFileToVFS(name, data); doc.addFont(name, "FreeSerif", style); });
      const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), L = 17, R = W - 17;
      const widths = [14, 30, 10, 16, 16, 10, 10, 35, 35];
      function cell(x: number, y: number, w: number, h: number, text: string, isBold = false, size = 7.3, align: "left" | "center" | "right" = "center", horizontalPadding = .7) { doc.setLineWidth(.15); doc.rect(x, y, w, h); doc.setFont("FreeSerif", isBold ? "bold" : "normal"); doc.setFontSize(size); const lines: string[] = doc.splitTextToSize(text, Math.max(1, w - horizontalPadding * 2)); const lineHeight = size * .36, start = y + (h - lines.length * lineHeight) / 2 + lineHeight * .78; lines.forEach((line, index) => doc.text(line, align === "left" ? x + horizontalPadding : align === "right" ? x + w - horizontalPadding : x + w / 2, start + index * lineHeight, { align })); }
      function footer(page: number, total: number | string) { doc.line(L, H - 12, R, H - 12); doc.setFont("FreeSerif", "bolditalic"); doc.setFontSize(7.3); doc.text(`Page ${page} of ${total}`, R, H - 8, { align: "right" }); }
      function headingCell(x: number, y: number, w: number, h: number, text: string) { doc.setLineWidth(.15); doc.rect(x, y, w, h); doc.setFont("FreeSerif", "bold"); const lines = text.split("\n"), baseSize = 9.9; doc.setFontSize(baseSize); const widest = Math.max(...lines.map((line) => doc.getTextWidth(line))), fittedSize = widest > w - 1.4 ? Math.max(7.3, baseSize * (w - 1.4) / widest) : baseSize, lineHeight = fittedSize * .36, start = y + (h - lines.length * lineHeight) / 2 + lineHeight * .78; doc.setFontSize(fittedSize); lines.forEach((line, index) => doc.text(line, x + w / 2, start + index * lineHeight, { align: "center" })); } function tableHeader(y: number) { let x = L; const labels = ["Roll No.", "Student Name", "SGP", "Semester\nEarned\nCredit", "Total\nEarned\nCredit", "SGPA", "CGPA"]; labels.forEach((label, index) => { headingCell(x, y, widths[index], 16, label); x += widths[index]; }); headingCell(x, y, widths[7] + widths[8], 7, "Remarks"); headingCell(x, y + 7, widths[7], 9, legacyFormat ? "Failed Subjects" : "Status"); headingCell(x + widths[7], y + 7, widths[8], 9, "Need to Register\nAgain"); return y + 16; }
      function graduated(value: SummaryRow) { return value.totalCredit >= value.degreeCredit; } function rowValues(value: SummaryRow) { const status = graduated(value) ? completionStatus(value.cgpa, legacyFormat) : cumulativeFailed(value).join(", "); return [value.student.rollNo, value.student.name, value.semesterPoints.toFixed(2), value.semesterCredit.toFixed(2), value.totalCredit.toFixed(2), value.sgpa.toFixed(2), roundedTwo(value.cgpa), status, graduated(value) ? "" : cumulativeRegister(value).join(", ")]; } function rowHeight(value: SummaryRow) {
        doc.setFont("FreeSerif", "normal");
        doc.setFontSize(9.9);
        const values = rowValues(value);
        const measured = values.slice(0, 7).map((text, index) => {
          const lines = doc.splitTextToSize(text, widths[index] - 1.4) as string[];
          return lines.length;
        });
        if (graduated(value)) {
          const lines = doc.splitTextToSize(values[7], widths[7] + widths[8] - 3) as string[];
          measured.push(lines.length);
        } else {
          values.slice(7).forEach((text, index) => {
            const lines = doc.splitTextToSize(text, widths[index + 7] - 3) as string[];
            measured.push(lines.length);
          });
        }
        return Math.max(8, ...measured.map((lines) => lines * 3.56 + 1.2));
      } function row(y: number, value: SummaryRow) { const values = rowValues(value), height = rowHeight(value); let x = L; values.slice(0, 7).forEach((text, index) => { cell(x, y, widths[index], height, text, false, 9.9, index === 1 ? "left" : "center", index === 1 ? 1.5 : .7); x += widths[index]; }); if (graduated(value)) cell(x, y, widths[7] + widths[8], height, values[7], false, 9.9, "center", 1.5); else values.slice(7).forEach((text, index) => { cell(x, y, widths[index + 7], height, text, false, 9.9, "left", 1.5); x += widths[index + 7]; }); return y + height; }
      const actions = ["Registrar, Rajshahi University of Engineering & Technology", "Member Secretary, Academic Council, Rajshahi University of Engineering & Technology", `Chairman, Examination Committee, B.Sc Engineering ${ordinal[selection.academicYear]} Year ${selection.semester} Semester Examination, ${selection.examYear}, Department of ${departmentName} with request to distribute the result sheets to the course advisor(s)`, "Dean, Faculty of Civil Engineering, Rajshahi University of Engineering & Technology", "Director, IQAC, Rajshahi University of Engineering & Technology", "Head of all Departments, Rajshahi University of Engineering & Technology", "Director, Student Welfare's, Rajshahi University of Engineering & Technology", "Comptroller, Rajshahi University of Engineering & Technology", "Librarian, Central Library, Rajshahi University of Engineering & Technology", "All Hall Provosts, Rajshahi University of Engineering & Technology", "Academic/Accounts/Finance, Rajshahi University of Engineering & Technology", "Office-in-charge, Transport/Central Store, Rajshahi University of Engineering & Technology", "All Notice Board, Rajshahi University of Engineering & Technology", "File"];
      const totalPagesToken = "{total_pages_count_string}";
      const dataPages: SummaryRow[][] = []; let pageRows: SummaryRow[] = [], measuredY = 69; for (const value of summaryRows) { const height = rowHeight(value); if (pageRows.length && measuredY + height > H - 14) { dataPages.push(pageRows); pageRows = []; measuredY = 33; } pageRows.push(value); measuredY += height; } dataPages.push(pageRows); const lastDataStart = dataPages.length === 1 ? 69 : 33, lastDataEnd = dataPages[dataPages.length - 1].reduce((position, value) => position + rowHeight(value), lastDataStart), statisticsOnNewPage = lastDataEnd + 7 + 33 > H - 14; let y = 0, currentPage = dataPages.length;
      dataPages.forEach((items, pageIndex) => { if (pageIndex > 0) doc.addPage("a4", "portrait"); if (pageIndex === 0) { doc.setFont("FreeSerif", "normal"); doc.setFontSize(10.5); doc.text(`Date of Examination: ${formatTabulatorDate(committee.examDate)}`, R, 19, { align: "right" }); doc.setFont("FreeSerif", "normal"); doc.text("Heavens Light is Our Guide", W / 2, 24, { align: "center" }); doc.text("Rajshahi University of Engineering & Technology", W / 2, 29, { align: "center" }); doc.text(`Department of ${departmentName}`, W / 2, 34, { align: "center" }); doc.setFont("FreeSerif", "normal"); const introduction = `Subject to the approval of the Syndicate on recommendation of the Academic Council, the result of B.Sc Engineering ${ordinal[selection.academicYear]} Year ${selection.semester} Semester Examination, ${selection.examYear} is published as follows-`; const introductionLines: string[] = doc.splitTextToSize(introduction, R - L); doc.text(introductionLines, L, 42, { align: "justify", maxWidth: R - L, lineHeightFactor: 1.15 }); y = tableHeader(53); } else { y = tableHeader(17); } items.forEach((value) => { y = row(y, value); }); if (pageIndex < dataPages.length - 1 || statisticsOnNewPage) footer(pageIndex + 1, totalPagesToken); });
      if (statisticsOnNewPage) { doc.addPage("a4", "portrait"); currentPage += 1; y = 17; } else { y += 7; } const statWidths = [29, 29, 28, 30, 30, 30], statLabels = ["Nos. of students\nappeared in the\nexam", "Nos. of students\ncleared all\nsubjects", "Nos. of\nbacklogged\nstudents", "Nos. of students\ncompleted the\ndegree", "Need to\nregister again\n(incl. other exam)", "Nos. of total\nbacklogged student\n(incl. other exam)"], statValues = [appeared, cleared, backlogged, completed, needRegister, totalHistoricalBacklog], leftStatisticsWidth = statWidths.slice(0, 4).reduce((sum, width) => sum + width, 0), statisticsTop = y; cell(L, statisticsTop, leftStatisticsWidth, 8, `Statistical Data of ${ordinal[selection.academicYear]} Year ${selection.semester} Semester Examination, ${selection.examYear}`, true, 10.5); let x = L + leftStatisticsWidth; cell(x, statisticsTop, statWidths[4], 25, statLabels[4], true, 10.5); x += statWidths[4]; cell(x, statisticsTop, statWidths[5], 25, statLabels[5], true, 10.5); x = L; statLabels.slice(0, 4).forEach((label, index) => { cell(x, statisticsTop + 8, statWidths[index], 17, label, true, 10.5); x += statWidths[index]; }); x = L; statValues.forEach((value, index) => { cell(x, statisticsTop + 25, statWidths[index], 8, String(value).padStart(2, "0"), false, 10.5); x += statWidths[index]; }); y = statisticsTop + 56; if (y + 23 > H - 14) { footer(currentPage, totalPagesToken); doc.addPage("a4", "portrait"); currentPage += 1; y = 17; } doc.setFont("FreeSerif", "bold"); doc.setFontSize(12); doc.text("Controller of Examinations", R, y, { align: "right" }); doc.text("Rajshahi University of Engineering & Technology", R, y + 6, { align: "right" }); doc.setFontSize(12); doc.text(`Memo No: ${committee.memoNo || ""}`, L, y + 12); doc.text(`Date: ${formatTabulatorDate(committee.memoDate)}`, R, y + 12, { align: "right" }); doc.text("Copy forwarded for necessary action:", L, y + 18); doc.setFont("FreeSerif", "normal");
      doc.setFontSize(10.5); let actionY = y + 23; actions.forEach((action, index) => { const lines: string[] = doc.splitTextToSize(`${index + 1}. ${action}`, R - L), blockHeight = lines.length * 5.2; if (actionY + blockHeight > H - 14) { footer(currentPage, totalPagesToken); doc.addPage("a4", "portrait"); currentPage += 1; actionY = 17; doc.setFont("FreeSerif", "normal"); doc.setFontSize(10.5); } doc.text(lines, L, actionY); actionY += blockHeight; }); if (actionY + 17 > H - 14) { footer(currentPage, totalPagesToken); doc.addPage("a4", "portrait"); currentPage += 1; actionY = 17; } doc.setFont("FreeSerif", "bold"); doc.setFontSize(12); doc.text("Controller of Examinations", R, actionY + 5.2, { align: "right" }); doc.text("Rajshahi University of Engineering & Technology", R, actionY + 11.2, { align: "right" }); footer(currentPage, totalPagesToken); doc.putTotalPages(totalPagesToken);
      doc.save(`result-sheet-${selection.examYear}-${selection.academicYear}-${selection.semester}.pdf`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to generate result sheet."); } finally { setBusy(false); }
  }

  return <section className="min-h-screen bg-[#f7f9fd] p-2 sm:p-4"><div className="border-t border-[#082f57] bg-white"><div className="border-b border-[#082f57] p-4 text-center"><h1 className="text-2xl font-bold">{title}</h1></div><div className="grid gap-4 border-b border-[#082f57] p-5 md:grid-cols-2"><label className="grid items-center gap-2 sm:grid-cols-[180px_1fr]">Department<select disabled className={field}><option>{departmentName}</option></select></label><label className="grid items-center gap-2 sm:grid-cols-[180px_1fr]">Exam Year<select value={selection.examYear} onChange={(event) => setSelection({ ...selection, examYear: event.target.value })} className={field}>{years.map((year) => <option key={year}>{year}</option>)}</select></label><label className="grid items-center gap-2 sm:grid-cols-[180px_1fr]">Academic Year<select value={selection.academicYear} onChange={(event) => setSelection({ ...selection, academicYear: event.target.value })} className={field}>{academicYears.map((year) => <option key={year}>{year}</option>)}</select></label><label className="grid items-center gap-2 sm:grid-cols-[180px_1fr]">Semester<select value={selection.semester} onChange={(event) => setSelection({ ...selection, semester: event.target.value })} className={field}>{semesters.filter((semester) => semester !== "Short Semester").map((semester) => <option key={semester}>{semester}</option>)}</select></label><button disabled={busy} onClick={() => void generate()} className="mx-auto inline-flex w-fit rounded bg-sky-500 px-4 py-2 text-white disabled:opacity-50 md:col-span-2"><FileDown className="mr-2 h-4 w-4"/>{busy ? "Generating..." : "Generate Result Sheet"}</button></div>{message && <p className="m-4 rounded bg-red-50 p-3 text-red-700">{message}</p>}</div></section>;
}
