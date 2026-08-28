"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Plus, Save, Trash2 } from "lucide-react";
import { defaultTeacherRankData, normalizeTeacherRankData, type TeacherRankData } from "@/lib/storage/teacherRank";

const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function TeacherRankList() {
  const [data, setData] = useState<TeacherRankData>(defaultTeacherRankData);
  const [minimized, setMinimized] = useState<Set<string>>(() => new Set(defaultTeacherRankData.departments.map((department) => department.id)));
  const [status, setStatus] = useState("Loading shared rank lists...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/teacher-rank", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as { data?: TeacherRankData; error?: string } | null;
        if (!response.ok || !body?.data) throw new Error(body?.error || "Unable to load teacher ranks");
        const normalized = normalizeTeacherRankData(body.data);
        setData(normalized);
        setMinimized(new Set(normalized.departments.map((department) => department.id)));
        setStatus("");
      })
      .catch((error) => {
        if (!controller.signal.aborted) setStatus(error instanceof Error ? `${error.message}. Showing the default lists.` : "Unable to load teacher ranks.");
      });
    return () => controller.abort();
  }, []);

  const toggle = (departmentId: string) => setMinimized((current) => {
    const next = new Set(current);
    if (next.has(departmentId)) next.delete(departmentId); else next.add(departmentId);
    return next;
  });
  const updateName = (departmentId: string, teacherId: string, name: string) => setData((current) => ({ departments: current.departments.map((department) => department.id === departmentId ? { ...department, teachers: department.teachers.map((teacher) => teacher.id === teacherId ? { ...teacher, name } : teacher) } : department) }));
  const move = (departmentId: string, index: number, direction: -1 | 1) => setData((current) => ({ departments: current.departments.map((department) => {
    if (department.id !== departmentId) return department;
    const target = index + direction;
    if (target < 0 || target >= department.teachers.length) return department;
    const teachers = [...department.teachers];
    [teachers[index], teachers[target]] = [teachers[target], teachers[index]];
    return { ...department, teachers };
  }) }));
  const add = (departmentId: string) => setData((current) => ({ departments: current.departments.map((department) => department.id === departmentId ? { ...department, teachers: [...department.teachers, { id: crypto.randomUUID(), name: "New Teacher" }] } : department) }));
  const remove = (departmentId: string, teacherId: string) => setData((current) => ({ departments: current.departments.map((department) => department.id === departmentId ? { ...department, teachers: department.teachers.filter((teacher) => teacher.id !== teacherId) } : department) }));

  const save = async () => {
    const password = window.prompt("Enter the staff password to save these shared rank lists:");
    if (password === null) return;
    setSaving(true);
    setStatus("Saving rank lists to Neon...");
    try {
      const cleaned = { departments: data.departments.map((department) => ({ ...department, teachers: department.teachers.filter((teacher) => teacher.name.trim()) })) };
      const response = await fetch("/api/teacher-rank", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, data: cleaned }) });
      const body = await response.json().catch(() => null) as { data?: TeacherRankData; error?: string } | null;
      if (!response.ok || !body?.data) throw new Error(body?.error || "Unable to save teacher ranks");
      setData(normalizeTeacherRankData(body.data));
      setStatus("Rank lists saved to Neon. Summary bills will use these orders.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save teacher ranks.");
    } finally { setSaving(false); }
  };

  return <div className="space-y-5">
    {data.departments.map((department) => {
      const isMinimized = minimized.has(department.id);
      return <section key={department.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div><h2 className="text-lg font-bold text-[#102555]">{department.title}</h2><p className="text-xs text-slate-500">{department.teachers.length} teacher(s)</p></div>
          <button type="button" onClick={() => toggle(department.id)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" aria-expanded={!isMinimized}>{isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}{isMinimized ? "Expand" : "Minimize"}</button>
        </div>
        {!isMinimized && <div>
          <div className="grid grid-cols-[72px_1fr_150px] bg-[#102555] px-4 py-3 text-sm font-bold text-white"><span className="text-center">Rank</span><span>Teacher Name</span><span className="text-center">Action</span></div>
          <div className="divide-y divide-slate-200">{department.teachers.map((teacher, index) => <div key={teacher.id} className="grid grid-cols-[72px_1fr_150px] items-center gap-3 px-4 py-3 even:bg-slate-50/70">
            <span className="text-center font-bold text-indigo-700">{index + 1}</span>
            <input className={inputClass} value={teacher.name} onChange={(event) => updateName(department.id, teacher.id, event.target.value)} aria-label={`${department.title} teacher at rank ${index + 1}`} />
            <div className="flex justify-center gap-1"><button type="button" disabled={index === 0} onClick={() => move(department.id, index, -1)} className="rounded-md p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-25" aria-label="Move up"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={index === department.teachers.length - 1} onClick={() => move(department.id, index, 1)} className="rounded-md p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-25" aria-label="Move down"><ArrowDown className="h-4 w-4" /></button><button type="button" onClick={() => remove(department.id, teacher.id)} className="rounded-md p-2 text-red-600 hover:bg-red-50" aria-label="Delete teacher"><Trash2 className="h-4 w-4" /></button></div>
          </div>)}{!department.teachers.length && <p className="px-5 py-8 text-center text-sm text-slate-500">No teachers added yet.</p>}</div>
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-4"><button type="button" onClick={() => add(department.id)} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add Teacher</button></div>
        </div>}
      </section>;
    })}
    <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save All Rank Lists"}</button>{status && <p className={`text-sm ${status.includes("saved") ? "text-emerald-700" : status.includes("Saving") || status.includes("Loading") ? "text-slate-600" : "text-red-600"}`}>{status}</p>}</div>
  </div>;
}