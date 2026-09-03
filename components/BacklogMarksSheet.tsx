"use client";
const roundSgpa=(value:number)=>(Math.round((value+Number.EPSILON)*100)/100).toFixed(2);

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { academicYears, departmentName, type OldStudentRecord, type StudentDirectoryRecord } from "@/lib/storage/studentDirectory";
import { type SyllabusCourse, type SyllabusSegment } from "@/lib/storage/syllabuses";
import { loadResultSection, saveResultSection } from "@/lib/storage/resultSections";
import SyncedHorizontalScroll from "@/components/SyncedHorizontalScroll";

type BacklogMark = { studentId: string; rollNo: string; examYear: string; academicYear: string; semester: "Odd" | "Even"; courseCode: string; courseTitle: string; present: boolean; partA: string; partB: string; classTestAttendance: string; marks: string; result: "Pass" | "Fail" };
type ArchiveStudent = { studentId: string; rollNo: string; earnedCredit: number; gradePoints: number; sgpa: string; failedSubjects: string[]; registerAgain: string[] };
type Archive = { examYear: string; academicYear: string; semester: ""; series: string; students: ArchiveStudent[]; updatedAt: string };
type SheetStudent = Pick<StudentDirectoryRecord, "id" | "rollNo" | "name" | "registrationNo" | "fatherName" | "motherName">;

const gradePoints: Record<string, number> = { "A+": 4, A: 3.75, "A-": 3.5, "B+": 3.25, B: 3, "B-": 2.75, "C+": 2.5, C: 2.25, D: 2, F: 0 };
const numberValue = (value?: string) => Number(value) || 0;
const normalize = (value: string) => value.replace(/\s/g, "").toLowerCase();
const studentDetailScore = (student: StudentDirectoryRecord) => (student.fatherName.trim() ? 8 : 0) + (student.registrationNo.trim() ? 4 : 0) + (student.name && student.name !== "Historical Student" ? 2 : 0) + (student.motherName.trim() ? 1 : 0);
const grade = (score: number) => score >= 80 ? "A+" : score >= 75 ? "A" : score >= 70 ? "A-" : score >= 65 ? "B+" : score >= 60 ? "B" : score >= 55 ? "B-" : score >= 50 ? "C+" : score >= 45 ? "C" : score >= 40 ? "D" : "F";
const ordinal: Record<string, string> = { "1st": "1st", "2nd": "2nd", "3rd": "3rd", "4th": "4th" };

export default function BacklogMarksSheet({ examType, onExamTypeChange }: { examType: "Regular" | "Backlog"; onExamTypeChange: (value: "Regular" | "Backlog") => void }) {
  const currentYear = String(new Date().getFullYear());
  const years = Array.from({ length: Math.max(1, Number(currentYear) - 2018 + 1) }, (_, index) => String(Number(currentYear) - index));
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [oldStudents, setOldStudents] = useState<OldStudentRecord[]>([]);
  const [marks, setMarks] = useState<BacklogMark[]>([]);
  const [syllabuses, setSyllabuses] = useState<SyllabusSegment[]>([]);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [selection, setSelection] = useState({ examYear: currentYear, academicYear: "1st" });
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("");
  const field = "h-10 w-full rounded border border-slate-300 bg-white px-3";

  useEffect(() => {
    Promise.all([
      fetch("/api/students/directory?includeHistorical=true", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/students/old", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/syllabuses", { cache: "no-store" }).then((response) => response.json()),
      loadResultSection<BacklogMark[]>("prepare-result-backlog"),
      loadResultSection<Archive[]>("marks-sheet-backlog"),
    ]).then(([studentBody, oldStudentBody, syllabusBody, savedMarks, savedArchives]) => {
      setStudents(studentBody.records || []);
      setOldStudents(oldStudentBody.records || []);
      setSyllabuses(syllabusBody.syllabuses || []);
      setMarks(Array.isArray(savedMarks) ? savedMarks : []);
      setArchives(Array.isArray(savedArchives) ? savedArchives : []);
    }).catch(() => setMessage("Unable to load backlog marksheet data from Neon."));
  }, []);

  const currentMarks = useMemo(() => marks.filter((item) => item.examYear === selection.examYear && item.academicYear === selection.academicYear), [marks, selection]);
  const courses = useMemo(() => [...new Map(currentMarks.map((item) => {
    const syllabus = syllabuses.filter((segment) => segment.active !== false).flatMap((segment) => segment.courses || []).find((course) => normalize(course.code) === normalize(item.courseCode));
    const course: SyllabusCourse = syllabus || { id: `${item.semester}-${item.courseCode}`, code: item.courseCode, title: item.courseTitle, credit: "0", type: "Theory", department: "BECM", year: selection.academicYear as SyllabusCourse["year"], semester: item.semester };
    return [`${item.semester}|${normalize(item.courseCode)}`, course] as const;
  })).values()], [currentMarks, syllabuses, selection.academicYear]);
  const obeCohort = useMemo(() => {
    const ids = new Set(currentMarks.map((item) => item.studentId));
    const oldKeys = new Set(oldStudents.flatMap((student) => [`id:${student.id}`, `roll:${normalize(student.rollNo)}`]));
    const matching = students.filter((student) => ids.has(student.id) || currentMarks.some((mark) => normalize(mark.rollNo) === normalize(student.rollNo))), byRoll = new Map<string, StudentDirectoryRecord>();
    matching.filter((student) => !oldKeys.has(`id:${student.id}`) && !oldKeys.has(`roll:${normalize(student.rollNo)}`)).forEach((student) => { const key = normalize(student.rollNo), saved = byRoll.get(key); if (!saved || studentDetailScore(student) > studentDetailScore(saved)) byRoll.set(key, student); });
    const resolved = [...byRoll.values()], rollSeries = (rollNo: string) => rollNo.replace(/\D/g, "").slice(0, 2), seriesCounts = new Map<string, number>(); resolved.forEach((student) => { const series = rollSeries(student.rollNo); seriesCounts.set(series, (seriesCounts.get(series) || 0) + 1); }); return resolved.sort((left, right) => (seriesCounts.get(rollSeries(right.rollNo)) || 0) - (seriesCounts.get(rollSeries(left.rollNo)) || 0) || left.rollNo.localeCompare(right.rollNo, undefined, { numeric: true }));
  }, [students, oldStudents, currentMarks]);
  const nonObeCohort = useMemo(() => oldStudents.filter((student) => currentMarks.some((mark) => mark.studentId === student.id || normalize(mark.rollNo) === normalize(student.rollNo))).sort((left, right) => left.rollNo.localeCompare(right.rollNo, undefined, { numeric: true })), [oldStudents, currentMarks]);
  const cohort: SheetStudent[] = [...obeCohort, ...nonObeCohort];

  function result(student: SheetStudent, course: SyllabusCourse) {
    const mark = currentMarks.find((item) => (item.studentId === student.id || normalize(item.rollNo) === normalize(student.rollNo)) && item.semester === course.semester && normalize(item.courseCode) === normalize(course.code));
    const letter = mark ? mark.result === "Fail" ? "F" : grade(numberValue(mark.marks)) : "";
    return { mark, letter };
  }

  function summary(student: SheetStudent) {
    const rows = courses.map((course) => ({ course, ...result(student, course) }));
    const passed = rows.filter((row) => row.mark && row.letter !== "F");
    const earned = passed.reduce((sum, row) => sum + numberValue(row.course.credit), 0);
    const quality = passed.reduce((sum, row) => sum + gradePoints[row.letter] * numberValue(row.course.credit), 0);
    return { rows, earned, quality, sgpa: earned ? quality / earned : 0, failed: rows.filter((row) => row.mark && row.letter === "F").map((row) => row.course.code) };
  }

  async function search() {
    setSearched(true);
    if (!courses.length) { setMessage("No saved backlog results found for this examination."); return; }
    const record: Archive = { ...selection, semester: "", series: "", students: cohort.map((student) => { const data = summary(student); return { studentId: student.id, rollNo: student.rollNo, earnedCredit: data.earned, gradePoints: Number(data.quality.toFixed(3)), sgpa: roundSgpa(data.sgpa), failedSubjects: data.failed, registerAgain: [] }; }), updatedAt: new Date().toISOString() };
    try {
      const next = [...archives.filter((item) => !(item.examYear === record.examYear && item.academicYear === record.academicYear)), record];
      setArchives(await saveResultSection("marks-sheet-backlog", next));
      setMessage("");
    } catch { setMessage("Unable to archive this backlog marksheet in Neon."); }
  }

  async function generatePdf() {
    const { jsPDF } = await import("jspdf");
    const fontBase64 = async (url: string) => { const response = await fetch(url); if (!response.ok) throw new Error("Unable to load FreeSerif PDF font."); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ""; for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768)); return btoa(binary); };
    const [regularFont, boldFont, boldItalicFont] = await Promise.all([fontBase64("/fonts/FreeSerif.ttf"), fontBase64("/fonts/FreeSerifBold.ttf"), fontBase64("/fonts/FreeSerifBoldItalic.ttf")]);
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.addFileToVFS("FreeSerif.ttf", regularFont); doc.addFont("FreeSerif.ttf", "FreeSerif", "normal");
    doc.addFileToVFS("FreeSerifBold.ttf", boldFont); doc.addFont("FreeSerifBold.ttf", "FreeSerif", "bold");
    doc.addFileToVFS("FreeSerifBoldItalic.ttf", boldItalicFont); doc.addFont("FreeSerifBoldItalic.ttf", "FreeSerif", "bolditalic");
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), L = 12, R = W - 12, rollWidth = 14, earnedWidth = 12, sgpaWidth = 10, failedWidth = 29, registerWidth = 24, remarksWidth = failedWidth + registerWidth, courseWidth = (R - L - rollWidth - earnedWidth - sgpaWidth - remarksWidth) / Math.max(1, courses.length), subWidth = courseWidth / 5;
    const cell = (x: number, y: number, w: number, h: number, value: string, bold = false, align: "left" | "center" = "center", size = 7.3, failed = false) => { doc.setLineWidth(.15); doc.setTextColor(failed ? 220 : 0, failed ? 38 : 0, failed ? 38 : 0); doc.rect(x, y, w, h); doc.setFont("FreeSerif", bold ? "bold" : "normal"); doc.setFontSize(size); const lines = doc.splitTextToSize(value || "", Math.max(1, w - 1.6)) as string[], lineHeight = size * .36, start = y + (h - lines.length * lineHeight) / 2 + lineHeight * .78; lines.forEach((line, index) => doc.text(line, align === "left" ? x + .8 : x + w / 2, start + index * lineHeight, { align })); doc.setTextColor(0); };
    const heading = () => { doc.setFont("FreeSerif", "bold"); doc.setFontSize(8); doc.text("Heavens Light is Our Guide", W / 2, 9, { align: "center" }); doc.text("Rajshahi University of Engineering & Technology", W / 2, 13, { align: "center" }); doc.text(`Department of ${departmentName}`, W / 2, 17, { align: "center" }); doc.text(`${ordinal[selection.academicYear]} Year Backlog Examination, ${selection.examYear}`, W / 2, 21, { align: "center" }); doc.line(L, 25, R, 25); };
    const tableHeader = (top: number) => { let x = L; cell(x, top, rollWidth, 18, "Roll No.", true); x += rollWidth; courses.forEach((course) => { cell(x, top, courseWidth, 10, `${course.code}\n${numberValue(course.credit).toFixed(2)}`, true); ["A", "B", "CT", "T.", "Gr."].forEach((label) => { cell(x, top + 10, subWidth, 8, label, true); x += subWidth; }); }); cell(x, top, earnedWidth, 18, "Earned\nCredit", true); x += earnedWidth; cell(x, top, sgpaWidth, 18, "SGPA", true); x += sgpaWidth; cell(x, top, remarksWidth, 10, "Remarks", true); cell(x, top + 10, failedWidth, 8, "Failed Subjects", true); cell(x + failedWidth, top + 10, registerWidth, 8, "Need to Register\nAgain", true); return top + 18; };
    const rowData = (list: SheetStudent[]) => list.map((student) => ({ student, data: summary(student) }));
    const rowHeight = ({ data }: ReturnType<typeof rowData>[number]) => { doc.setFont("FreeSerif", "normal"); doc.setFontSize(7.3); const failedLines = doc.splitTextToSize(data.failed.join(", "), failedWidth - 1.6) as string[]; return Math.max(5.35, failedLines.length * 7.3 * .36 + 1.6); };
    const totalPagesToken = "{total_pages_count_string}"; let page = 1, y = 29;
    const footer = () => { doc.line(L, H - 12, R, H - 12); doc.setFont("FreeSerif", "bolditalic"); doc.setFontSize(8); doc.text(`Page ${page} of ${totalPagesToken}`, R, H - 8, { align: "right" }); };
    const nextPage = () => { footer(); doc.addPage("a4", "landscape"); page += 1; heading(); y = 29; };
    const drawSection = (label: string, studentsInSection: SheetStudent[], showLabel = true) => { if (!studentsInSection.length) return; const rows = rowData(studentsInSection), labelHeight = showLabel ? 5 : 0; if (y + labelHeight + 18 + rowHeight(rows[0]) > H - 14) nextPage(); if (showLabel) { doc.setFont("FreeSerif", "bold"); doc.setFontSize(8); doc.text(`${label}:`, L, y + 3); } y = tableHeader(y + labelHeight); rows.forEach(({ student, data }, index) => { const height = rowHeight({ student, data }); if (y + height > H - 14) { nextPage(); if (showLabel) { doc.setFont("FreeSerif", "bold"); doc.setFontSize(8); doc.text(`${label} (continued):`, L, y + 3); } y = tableHeader(y + labelHeight); } const values = data.rows; let x = L; cell(x, y, rollWidth, height, student.rollNo); x += rollWidth; values.forEach(({ mark, letter }) => { [mark?.partA ?? "", mark?.partB ?? "", mark?.classTestAttendance ?? "", mark?.marks ?? "", letter].forEach((value, valueIndex) => { cell(x, y, subWidth, height, String(value), false, "center", 7.3, valueIndex === 4 && letter === "F"); x += subWidth; }); }); cell(x, y, earnedWidth, height, data.earned.toFixed(2)); x += earnedWidth; cell(x, y, sgpaWidth, height, roundSgpa(data.sgpa)); x += sgpaWidth; cell(x, y, failedWidth, height, data.failed.join(", "), false, "left", 7.3); cell(x + failedWidth, y, registerWidth, height, "", false, "left"); y += height; if (index === rows.length - 1) y += 6; }); };
    heading(); drawSection("OBE", obeCohort, nonObeCohort.length > 0); drawSection("Non-OBE", nonObeCohort); footer(); doc.putTotalPages(totalPagesToken);
    doc.save(`mark-sheet-backlog-${selection.examYear}-${selection.academicYear}.pdf`);
  }

  const columnCount = 1 + courses.length * 5 + 4;
  return <section className="min-h-screen bg-[#f7f9fd] p-1 sm:p-3"><div className="border-t border-[#082f57] bg-white"><header className="border-b border-[#082f57] p-4 text-center"><h1 className="text-2xl font-bold">Mark Sheets Summary (Backlog)</h1></header><div className="grid gap-4 border-b border-[#082f57] p-6 md:grid-cols-2"><label className="grid items-center gap-2 font-semibold sm:grid-cols-[190px_1fr]">Exam Type<select value={examType} onChange={(event) => onExamTypeChange(event.target.value as "Regular" | "Backlog")} className={field}><option value="Regular">Regular</option><option value="Backlog">Backlog</option></select></label><label className="grid items-center gap-2 sm:grid-cols-[190px_1fr]">Exam Year<select value={selection.examYear} onChange={(event) => { setSelection({ ...selection, examYear: event.target.value }); setSearched(false); }} className={field}>{years.map((year) => <option key={year}>{year}</option>)}</select></label><label className="grid items-center gap-2 sm:grid-cols-[190px_1fr]">Academic Year<select value={selection.academicYear} onChange={(event) => { setSelection({ ...selection, academicYear: event.target.value }); setSearched(false); }} className={field}>{academicYears.map((year) => <option key={year}>{year}</option>)}</select></label><button onClick={() => void search()} className="mx-auto rounded bg-green-600 px-4 py-2 text-white md:col-span-2"><Printer className="mr-1 inline h-4 w-4"/>Generate Marksheet</button></div><div className="border-b border-[#082f57] p-4 text-center text-lg font-bold">Mark Sheet (Backlog)</div>{message && <p className="m-4 rounded bg-red-50 p-3 text-red-700">{message}</p>}{searched && courses.length > 0 && <div className="marksheet-print p-4"><div className="mb-4 flex justify-end print:hidden"><button onClick={() => void generatePdf()} className="rounded border-2 border-green-900 bg-green-600 px-4 py-2 text-white"><Printer className="mr-1 inline h-4 w-4"/>Generate PDF</button></div><div className="mb-4 text-center leading-relaxed print:hidden"><p className="text-sm font-bold">Heavens Light is Our Guide</p><h2 className="text-xl font-bold">Rajshahi University of Engineering &amp; Technology</h2><h3 className="text-lg font-bold">Department of Building Engineering &amp; Construction Management</h3><p className="font-bold">{ordinal[selection.academicYear]} Year Backlog Examination, {selection.examYear}</p></div><SyncedHorizontalScroll><table className="min-w-max border-collapse text-sm"><thead className="bg-[#082f57] text-white"><tr className="hidden print:table-row"><th colSpan={columnCount} className="border-0 bg-white pb-8 text-center text-black">Rajshahi University of Engineering &amp; Technology<br/>Department of Building Engineering &amp; Construction Management<br/>{ordinal[selection.academicYear]} Year Backlog Examination, {selection.examYear}</th></tr><tr><th rowSpan={2} className="border p-3">Roll No.</th>{courses.map((course) => <th key={`${course.semester}-${course.code}`} colSpan={5} className="border p-3">{course.code}<br/>{numberValue(course.credit).toFixed(2)}</th>)}<th rowSpan={2} className="border p-3">Earned<br/>Credit</th><th rowSpan={2} className="border p-3">SGPA</th><th colSpan={2} className="border p-3">Remarks</th></tr><tr>{courses.flatMap((course) => ["A", "B", "CT", "T.", "Gr."].map((label) => <th key={`${course.semester}-${course.code}-${label}`} className="border p-3">{label}</th>))}<th className="border p-3">Failed Subjects</th><th className="border p-3">Need to Register Again</th></tr></thead><tbody>{cohort.map((student) => { const data = summary(student); return <tr key={normalize(student.rollNo)} className="even:bg-slate-50"><td className="border p-2">{student.rollNo}</td>{data.rows.flatMap(({ course, mark, letter }) => [<td key={`${course.code}-a`} className="border p-2 text-center">{mark?.partA ?? ""}</td>, <td key={`${course.code}-b`} className="border p-2 text-center">{mark?.partB ?? ""}</td>, <td key={`${course.code}-ct`} className="border p-2 text-center">{mark?.classTestAttendance ?? ""}</td>, <td key={`${course.code}-t`} className="border p-2 text-center">{mark?.marks ?? ""}</td>, <td key={`${course.code}-g`} className={`border p-2 text-center ${letter === "F" ? "text-red-600" : ""}`}>{letter}</td>])}<td className="border p-2 text-center">{data.earned.toFixed(2)}</td><td className="border p-2 text-center">{roundSgpa(data.sgpa)}</td><td className="border p-2">{data.failed.join(", ")}</td><td className="border p-2"/></tr>; })}</tbody></table></SyncedHorizontalScroll></div>}</div><style jsx global>{`@media print {@page{size:A4 landscape;margin:8mm 10mm 13mm}body *{visibility:hidden!important}.marksheet-print,.marksheet-print *{visibility:visible!important}.marksheet-print{position:absolute;inset:0;width:100%;padding:0!important}.marksheet-print table{width:100%;table-layout:fixed;font-size:6.2pt}.marksheet-print th,.marksheet-print td{border:1px solid #111!important;background:#fff!important;color:#000!important;padding:2px!important}}`}</style></section>;
}
