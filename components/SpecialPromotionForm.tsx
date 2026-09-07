"use client";
import { useRef, useState } from "react";
import type { OldStudentRecord } from "@/lib/storage/studentDirectory";
import type { SyllabusCourse } from "@/lib/storage/syllabuses";

export default function SpecialPromotionForm({ student, courses, onSaved, onClose }: { student: OldStudentRecord; courses: SyllabusCourse[]; onSaved: (records: OldStudentRecord[]) => void; onClose: () => void }) {
  const [examYear, setExamYear] = useState(String(new Date().getFullYear()));
  const [academicYear, setAcademicYear] = useState("4th");
  const [semester, setSemester] = useState("Even");
  const [gp, setGp] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const available = courses.filter(course => student.outstandingCourses.some(item => item.courseId === course.id));
  const credit = available.filter(course => selected.includes(course.id)).reduce((sum, course) => sum + Number(course.credit), 0);
  const field = "mt-1 w-full rounded border p-2";
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy.current) return; busy.current = true; setSaving(true); setError("");
    try {
      const response = await fetch("/api/students/old", { method: "PATCH", headers: { "Content-Type": "application/json", "If-Match": student.updatedAt }, body: JSON.stringify({ studentId: student.id, id: crypto.randomUUID(), examYear, academicYear, semester, examType: semester === "Backlog" ? "Backlog" : "Regular", gradePoints: Number(gp), courseIds: selected }) });
      const body = await response.json(); if (!response.ok) throw Error(body.error || "Unable to save"); onSaved(body.records);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save special promotion"); }
    finally { busy.current = false; setSaving(false); }
  }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-3"><form onSubmit={save} className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5"><div className="flex justify-between"><h2 className="text-xl font-bold">Special promotion — {student.name}</h2><button type="button" disabled={saving} onClick={onClose}>Close</button></div><p className="mt-2 text-sm">Record subjects cleared in a past examination. Enter only the grade points earned from these subjects; their credits will be added automatically to the student&apos;s existing totals.</p><div className="my-4 grid gap-4 md:grid-cols-3"><label>Exam year<input required pattern="\d{4}" value={examYear} onChange={e => setExamYear(e.target.value)} className={field}/></label><label>Academic year<select value={academicYear} onChange={e => setAcademicYear(e.target.value)} className={field}>{["1st","2nd","3rd","4th"].map(year => <option key={year}>{year}</option>)}</select></label><label>Semester / exam<select value={semester} onChange={e => setSemester(e.target.value)} className={field}>{["Odd","Even","Short Semester","Backlog"].map(value => <option key={value}>{value}</option>)}</select></label></div><h3 className="font-semibold">Subjects cleared</h3>{available.map(course => <label key={course.id} className="flex gap-3 border-b py-3"><input type="checkbox" checked={selected.includes(course.id)} onChange={e => setSelected(e.target.checked ? [...selected, course.id] : selected.filter(id => id !== course.id))}/>{course.code} — {course.title} ({course.credit} credits)</label>)}{!available.length && <p>No outstanding subjects remain.</p>}<label className="mt-4 block">Grade points earned in this exam (GP)<input required type="number" min="0" step="0.001" value={gp} onChange={e => setGp(e.target.value)} className={field}/></label><div className="my-4 rounded bg-blue-50 p-3 text-sm"><p>Credits cleared: {credit.toFixed(2)}</p><p>Updated earned credits: {(student.earnedCredit + credit).toFixed(2)}</p><p>Updated grade points: {(student.gradePoints + Number(gp || 0)).toFixed(3)}</p></div>{error && <p role="alert" className="my-3 text-red-700">{error}</p>}<button disabled={saving || !selected.length} className="rounded bg-green-600 px-5 py-2 font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save Special Promotion"}</button></form></div>;
}
