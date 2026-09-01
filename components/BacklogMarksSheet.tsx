"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { academicYears, departmentName, type StudentDirectoryRecord } from "@/lib/storage/studentDirectory";
import { type SyllabusCourse, type SyllabusSegment } from "@/lib/storage/syllabuses";
import { loadResultSection, saveResultSection } from "@/lib/storage/resultSections";
import SyncedHorizontalScroll from "@/components/SyncedHorizontalScroll";

type BacklogMark = { studentId: string; rollNo: string; examYear: string; academicYear: string; semester: "Odd" | "Even"; courseCode: string; courseTitle: string; present: boolean; partA: string; partB: string; classTestAttendance: string; marks: string; result: "Pass" | "Fail" };
type ArchiveStudent = { studentId: string; rollNo: string; earnedCredit: number; gradePoints: number; sgpa: string; failedSubjects: string[]; registerAgain: string[] };
type Archive = { examYear: string; academicYear: string; semester: ""; series: string; students: ArchiveStudent[]; updatedAt: string };

const gradePoints: Record<string, number> = { "A+": 4, A: 3.75, "A-": 3.5, "B+": 3.25, B: 3, "B-": 2.75, "C+": 2.5, C: 2.25, D: 2, F: 0 };
const numberValue = (value?: string) => Number(value) || 0;
const normalize = (value: string) => value.replace(/\s/g, "").toLowerCase();
const studentDetailScore = (student: StudentDirectoryRecord) => (student.fatherName.trim() ? 8 : 0) + (student.registrationNo.trim() ? 4 : 0) + (student.name && student.name !== "Historical Student" ? 2 : 0) + (student.motherName.trim() ? 1 : 0);
const grade = (score: number) => score >= 80 ? "A+" : score >= 75 ? "A" : score >= 70 ? "A-" : score >= 65 ? "B+" : score >= 60 ? "B" : score >= 55 ? "B-" : score >= 50 ? "C+" : score >= 45 ? "C" : score >= 40 ? "D" : "F";
const ordinal: Record<string, string> = { "1st": "1st", "2nd": "2nd", "3rd": "3rd", "4th": "4th" };

export default function BacklogMarksSheet() {
  const currentYear = String(new Date().getFullYear());
  const years = Array.from({ length: Math.max(1, Number(currentYear) - 2018 + 1) }, (_, index) => String(Number(currentYear) - index));
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
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
      fetch("/api/syllabuses", { cache: "no-store" }).then((response) => response.json()),
      loadResultSection<BacklogMark[]>("prepare-result-backlog"),
      loadResultSection<Archive[]>("marks-sheet-backlog"),
    ]).then(([studentBody, syllabusBody, savedMarks, savedArchives]) => {
      setStudents(studentBody.records || []);
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
  })).values()].sort((left, right) => left.semester.localeCompare(right.semester) || left.code.localeCompare(right.code, undefined, { numeric: true })), [currentMarks, syllabuses, selection.academicYear]);
  const cohort = useMemo(() => {
    const ids = new Set(currentMarks.map((item) => item.studentId));
    const matching = students.filter((student) => ids.has(student.id) || currentMarks.some((mark) => normalize(mark.rollNo) === normalize(student.rollNo))), byRoll = new Map<string, StudentDirectoryRecord>();
    matching.forEach((student) => { const key = normalize(student.rollNo), saved = byRoll.get(key); if (!saved || studentDetailScore(student) > studentDetailScore(saved)) byRoll.set(key, student); });
    return [...byRoll.values()].sort((left, right) => left.rollNo.localeCompare(right.rollNo, undefined, { numeric: true }));
  }, [students, currentMarks]);

  function result(student: StudentDirectoryRecord, course: SyllabusCourse) {
    const mark = currentMarks.find((item) => (item.studentId === student.id || normalize(item.rollNo) === normalize(student.rollNo)) && item.semester === course.semester && normalize(item.courseCode) === normalize(course.code));
    const letter = mark ? grade(numberValue(mark.marks)) : "-";
    return { mark, letter };
  }

  function summary(student: StudentDirectoryRecord) {
    const rows = courses.map((course) => ({ course, ...result(student, course) }));
    const passed = rows.filter((row) => row.mark && row.letter !== "F");
    const earned = passed.reduce((sum, row) => sum + numberValue(row.course.credit), 0);
    const quality = passed.reduce((sum, row) => sum + gradePoints[row.letter] * numberValue(row.course.credit), 0);
    return { rows, earned, quality, sgpa: earned ? quality / earned : 0, failed: rows.filter((row) => row.mark && row.letter === "F").map((row) => row.course.code) };
  }

  async function search() {
    setSearched(true);
    if (!courses.length) { setMessage("No saved backlog results found for this examination."); return; }
    const record: Archive = { ...selection, semester: "", series: "", students: cohort.map((student) => { const data = summary(student); return { studentId: student.id, rollNo: student.rollNo, earnedCredit: data.earned, gradePoints: Number(data.quality.toFixed(3)), sgpa: data.sgpa.toFixed(2), failedSubjects: data.failed, registerAgain: [] }; }), updatedAt: new Date().toISOString() };
    try {
      const next = [...archives.filter((item) => !(item.examYear === record.examYear && item.academicYear === record.academicYear)), record];
      setArchives(await saveResultSection("marks-sheet-backlog", next));
      setMessage("");
    } catch { setMessage("Unable to archive this backlog marksheet in Neon."); }
  }

  const columnCount = 1 + courses.length * 5 + 4;
  return <section className="min-h-screen bg-[#f7f9fd] p-1 sm:p-3"><div className="border-t border-[#082f57] bg-white"><header className="border-b border-[#082f57] p-4 text-center"><h1 className="text-2xl font-bold">Mark Sheets Summary (Backlog)</h1></header><div className="grid gap-4 border-b border-[#082f57] p-6 md:grid-cols-2"><label className="grid items-center gap-2 sm:grid-cols-[190px_1fr]">Department<select disabled className={field}><option>{departmentName}</option></select></label><label className="grid items-center gap-2 sm:grid-cols-[190px_1fr]">Exam Year<select value={selection.examYear} onChange={(event) => { setSelection({ ...selection, examYear: event.target.value }); setSearched(false); }} className={field}>{years.map((year) => <option key={year}>{year}</option>)}</select></label><label className="grid items-center gap-2 sm:grid-cols-[190px_1fr]">Academic Year<select value={selection.academicYear} onChange={(event) => { setSelection({ ...selection, academicYear: event.target.value }); setSearched(false); }} className={field}>{academicYears.map((year) => <option key={year}>{year}</option>)}</select></label><button onClick={() => void search()} className="mx-auto rounded bg-green-600 px-4 py-2 text-white md:col-span-2"><Printer className="mr-1 inline h-4 w-4"/>Generate Marksheet</button></div><div className="border-b border-[#082f57] p-4 text-center text-lg font-bold">Mark Sheet (Backlog)</div>{message && <p className="m-4 rounded bg-red-50 p-3 text-red-700">{message}</p>}{searched && courses.length > 0 && <div className="marksheet-print p-4"><div className="mb-4 flex justify-end print:hidden"><button onClick={() => window.print()} className="rounded border-2 border-green-900 bg-green-600 px-4 py-2 text-white"><Printer className="mr-1 inline h-4 w-4"/>Generate Marksheet</button></div><div className="mb-4 text-center leading-relaxed print:hidden"><p className="text-sm font-bold">Heavens Light is Our Guide</p><h2 className="text-xl font-bold">Rajshahi University of Engineering &amp; Technology</h2><h3 className="text-lg font-bold">Department of Building Engineering &amp; Construction Management</h3><p className="font-bold">{ordinal[selection.academicYear]} Year Backlog Examination, {selection.examYear}</p></div><SyncedHorizontalScroll><table className="min-w-max border-collapse text-sm"><thead className="bg-[#082f57] text-white"><tr className="hidden print:table-row"><th colSpan={columnCount} className="border-0 bg-white pb-8 text-center text-black">Rajshahi University of Engineering &amp; Technology<br/>Department of Building Engineering &amp; Construction Management<br/>{ordinal[selection.academicYear]} Year Backlog Examination, {selection.examYear}</th></tr><tr><th rowSpan={2} className="border p-3">Roll No.</th>{courses.map((course) => <th key={`${course.semester}-${course.code}`} colSpan={5} className="border p-3">{course.code}<br/>{numberValue(course.credit).toFixed(2)}</th>)}<th rowSpan={2} className="border p-3">Earned<br/>Credit</th><th rowSpan={2} className="border p-3">SGPA</th><th colSpan={2} className="border p-3">Remarks</th></tr><tr>{courses.flatMap((course) => ["A", "B", "CT", "T.", "Gr."].map((label) => <th key={`${course.semester}-${course.code}-${label}`} className="border p-3">{label}</th>))}<th className="border p-3">Failed Subjects</th><th className="border p-3">Need to Register Again</th></tr></thead><tbody>{cohort.map((student) => { const data = summary(student); return <tr key={normalize(student.rollNo)} className="even:bg-slate-50"><td className="border p-2">{student.rollNo}</td>{data.rows.flatMap(({ course, mark, letter }) => [<td key={`${course.code}-a`} className="border p-2 text-center">{mark?.partA ?? "-"}</td>, <td key={`${course.code}-b`} className="border p-2 text-center">{mark?.partB ?? "-"}</td>, <td key={`${course.code}-ct`} className="border p-2 text-center">{mark?.classTestAttendance ?? "-"}</td>, <td key={`${course.code}-t`} className="border p-2 text-center">{mark?.marks ?? "-"}</td>, <td key={`${course.code}-g`} className={`border p-2 text-center ${letter === "F" ? "text-red-600" : ""}`}>{letter}</td>])}<td className="border p-2 text-center">{data.earned.toFixed(2)}</td><td className="border p-2 text-center">{data.sgpa.toFixed(2)}</td><td className="border p-2">{data.failed.join(", ")}</td><td className="border p-2"/></tr>; })}</tbody></table></SyncedHorizontalScroll></div>}</div><style jsx global>{`@media print {@page{size:A4 landscape;margin:8mm 10mm 13mm}body *{visibility:hidden!important}.marksheet-print,.marksheet-print *{visibility:visible!important}.marksheet-print{position:absolute;inset:0;width:100%;padding:0!important}.marksheet-print table{width:100%;table-layout:fixed;font-size:6.2pt}.marksheet-print th,.marksheet-print td{border:1px solid #111!important;background:#fff!important;color:#000!important;padding:2px!important}}`}</style></section>;
}
