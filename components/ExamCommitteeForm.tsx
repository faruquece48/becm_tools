"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { defaultTeacherRankData } from "@/lib/storage/teacherRank";
import { loadExamCommittees, saveExamCommittees, type ExamCommitteeRecord } from "@/lib/storage/examCommittees";

type Props = { mode: "add" | "edit"; recordId?: string };
type FormState = Omit<ExamCommitteeRecord, "id">;
const currentYear = new Date().getFullYear();
const emptyForm: FormState = { examType: "Regular", examYear: String(currentYear), academicYear: "1st", semester: "Odd", chairman: "", member1: "", member2: "", member3: "", member4: "", examDate: "", resultPublishDate: "", memoNo: "", memoDate: "", resultNote: "" };
const inputClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100";
const teachers = Array.from(new Set(["Head", "Ashadul Islam", ...defaultTeacherRankData.departments.flatMap((department) => department.teachers.map((teacher) => teacher.name))]));
const years = Array.from({ length: 10 }, (_, index) => String(currentYear + 1 - index));

export default function ExamCommitteeForm({ mode, recordId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [ready, setReady] = useState(mode === "add");
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "edit" || !recordId) return;
    const timer = window.setTimeout(async () => {
      const record = (await loadExamCommittees()).find((item) => item.id === recordId);
      if (record) {
        const { id: _id, ...values } = record;
        void _id;
        setForm(record.examType === "Backlog" ? { ...values, semester: "" } : values);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mode, recordId]);

  const requiredComplete = useMemo(() => [form.examType, form.examYear, form.academicYear, form.chairman, form.member1, form.member2, form.member3, form.member4, form.examDate].every(Boolean) && (form.examType === "Backlog" || Boolean(form.semester)), [form]);
  const update = (field: keyof FormState, value: string) => setForm((current) => field === "examType" && value === "Backlog" ? { ...current, examType: "Backlog", semester: "" } : { ...current, [field]: value });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requiredComplete) { setError("Please complete all required committee fields."); return; }
    const records = await loadExamCommittees();
    if (mode === "add") records.push({ ...form, id: crypto.randomUUID() });
    else {
      const index = records.findIndex((record) => record.id === recordId);
      if (index < 0) { setError("Exam committee record was not found."); return; }
      records[index] = { ...form, id: records[index].id };
    }
    await saveExamCommittees(records);
    router.push("/teacher/result/exam-committee");
  };

  if (!ready) return null;
  const selectField = (label: string, field: keyof FormState, options: string[]) => <label className="grid gap-2 sm:grid-cols-[155px_1fr] sm:items-center"><span className="text-sm font-semibold text-slate-700">{label}</span><select className={inputClass} value={form[field]} onChange={(event) => update(field, event.target.value)} disabled={field === "semester" && form.examType === "Backlog"}><option value="">Select</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
  const textField = (label: string, field: keyof FormState, type = "text") => <label className="grid gap-2 sm:grid-cols-[155px_1fr] sm:items-center"><span className="text-sm font-semibold text-slate-700">{label}</span><input type={type} className={inputClass} value={form[field]} onChange={(event) => update(field, event.target.value)} /></label>;

  return <div className="min-h-[calc(100vh-40px)] bg-slate-50 p-4 sm:p-7"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><header className="border-b border-[#12396d] px-6 py-5 text-center"><h1 className="text-2xl font-extrabold text-[#102555]">{mode === "add" ? "Add Exam Committee" : "Update Exam Committee"}</h1></header><form onSubmit={submit} className="grid gap-x-12 gap-y-4 p-6 lg:grid-cols-2"><div className="space-y-4">{selectField("Exam Type", "examType", ["Regular", "Backlog"])}{selectField("Academic Year", "academicYear", ["1st", "2nd", "3rd", "4th"])}{selectField("Chairman", "chairman", teachers)}{selectField("Member 2", "member2", teachers)}{textField("Member 4 (External)", "member4")}{textField("Result Publish Date", "resultPublishDate", "date")}{textField("Memo Date", "memoDate", "date")}</div><div className="space-y-4">{selectField("Exam Year", "examYear", years)}{selectField("Semester", "semester", ["Odd", "Even"])}{selectField("Member 1", "member1", teachers)}{selectField("Member 3", "member3", teachers)}{textField("Exam Date", "examDate", "date")}{textField("Memo No", "memoNo")}<label className="grid gap-2 sm:grid-cols-[155px_1fr]"><span className="pt-2 text-sm font-semibold text-slate-700">Result Note</span><textarea className="min-h-20 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" value={form.resultNote} onChange={(event) => update("resultNote", event.target.value)} /></label></div><div className="lg:col-span-2 lg:pl-[163px]">{error && <p role="alert" className="mb-3 text-sm font-medium text-red-600">{error}</p>}<div className="flex gap-3"><button type="button" onClick={() => router.push("/teacher/result/exam-committee")} className="rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Back</button><button type="submit" className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${mode === "add" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>{mode === "add" ? "Save" : "Update"}</button></div></div></form></section></div>;
}