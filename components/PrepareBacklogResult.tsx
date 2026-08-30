"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Search, Trash2 } from "lucide-react";
import { academicYears, departmentName, type StudentDirectoryRecord } from "@/lib/storage/studentDirectory";
import { loadResultSection, saveResultSection } from "@/lib/storage/resultSections";

type BacklogResultRow = { id: string; studentId: string; studentName: string; rollNo: string; registrationNo: string; examYear: string; academicYear: string; semester: "Odd" | "Even"; courseCode: string; courseTitle: string; marks: string; result: "Pass" | "Fail"; updatedAt: string };
const currentYear = String(new Date().getFullYear());

export default function PrepareBacklogResult() {
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [savedRows, setSavedRows] = useState<BacklogResultRow[]>([]);
  const [selection, setSelection] = useState({ examYear: currentYear, academicYear: "1st", semester: "Odd" as "Odd" | "Even" });
  const [rows, setRows] = useState<BacklogResultRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const field = "h-9 w-full rounded-sm border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-500";

  useEffect(() => { Promise.all([fetch("/api/students/directory").then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body.records || []; }), loadResultSection<BacklogResultRow[]>("prepare-result-backlog")]).then(([records, results]) => { setStudents(records); setSavedRows(Array.isArray(results) ? results : []); }).catch((error) => setMessage(error.message || "Unable to load backlog students")).finally(() => setLoading(false)); }, []);
  const eligible = useMemo(() => students.filter((student) => student.backlogEligibility?.some((item) => item.examYear === selection.examYear && item.academicYear === selection.academicYear && item.semester === selection.semester)), [students, selection]);
  const examYears = useMemo(() => [...new Set([currentYear, ...students.flatMap((student) => student.backlogEligibility?.map((item) => item.examYear) || [])])].sort().reverse(), [students]);

  function searchStudents() {
    const existing = savedRows.filter((row) => row.examYear === selection.examYear && row.academicYear === selection.academicYear && row.semester === selection.semester);
    const next = [...existing];
    for (const student of eligible) if (!next.some((row) => row.studentId === student.id)) next.push({ id: crypto.randomUUID(), studentId: student.id, studentName: student.name, rollNo: student.rollNo, registrationNo: student.registrationNo, ...selection, courseCode: "", courseTitle: "", marks: "", result: "Pass", updatedAt: "" });
    setRows(next); setMessage(next.length ? "" : "No promoted students are eligible for backlog results in this semester.");
  }

  function update(id: string, values: Partial<BacklogResultRow>) { setRows((current) => current.map((row) => row.id === id ? { ...row, ...values } : row)); }
  function addSubject(studentId: string) { const student = eligible.find((item) => item.id === studentId); if (!student) return; setRows((current) => [...current, { id: crypto.randomUUID(), studentId: student.id, studentName: student.name, rollNo: student.rollNo, registrationNo: student.registrationNo, ...selection, courseCode: "", courseTitle: "", marks: "", result: "Pass", updatedAt: "" }]); }

  async function save() {
    const completed = rows.filter((row) => row.courseCode.trim() || row.courseTitle.trim() || row.marks.trim());
    if (!completed.length) { setMessage("Enter at least one failed subject and its backlog result."); return; }
    if (completed.some((row) => !row.courseCode.trim() || !row.courseTitle.trim() || !/^\d{1,3}$/.test(row.marks) || Number(row.marks) > 100)) { setMessage("Every result requires a course code, course title and marks from 0 to 100."); return; }
    setSaving(true); setMessage("");
    try {
      const otherCohorts = savedRows.filter((row) => !(row.examYear === selection.examYear && row.academicYear === selection.academicYear && row.semester === selection.semester));
      const now = new Date().toISOString();
      const next = await saveResultSection("prepare-result-backlog", [...otherCohorts, ...completed.map((row) => ({ ...row, updatedAt: now }))]);
      setSavedRows(next); setRows(completed.map((row) => ({ ...row, updatedAt: now }))); setMessage("Backlog results saved successfully in Neon.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save backlog results"); }
    finally { setSaving(false); }
  }

  return <section className="min-h-screen bg-[#f7f9fd] p-2 sm:p-5"><div className="border-t border-[#0a315b] bg-white shadow-sm">
    <div className="border-b border-[#0a315b] px-5 py-4 text-center"><h1 className="text-xl font-bold">Prepare Result (Backlog)</h1><p className="mt-1 text-sm text-slate-500">Previous-year failed subjects for students promoted from Even semester to the next academic year’s Odd semester</p></div>
    <div className="grid gap-x-12 gap-y-3 border-b border-[#0a315b] p-5 md:grid-cols-2">
      <label className="grid items-center gap-3 text-sm font-semibold sm:grid-cols-[220px_1fr]">Department<select disabled value={departmentName} className={field}><option>{departmentName}</option></select></label>
      <label className="grid items-center gap-3 text-sm font-semibold sm:grid-cols-[220px_1fr]">Exam Year<select value={selection.examYear} onChange={(e) => setSelection({ ...selection, examYear: e.target.value })} className={field}>{examYears.map((year) => <option key={year}>{year}</option>)}</select></label>
      <label className="grid items-center gap-3 text-sm font-semibold sm:grid-cols-[220px_1fr]">Academic Year<select value={selection.academicYear} onChange={(e) => setSelection({ ...selection, academicYear: e.target.value })} className={field}>{academicYears.map((year) => <option key={year}>{year}</option>)}</select></label>
      <label className="grid items-center gap-3 text-sm font-semibold sm:grid-cols-[220px_1fr]">Backlog Semester<select value={selection.semester} onChange={(e) => setSelection({ ...selection, semester: e.target.value as "Odd" | "Even" })} className={field}><option>Odd</option><option>Even</option></select></label>
      <button type="button" disabled={loading} onClick={searchStudents} className="mt-2 w-fit rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white"><Search className="mr-1 inline h-4 w-4" />Search Students</button>
    </div>
    {message && <p role="status" className={`m-5 rounded p-3 text-sm font-semibold ${message.includes("successfully") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message}</p>}
    {rows.length > 0 && <div className="p-5"><h2 className="mb-3 text-xl font-bold">Backlog Student List</h2><div className="overflow-x-auto"><table className="w-full min-w-[1100px] border-collapse text-sm"><thead className="bg-[#082f57] text-white"><tr>{["Sl.","Student Name","Roll No","Registration No","Course Code","Failed Subject / Course Title","Marks","Result","Action"].map((heading) => <th key={heading} className="border border-slate-300 p-3">{heading}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id} className="odd:bg-white even:bg-slate-50"><td className="border p-2 text-center">{index + 1}</td><td className="border p-2">{row.studentName}</td><td className="border p-2">{row.rollNo}</td><td className="border p-2">{row.registrationNo}</td><td className="border p-2"><input value={row.courseCode} onChange={(e) => update(row.id, { courseCode: e.target.value })} className={field} placeholder="BECM 1201" /></td><td className="border p-2"><input value={row.courseTitle} onChange={(e) => update(row.id, { courseTitle: e.target.value })} className={field} placeholder="Course title" /></td><td className="border p-2"><input type="number" min="0" max="100" value={row.marks} onChange={(e) => update(row.id, { marks: e.target.value })} className={field} /></td><td className="border p-2"><select value={row.result} onChange={(e) => update(row.id, { result: e.target.value as "Pass" | "Fail" })} className={field}><option>Pass</option><option>Fail</option></select></td><td className="border p-2"><div className="flex justify-center gap-2"><button type="button" onClick={() => addSubject(row.studentId)} className="rounded bg-blue-600 p-2 text-white" title="Add another failed subject"><Plus className="h-4 w-4" /></button><button type="button" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} className="rounded bg-red-500 p-2 text-white" title="Remove subject"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div><div className="mt-6 text-center"><button type="button" disabled={saving} onClick={() => void save()} className="rounded bg-green-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"><Save className="mr-2 inline h-4 w-4" />{saving ? "Saving..." : "Save Backlog Results"}</button></div></div>}
  </div></section>;
}
