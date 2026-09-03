"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Search, ShieldCheck, UserMinus } from "lucide-react";
import type { ExpelledStudentRecord } from "@/lib/storage/expelledStudents";
import { academicYears, semesters, type StudentDirectoryRecord } from "@/lib/storage/studentDirectory";

export default function ExpelledStudentsAdmin() {
  const currentYear = String(new Date().getFullYear());
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [records, setRecords] = useState<ExpelledStudentRecord[]>([]);
  const [series, setSeries] = useState("");
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<StudentDirectoryRecord | null>(null);
  const [form, setForm] = useState({ resumeExamYear: currentYear, resumeAcademicYear: "1st", resumeSemester: "Odd", reason: "Unfair activity in examination" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/expelled-students", { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setStudents(body.students || []);
      setRecords(body.records || []);
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load students"));
  }, []);

  const seriesOptions = useMemo(() => [...new Set(students.map((student) => student.series))].sort((a, b) => b.localeCompare(a, undefined, { numeric: true })), [students]);
  const matches = useMemo(() => {
    if (!searched || !series) return [];
    const term = query.trim().toLowerCase();
    return students.filter((student) => student.series === series && !records.some((record) => record.studentId === student.id) && (!term || [student.name, student.rollNo, student.registrationNo].some((value) => value.toLowerCase().includes(term)))).sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }));
  }, [students, records, series, query, searched]);

  function choose(student: StudentDirectoryRecord) {
    const existing = records.find((record) => record.studentId === student.id);
    setSelected(student);
    setForm(existing ? { resumeExamYear: existing.resumeExamYear, resumeAcademicYear: existing.resumeAcademicYear, resumeSemester: existing.resumeSemester, reason: existing.reason } : { resumeExamYear: currentYear, resumeAcademicYear: student.year, resumeSemester: student.semester, reason: "Unfair activity in examination" });
    setMessage("");
  }

  async function save() {
    if (!selected) return;
    setSaving(true); setMessage("");
    const response = await fetch("/api/admin/expelled-students", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: selected.id, ...form }) });
    const body = await response.json().catch(() => null);
    if (response.ok) { setRecords(body.records || []); setSelected(null); setMessage("Student suspension saved. The roll will remain hidden from result preparation until the selected examination."); }
    else setMessage(body?.error || "Unable to save suspension.");
    setSaving(false);
  }

  async function reinstate(record: ExpelledStudentRecord) {
    if (!window.confirm(`Remove the suspension record for ${record.name} (${record.rollNo})?`)) return;
    const response = await fetch(`/api/admin/expelled-students?studentId=${encodeURIComponent(record.studentId)}`, { method: "DELETE" });
    const body = await response.json().catch(() => null);
    if (response.ok) { setRecords(body.records || []); setMessage("Student reinstated immediately."); }
    else setMessage(body?.error || "Unable to reinstate student.");
  }

  const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500";
  return <div>
    <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white"><UserMinus className="h-6 w-6"/></span><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">Exam discipline</p><h1 className="text-3xl font-extrabold">Expelled Students</h1></div></div>
    <p className="mt-3 text-slate-500">Suspend a student involved in unfair examination activity. Their roll stays out of result preparation, including after promotion, until the examination selected below.</p>
    {message && <p role="status" className={`mt-5 rounded-xl p-4 text-sm font-semibold ${message.includes("saved") || message.includes("reinstated") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message}</p>}
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-extrabold">Find a student</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]"><select value={series} onChange={(event) => { setSeries(event.target.value); setSearched(false); }} className={field}><option value="">Select series</option>{seriesOptions.map((value) => <option key={value}>{value}</option>)}</select><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, roll or registration number" className={field}/><button onClick={() => setSearched(true)} disabled={!series} className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white disabled:opacity-50"><Search className="h-4 w-4"/>Search</button></div>
      {searched && <div className="mt-4 grid gap-3">{matches.map((student) => <button key={student.id} onClick={() => choose(student)} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-left hover:border-blue-400 hover:bg-blue-50"><span><strong>{student.name}</strong><span className="mt-1 block text-sm text-slate-500">Roll {student.rollNo} · Registration {student.registrationNo}</span></span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{student.year} · {student.semester}</span></button>)}{!matches.length && <p className="py-6 text-center text-sm text-slate-500">No available student found in this series.</p>}</div>}
    </section>
    {records.length > 0 && <section className="mt-7"><h2 className="text-xl font-extrabold">Currently recorded</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{records.map((record) => <article key={record.studentId} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"><div className="flex justify-between gap-4"><div><h3 className="font-extrabold">{record.name}</h3><p className="text-sm text-slate-500">Roll {record.rollNo} · Series {record.series}</p></div><AlertTriangle className="h-6 w-6 text-amber-500"/></div><p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm"><strong>May continue:</strong> {record.resumeExamYear}, {record.resumeAcademicYear} Year, {record.resumeSemester} Semester</p><p className="mt-3 text-sm text-slate-600">{record.reason}</p><div className="mt-4 flex gap-2"><button onClick={() => { const student = students.find((item) => item.id === record.studentId); if (student) choose(student); }} className="rounded-lg border px-3 py-2 text-sm font-semibold">Edit</button><button onClick={() => void reinstate(record)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"><ShieldCheck className="h-4 w-4"/>Reinstate now</button></div></article>)}</div></section>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-extrabold">Set continuation examination</h2><p className="mt-2 text-sm text-slate-600">{selected.name} · Roll {selected.rollNo}</p><div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="text-sm font-semibold">Exam year<input type="number" min="2000" max="2100" value={form.resumeExamYear} onChange={(event) => setForm({ ...form, resumeExamYear: event.target.value })} className={field}/></label><label className="text-sm font-semibold">Academic year<select value={form.resumeAcademicYear} onChange={(event) => setForm({ ...form, resumeAcademicYear: event.target.value })} className={field}>{academicYears.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-sm font-semibold">Semester<select value={form.resumeSemester} onChange={(event) => setForm({ ...form, resumeSemester: event.target.value })} className={field}>{semesters.map((value) => <option key={value}>{value}</option>)}</select></label></div><label className="mt-4 block text-sm font-semibold">Reason<textarea rows={3} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} className={field}/></label><div className="mt-6 flex justify-end gap-3"><button disabled={saving} onClick={() => setSelected(null)} className="rounded-lg border px-4 py-2.5 font-semibold">Cancel</button><button disabled={saving || !form.resumeExamYear} onClick={() => void save()} className="rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save suspension"}</button></div></div></div>}
  </div>;
}
