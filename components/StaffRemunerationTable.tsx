"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { defaultStaffRemunerationData, loadStaffRemunerationData, type StaffRemunerationData } from "@/lib/storage/staffRemuneration";

const inputClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function StaffRemunerationTable({ editable = false }: { editable?: boolean }) {
  const [data, setData] = useState<StaffRemunerationData>(defaultStaffRemunerationData);
  const [status, setStatus] = useState("");
  const [minimizedSections, setMinimizedSections] = useState<Set<string>>(() => new Set(defaultStaffRemunerationData.semesters.map((semester) => semester.id)));
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/staff/remuneration", { cache: "no-store", signal: controller.signal });
        const body = await response.json().catch(() => null) as { data?: StaffRemunerationData; error?: string } | null;
        if (!response.ok || !body?.data) throw new Error(body?.error || "Unable to load shared remuneration data");
        setData(body.data);
        setMinimizedSections(new Set(body.data.semesters.map((semester) => semester.id)));
      } catch (error) {
        if (controller.signal.aborted) return;
        const fallback = loadStaffRemunerationData();
        setData(fallback);
        setMinimizedSections(new Set(fallback.semesters.map((semester) => semester.id)));
        setStatus(error instanceof Error ? `${error.message}. Showing this device's saved data.` : "Unable to load shared data.");
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const updateSemester = (semesterId: string, title: string) => { setData((current) => ({ semesters: current.semesters.map((semester) => semester.id === semesterId ? { ...semester, title } : semester) })); setStatus(""); };
  const updateCourse = (semesterId: string, courseId: string, field: "code" | "title", value: string) => { setData((current) => ({ semesters: current.semesters.map((semester) => semester.id === semesterId ? { ...semester, courses: semester.courses.map((course) => course.id === courseId ? { ...course, [field]: value } : course) } : semester) })); setStatus(""); };
  const updateStaff = (semesterId: string, courseId: string, staffId: string, name: string) => setData((current) => ({ semesters: current.semesters.map((semester) => semester.id === semesterId ? { ...semester, courses: semester.courses.map((course) => course.id === courseId ? { ...course, staff: course.staff.map((member) => member.id === staffId ? { ...member, name } : member) } : course) } : semester) }));
  const addCourse = (semesterId: string) => setData((current) => ({ semesters: current.semesters.map((semester) => semester.id === semesterId ? { ...semester, courses: [...semester.courses, { id: crypto.randomUUID(), code: "", title: "", staff: [{ id: crypto.randomUUID(), name: "" }] }] } : semester) }));
  const removeCourse = (semesterId: string, courseId: string) => setData((current) => ({ semesters: current.semesters.map((semester) => semester.id === semesterId ? { ...semester, courses: semester.courses.filter((course) => course.id !== courseId) } : semester) }));
  const addStaff = (semesterId: string, courseId: string) => setData((current) => ({ semesters: current.semesters.map((semester) => semester.id === semesterId ? { ...semester, courses: semester.courses.map((course) => course.id === courseId ? { ...course, staff: [...course.staff, { id: crypto.randomUUID(), name: "" }] } : course) } : semester) }));
  const removeStaff = (semesterId: string, courseId: string, staffId: string) => setData((current) => ({ semesters: current.semesters.map((semester) => semester.id === semesterId ? { ...semester, courses: semester.courses.map((course) => course.id === courseId ? { ...course, staff: course.staff.filter((member) => member.id !== staffId) } : course) } : semester) }));
  const save = async () => {
    const password = window.prompt("Enter the staff password to save these shared changes:");
    if (password === null) return;
    setStatus("Saving changes to Neon...");
    try {
      const response = await fetch("/api/staff/remuneration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, data }),
      });
      const body = await response.json().catch(() => null) as { data?: StaffRemunerationData; error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "Unable to save changes");
      if (body?.data) setData(body.data);
      setStatus("Changes saved to Neon and shared across devices.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save changes.");
    }
  };
  const toggleSection = (semesterId: string) => setMinimizedSections((current) => {
    const next = new Set(current);
    if (next.has(semesterId)) next.delete(semesterId); else next.add(semesterId);
    return next;
  });

  return <div className="space-y-7">{data.semesters.map((semester) => {
    const isMinimized = minimizedSections.has(semester.id);
    return <section key={semester.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
      {editable ? <input className={`${inputClass} max-w-xl text-lg font-bold text-[#102555]`} value={semester.title} onChange={(event) => updateSemester(semester.id, event.target.value)} aria-label="Examination title" /> : <h2 className="text-xl font-bold text-[#102555]">{semester.title}</h2>}
      <button type="button" onClick={() => toggleSection(semester.id)} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" aria-expanded={!isMinimized} aria-controls={`${semester.id}-content`}>
        {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}{isMinimized ? "Expand" : "Minimize"}
      </button>
    </div>
    {!isMinimized && <div id={`${semester.id}-content`}>
    <div className="overflow-x-auto"><table className="w-full min-w-[840px] table-fixed border-collapse text-left text-sm">
      <thead className="bg-[#102555] text-white"><tr><th className="w-12 border-r border-white/20 px-4 py-3 text-center">Sl.</th><th className="w-44 border-r border-white/20 px-4 py-3">Course Code</th><th className="w-64 border-r border-white/20 px-4 py-3">Course Title</th><th className="w-[40%] px-4 py-3">Staff Member</th>{editable && <th className="w-24 px-4 py-3">Action</th>}</tr></thead>
      <tbody className="divide-y divide-slate-200">{semester.courses.map((course, courseIndex) => course.staff.map((member, memberIndex) => <tr key={member.id} className="align-top even:bg-slate-50/70">
        {memberIndex === 0 && <><td rowSpan={course.staff.length} className="border-r border-slate-200 px-4 py-3 text-center font-semibold">{courseIndex + 1}</td><td rowSpan={course.staff.length} className="border-r border-slate-200 px-4 py-3 font-bold text-indigo-700">{editable ? <input className={inputClass} value={course.code} onChange={(event) => updateCourse(semester.id, course.id, "code", event.target.value)} /> : course.code}</td><td rowSpan={course.staff.length} className="border-r border-slate-200 px-4 py-3 font-semibold">{editable ? <div className="space-y-3"><input className={inputClass} value={course.title} onChange={(event) => updateCourse(semester.id, course.id, "title", event.target.value)} /><button type="button" onClick={() => addStaff(semester.id, course.id)} className="block text-xs font-semibold text-indigo-700">+ Add Staff</button><button type="button" onClick={() => removeCourse(semester.id, course.id)} className="block text-xs font-semibold text-red-600">Delete Course</button></div> : course.title}</td></>}
        <td className="px-4 py-3 leading-6 text-slate-700">{editable ? <input className={inputClass} value={member.name} onChange={(event) => updateStaff(semester.id, course.id, member.id, event.target.value)} /> : member.name}</td>{editable && <td className="px-4 py-3"><button type="button" disabled={course.staff.length === 1} onClick={() => removeStaff(semester.id, course.id, member.id)} className="text-xs font-semibold text-red-600 disabled:text-slate-300">Delete</button></td>}
      </tr>))}</tbody>
    </table></div>
    {editable && <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6"><button type="button" onClick={() => addCourse(semester.id)} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">+ Add Course</button></div>}
    </div>}
  </section>})}
  {editable && <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => void save()} className="rounded-md bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700">Save All Changes</button>{status && <p className={`text-sm ${status.startsWith("Unable") || status.startsWith("Incorrect") ? "text-red-600" : status.startsWith("Saving") ? "text-slate-600" : "text-emerald-700"}`}>{status}</p>}</div>}
  </div>;
}
