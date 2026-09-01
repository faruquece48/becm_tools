"use client";

import { useState } from "react";
import type { VivaStudent } from "@/lib/storage/vivaMarks";

const department = "Building Engineering & Construction Management";
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, index) => String(currentYear + 1 - index));
const inputClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function AddVivaMarksPage() {
  const [examYear, setExamYear] = useState(String(currentYear));
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("");
  const [students, setStudents] = useState<VivaStudent[] | null>(null);
  const [published, setPublished] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const search = async () => {
    if (!academicYear || !semester) { setMessage("Select academic year and semester."); return; }
    setLoading(true); setMessage("");
    const params = new URLSearchParams({ department, examYear, academicYear, semester });
    const response = await fetch(`/api/viva-marks?${params}`, { cache: "no-store" }).catch(() => null);
    setLoading(false);
    if (!response) { setMessage("Unable to connect to the Viva Marks service."); return; }
    const payload = await response.json().catch(() => null) as { students?: VivaStudent[]; published?: boolean; error?: string } | null;
    if (!response.ok || !payload?.students) { setMessage(payload?.error || "Unable to search students."); return; }
    setStudents(payload.students); setPublished(Boolean(payload.published));
    if (payload.published) setMessage("Result Already Published. No Change Allowed.");
  };

  const updateStudent = (id: string, changes: Partial<VivaStudent>) => setStudents((current) => current?.map((student) => student.id === id ? { ...student, ...changes } : student) ?? null);
  const save = async () => {
    if (!students || published) { setMessage("Result Already Published. No Change Allowed."); return; }
    setSaving(true); setMessage("");
    const response = await fetch("/api/viva-marks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ department, examYear, academicYear, semester, students }) }).catch(() => null);
    setSaving(false);
    if (!response) { setMessage("Unable to connect to the Viva Marks service."); return; }
    const payload = await response.json().catch(() => null) as { students?: VivaStudent[]; error?: string } | null;
    if (!response.ok) { if (response.status === 409) setPublished(true); setMessage(payload?.error || "Unable to save viva marks."); return; }
    if (payload?.students) setStudents(payload.students);
    setMessage("Viva marks saved successfully in Neon.");
  };

  const warning = published && <div role="alert" className="mx-auto my-4 w-fit rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white">Result Already Published. No Change Allowed.</div>;

  return <div className="min-h-screen bg-slate-50 p-4 sm:p-7"><section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><header className="border-b border-[#12396d] px-6 py-5 text-center"><h1 className="text-2xl font-extrabold text-[#102555]">Board Viva Results</h1></header><div className="grid gap-x-14 gap-y-4 p-6 lg:grid-cols-2"><label className="grid gap-2 sm:grid-cols-[170px_1fr] sm:items-center"><span className="text-sm font-semibold">Department</span><select className={inputClass} value={department} disabled><option>{department}</option></select></label><label className="grid gap-2 sm:grid-cols-[170px_1fr] sm:items-center"><span className="text-sm font-semibold">Exam Year</span><select className={inputClass} value={examYear} onChange={(event)=>setExamYear(event.target.value)}>{years.map((year)=><option key={year}>{year}</option>)}</select></label><label className="grid gap-2 sm:grid-cols-[170px_1fr] sm:items-center"><span className="text-sm font-semibold">Academic Year</span><select className={inputClass} value={academicYear} onChange={(event)=>setAcademicYear(event.target.value)}><option value="">Select</option>{["1st","2nd","3rd","4th"].map((year)=><option key={year}>{year}</option>)}</select></label><label className="grid gap-2 sm:grid-cols-[170px_1fr] sm:items-center"><span className="text-sm font-semibold">Semester</span><select className={inputClass} value={semester} onChange={(event)=>setSemester(event.target.value)}><option value="">Select</option><option>Odd</option><option>Even</option></select></label><div className="flex justify-center lg:col-span-2"><button type="button" onClick={search} disabled={loading} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{loading?"Searching...":"Search Student"}</button></div></div><h2 className="border-y border-[#12396d] px-6 py-4 text-center text-lg font-bold">Add Viva Results</h2></section>

  {students && <section className="mt-5 overflow-hidden rounded-2xl border bg-white shadow-sm"><h2 className="p-5 text-2xl font-bold">Student List:</h2>{warning}<div className="w-full overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-sm"><thead className="bg-[#082f57] text-white"><tr>{["Sl.","Student Name","Registration No","Roll No","Registration Type","Marks","Present"].map((heading)=><th key={heading} className="border-r border-white/20 px-3 py-3 text-center">{heading}</th>)}</tr></thead><tbody>{students.map((student,index)=><tr key={student.id} className="border-b odd:bg-white even:bg-slate-50"><td className="px-3 py-3">{index+1}.</td><td className="px-3 py-3">{student.name}</td><td className="px-3 py-3">{student.registrationNo}</td><td className="px-3 py-3">{student.rollNo}</td><td className="px-3 py-3">{student.registrationType}</td><td className="px-3 py-2"><input type="number" min="0" max="100" disabled={published || !student.present} value={student.marks} onChange={(event)=>updateStudent(student.id,{marks:event.target.value})} className="h-9 w-full rounded border px-3 disabled:bg-slate-100" /></td><td className="px-3 py-3 whitespace-nowrap"><label><input type="radio" name={`present-${student.id}`} checked={student.present} disabled={published} onChange={()=>updateStudent(student.id,{present:true})} /> Yes</label> <label><input type="radio" name={`present-${student.id}`} checked={!student.present} disabled={published} onChange={()=>updateStudent(student.id,{present:false,marks:""})} /> No</label></td></tr>)}{!students.length&&<tr><td colSpan={7} className="p-10 text-center text-slate-500">No students found for this selection.</td></tr>}</tbody></table></div>{students.length>0&&(published?warning:<div className="flex justify-center p-5"><button type="button" onClick={save} disabled={saving} className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{saving?"Saving...":"Save"}</button></div>)}</section>}
  {message&&!published&&<p role="status" className={`mx-auto mt-4 w-fit rounded-lg px-4 py-2 text-sm font-semibold ${message.includes("successfully")?"bg-emerald-100 text-emerald-800":"bg-red-100 text-red-700"}`}>{message}</p>}</div>;
}