"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { academicYears, departmentName, semesters, type StudentDirectoryRecord } from "@/lib/storage/studentDirectory";
import { cohortSeries } from "@/lib/storage/studentEligibility";
import { loadResultSection, saveResultSection } from "@/lib/storage/resultSections";
import { formatTabulatorDate } from "@/lib/storage/tabulators";
import { loadExamCommittees, type ExamCommitteeRecord } from "@/lib/storage/examCommittees";
import { completionStatus, GRADUATION_CREDIT, usesLegacyResultFormat } from "@/lib/resultFormatPolicy";

type ArchiveStudent = { studentId: string; rollNo: string; earnedCredit: number; gradePoints: number; sgpa: string; failedSubjects: string[]; registerAgain: string[] };
type MarkSheetArchive = { examYear: string; academicYear: string; semester: string; series: string; students: ArchiveStudent[]; updatedAt?: string };
type ResultHistoryStudent = { studentId: string; failedSubjects: string[]; registerAgain: string[]; totalEarnedCredit: number; totalGradePoints: number; cgpa: string };
type ResultHistory = { examYear: string; academicYear: string; semester: string; series: string; committeeId?: string; examDate?: string; memoNo?: string; memoDate?: string; resultPublishDate?: string; students: ResultHistoryStudent[]; updatedAt: string };
type Props = { title: string };
type SummaryRow = { student: StudentDirectoryRecord; semesterPoints: number; semesterCredit: number; totalPoints: number; totalCredit: number; sgpa: number; cgpa: number; failed: string[]; register: string[]; historicalFailed: string[]; historicalRegister: string[] };

const order: Record<string, number> = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 };
const ordinal: Record<string, string> = { "1st": "1st", "2nd": "2nd", "3rd": "3rd", "4th": "4th" };
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
const cumulativeFailed = (row: SummaryRow) => unique([...row.historicalFailed, ...row.failed]);
const cumulativeRegister = (row: SummaryRow) => unique([...row.historicalRegister, ...row.register]);

export default function AcademicResultSheet({ title }: Props) {
  const currentYear = String(new Date().getFullYear());
  const years = Array.from({ length: Math.max(1, Number(currentYear) - 2018 + 1) }, (_, index) => String(Number(currentYear) - index));
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [marksheets, setMarksheets] = useState<MarkSheetArchive[]>([]);
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
      loadResultSection<ResultHistory[]>("result-sheet"),
      loadExamCommittees(),
    ]).then(([studentBody, markRows, resultRows, committeeRows]) => {
      setStudents(studentBody.records || []);
      setMarksheets(Array.isArray(markRows) ? markRows : []);
      setHistory(Array.isArray(resultRows) ? resultRows : []);
      setCommittees(committeeRows);
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load result-sheet data from Neon."));
  }, []);

  const currentArchive = marksheets.find((item) => item.examYear === selection.examYear && item.academicYear === selection.academicYear && item.semester === selection.semester);
  const committee = committees.find((item) => item.examType === "Regular" && item.examYear === selection.examYear && item.academicYear === selection.academicYear && item.semester === selection.semester);
  const cohort = useMemo(() => {
    const appeared = new Set(currentArchive?.students.map((student) => student.studentId) || []);
    return students.filter((student) => appeared.has(student.id) && Number(student.series) <= Number(series) && student.year === selection.academicYear && student.semester === selection.semester)
      .sort((left, right) => (left.series === series ? 0 : 1) - (right.series === series ? 0 : 1) || left.rollNo.localeCompare(right.rollNo, undefined, { numeric: true }));
  }, [students, series, selection.academicYear, selection.semester, currentArchive]);

  const summaryRows = useMemo<SummaryRow[]>(() => {
    if (!currentArchive) return [];
    const prior = (item: MarkSheetArchive | ResultHistory) => {
      if (item.examYear === selection.examYear && item.academicYear === selection.academicYear && item.semester === selection.semester) return false;
      if (Number(item.examYear) !== Number(selection.examYear)) return Number(item.examYear) < Number(selection.examYear);
      if (order[item.academicYear] !== order[selection.academicYear]) return order[item.academicYear] < order[selection.academicYear];
      return item.semester === "Odd" && selection.semester === "Even";
    };
    return cohort.map((student) => {
      const current = currentArchive.students.find((item) => item.studentId === student.id);
      const previousMarks = marksheets.filter(prior).flatMap((archive) => archive.students.filter((item) => item.studentId === student.id));
      const previousResults = history.filter(prior).flatMap((archive) => archive.students.filter((item) => item.studentId === student.id));
      const semesterCredit = current?.earnedCredit || 0;
      const semesterPoints = current?.gradePoints || 0;
      const previousCredit = previousMarks.reduce((sum, item) => sum + item.earnedCredit, 0);
      const previousPoints = previousMarks.reduce((sum, item) => sum + item.gradePoints, 0);
      const totalCredit = previousCredit + semesterCredit;
      const totalPoints = previousPoints + semesterPoints;
      return {
        student,
        semesterPoints,
        semesterCredit,
        totalPoints,
        totalCredit,
        sgpa: semesterCredit ? semesterPoints / semesterCredit : 0,
        cgpa: totalCredit ? totalPoints / totalCredit : 0,
        failed: current?.failedSubjects || [],
        register: current?.registerAgain || [],
        historicalFailed: unique(previousResults.flatMap((item) => item.failedSubjects).concat(previousMarks.flatMap((item) => item.failedSubjects))),
        historicalRegister: unique(previousResults.flatMap((item) => item.registerAgain).concat(previousMarks.flatMap((item) => item.registerAgain))),
      };
    });
  }, [cohort, currentArchive, marksheets, history, selection]);

  async function generate() {
    if (!currentArchive) { setMessage("Generate the marksheet for this examination before generating the result sheet."); return; }
    if (!committee) { setMessage("No matching examination committee record found."); return; }
    setBusy(true); setMessage("");
    const legacyFormat = usesLegacyResultFormat(committee.resultPublishDate);
    try {
            const appeared = summaryRows.length;
      const cleared = summaryRows.filter((row) => !row.failed.length && !row.register.length).length;
      const backlogged = summaryRows.filter((row) => row.failed.length > 0 || row.register.length > 0).length;
      const completed = summaryRows.filter((row) => row.totalCredit >= GRADUATION_CREDIT).length;
      const needRegister = summaryRows.filter((row) => cumulativeRegister(row).length > 0).length;
      const totalHistoricalBacklog = summaryRows.filter((row) => cumulativeFailed(row).length > 0 || cumulativeRegister(row).length > 0).length;
      const record: ResultHistory = { ...selection, series, committeeId: committee.id, examDate: committee.examDate, memoNo: committee.memoNo, memoDate: committee.memoDate, resultPublishDate: committee.resultPublishDate, students: summaryRows.map((row) => ({ studentId: row.student.id, failedSubjects: cumulativeFailed(row), registerAgain: cumulativeRegister(row), totalEarnedCredit: row.totalCredit, totalGradePoints: row.totalPoints, cgpa: row.cgpa.toFixed(2) })), updatedAt: new Date().toISOString() };
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
      function footer(page: number, total: number) { doc.line(L, H - 12, R, H - 12); doc.setFont("FreeSerif", "bolditalic"); doc.setFontSize(7.3); doc.text(`Page ${page} of ${total}`, R, H - 8, { align: "right" }); }
      function headingCell(x: number, y: number, w: number, h: number, text: string) { doc.setLineWidth(.15); doc.rect(x, y, w, h); doc.setFont("FreeSerif", "bold"); const lines = text.split("\n"), baseSize = 9.9; doc.setFontSize(baseSize); const widest = Math.max(...lines.map((line) => doc.getTextWidth(line))), fittedSize = widest > w - 1.4 ? Math.max(7.3, baseSize * (w - 1.4) / widest) : baseSize, lineHeight = fittedSize * .36, start = y + (h - lines.length * lineHeight) / 2 + lineHeight * .78; doc.setFontSize(fittedSize); lines.forEach((line, index) => doc.text(line, x + w / 2, start + index * lineHeight, { align: "center" })); } function tableHeader(y: number) { let x = L; const labels = ["Roll No.", "Student Name", "SGP", "Semester\nEarned\nCredit", "Total\nEarned\nCredit", "SGPA", "CGPA"]; labels.forEach((label, index) => { headingCell(x, y, widths[index], 16, label); x += widths[index]; }); headingCell(x, y, widths[7] + widths[8], 7, "Remarks"); headingCell(x, y + 7, widths[7], 9, legacyFormat ? "Failed Subjects" : "Status"); headingCell(x + widths[7], y + 7, widths[8], 9, "Need to Register\nAgain"); return y + 16; }
      function graduated(value: SummaryRow) { return value.totalCredit >= GRADUATION_CREDIT; } function rowValues(value: SummaryRow) { const status = graduated(value) ? completionStatus(value.cgpa, legacyFormat) : cumulativeFailed(value).join(", "); return [value.student.rollNo, value.student.name, value.semesterPoints.toFixed(2), value.semesterCredit.toFixed(2), value.totalCredit.toFixed(2), value.sgpa.toFixed(2), value.cgpa.toFixed(2), status, graduated(value) ? "" : cumulativeRegister(value).join(", ")]; } function rowHeight(value: SummaryRow) {
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
      const dataPages: SummaryRow[][] = []; let pageRows: SummaryRow[] = [], measuredY = 69; for (const value of summaryRows) { const height = rowHeight(value); if (pageRows.length && measuredY + height > H - 14) { dataPages.push(pageRows); pageRows = []; measuredY = 33; } pageRows.push(value); measuredY += height; } dataPages.push(pageRows); const lastDataStart = dataPages.length === 1 ? 69 : 33, lastDataEnd = dataPages[dataPages.length - 1].reduce((position, value) => position + rowHeight(value), lastDataStart), statisticsOnNewPage = lastDataEnd > 112, pages = dataPages.length + (statisticsOnNewPage ? 1 : 0); let y = 0;
      dataPages.forEach((items, pageIndex) => { if (pageIndex > 0) doc.addPage("a4", "portrait"); if (pageIndex === 0) { doc.setFont("FreeSerif", "normal"); doc.setFontSize(10.5); doc.text(`Date of Examination: ${formatTabulatorDate(committee.examDate)}`, R, 19, { align: "right" }); doc.setFont("FreeSerif", "normal"); doc.text("Heavens Light is Our Guide", W / 2, 24, { align: "center" }); doc.text("Rajshahi University of Engineering & Technology", W / 2, 29, { align: "center" }); doc.text(`Department of ${departmentName}`, W / 2, 34, { align: "center" }); doc.setFont("FreeSerif", "normal"); const introduction = `Subject to the approval of the Syndicate on recommendation of the Academic Council, the result of B.Sc Engineering ${ordinal[selection.academicYear]} Year ${selection.semester} Semester Examination, ${selection.examYear} is published as follows-`; const introductionLines: string[] = doc.splitTextToSize(introduction, R - L); doc.text(introductionLines, L, 42, { align: "justify", maxWidth: R - L, lineHeightFactor: 1.15 }); y = tableHeader(53); } else { y = tableHeader(17); } items.forEach((value) => { y = row(y, value); }); if (pageIndex < dataPages.length - 1 || statisticsOnNewPage) footer(pageIndex + 1, pages); });
      if (statisticsOnNewPage) { doc.addPage("a4", "portrait"); y = 17; } else { y += 7; } const statWidths = [29, 29, 28, 30, 30, 30], statLabels = ["Nos. of students\nappeared in the\nexam", "Nos. of students\ncleared all\nsubjects", "Nos. of\nbacklogged\nstudents", "Nos. of students\ncompleted the\ndegree", "Need to\nregister again\n(incl. other exam)", "Nos. of total\nbacklogged student\n(incl. other exam)"], statValues = [appeared, cleared, backlogged, completed, needRegister, totalHistoricalBacklog], leftStatisticsWidth = statWidths.slice(0, 4).reduce((sum, width) => sum + width, 0), statisticsTop = y; cell(L, statisticsTop, leftStatisticsWidth, 8, `Statistical Data of ${ordinal[selection.academicYear]} Year ${selection.semester} Semester Examination, ${selection.examYear}`, true, 10.5); let x = L + leftStatisticsWidth; cell(x, statisticsTop, statWidths[4], 25, statLabels[4], true, 10.5); x += statWidths[4]; cell(x, statisticsTop, statWidths[5], 25, statLabels[5], true, 10.5); x = L; statLabels.slice(0, 4).forEach((label, index) => { cell(x, statisticsTop + 8, statWidths[index], 17, label, true, 10.5); x += statWidths[index]; }); x = L; statValues.forEach((value, index) => { cell(x, statisticsTop + 25, statWidths[index], 8, String(value).padStart(2, "0"), false, 10.5); x += statWidths[index]; }); y = statisticsTop + 56; doc.setFont("FreeSerif", "bold"); doc.setFontSize(12); doc.text("Controller of Examinations", R, y, { align: "right" }); doc.text("Rajshahi University of Engineering & Technology", R, y + 6, { align: "right" }); doc.setFontSize(12); doc.text(`Memo No: ${committee.memoNo || ""}`, L, y + 12); doc.text(`Date: ${formatTabulatorDate(committee.memoDate)}`, R, y + 12, { align: "right" }); doc.text("Copy forwarded for necessary action:", L, y + 18); doc.setFont("FreeSerif", "normal"); const actions = ["Registrar, Rajshahi University of Engineering & Technology", "Member Secretary, Academic Council, Rajshahi University of Engineering & Technology", `Chairman, Examination Committee, B.Sc Engineering ${ordinal[selection.academicYear]} Year ${selection.semester} Semester Examination, ${selection.examYear}, Department of ${departmentName} with request to distribute the result sheets to the course advisor(s)`, "Dean, Faculty of Civil Engineering, Rajshahi University of Engineering & Technology", "Director, IQAC, Rajshahi University of Engineering & Technology", "Head of all Departments, Rajshahi University of Engineering & Technology", "Director, Student Welfare's, Rajshahi University of Engineering & Technology", "Comptroller, Rajshahi University of Engineering & Technology", "Librarian, Central Library, Rajshahi University of Engineering & Technology", "All Hall Provosts, Rajshahi University of Engineering & Technology", "Academic/Accounts/Finance, Rajshahi University of Engineering & Technology", "Office-in-charge, Transport/Central Store, Rajshahi University of Engineering & Technology", "All Notice Board, Rajshahi University of Engineering & Technology", "File"];
      doc.setFontSize(10.5); let actionY = y + 23; actions.forEach((action, index) => { const lines: string[] = doc.splitTextToSize(`${index + 1}. ${action}`, R - L); doc.text(lines, L, actionY); actionY += lines.length * 5.2; }); doc.setFont("FreeSerif", "bold"); doc.setFontSize(12); const finalSignatureY = actionY + 5.2; doc.text("Controller of Examinations", R, finalSignatureY, { align: "right" }); doc.text("Rajshahi University of Engineering & Technology", R, finalSignatureY + 6, { align: "right" }); footer(pages, pages);
      doc.save(`result-sheet-${selection.examYear}-${selection.academicYear}-${selection.semester}.pdf`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to generate result sheet."); } finally { setBusy(false); }
  }

  return <section className="min-h-screen bg-[#f7f9fd] p-2 sm:p-4"><div className="border-t border-[#082f57] bg-white"><div className="border-b border-[#082f57] p-4 text-center"><h1 className="text-2xl font-bold">{title}</h1></div><div className="grid gap-4 border-b border-[#082f57] p-5 md:grid-cols-2"><label className="grid items-center gap-2 sm:grid-cols-[180px_1fr]">Department<select disabled className={field}><option>{departmentName}</option></select></label><label className="grid items-center gap-2 sm:grid-cols-[180px_1fr]">Exam Year<select value={selection.examYear} onChange={(event) => setSelection({ ...selection, examYear: event.target.value })} className={field}>{years.map((year) => <option key={year}>{year}</option>)}</select></label><label className="grid items-center gap-2 sm:grid-cols-[180px_1fr]">Academic Year<select value={selection.academicYear} onChange={(event) => setSelection({ ...selection, academicYear: event.target.value })} className={field}>{academicYears.map((year) => <option key={year}>{year}</option>)}</select></label><label className="grid items-center gap-2 sm:grid-cols-[180px_1fr]">Semester<select value={selection.semester} onChange={(event) => setSelection({ ...selection, semester: event.target.value })} className={field}>{semesters.filter((semester) => semester !== "Short Semester").map((semester) => <option key={semester}>{semester}</option>)}</select></label><button disabled={busy} onClick={() => void generate()} className="mx-auto inline-flex w-fit rounded bg-sky-500 px-4 py-2 text-white disabled:opacity-50 md:col-span-2"><FileDown className="mr-2 h-4 w-4"/>{busy ? "Generating..." : "Generate Result Sheet"}</button></div>{message && <p className="m-4 rounded bg-red-50 p-3 text-red-700">{message}</p>}</div></section>;
}