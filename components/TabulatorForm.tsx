"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { defaultTeacherRankData } from "@/lib/storage/teacherRank";
import { loadTabulators, saveTabulators, type TabulatorRecord } from "@/lib/storage/tabulators";

type TabulatorFormProps = {
  mode: "add" | "edit";
  recordId?: string;
};

type FormState = Omit<TabulatorRecord, "id" | "reportingDate">;

const emptyForm: FormState = {
  examType: "Regular",
  examYear: String(new Date().getFullYear()),
  academicYear: "1st",
  semester: "Odd",
  chairman: "",
  member1: "",
  member2: "",
  formDate: "",
};

const inputClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100";
const teacherNames = defaultTeacherRankData.departments.flatMap((department) => department.teachers.map((teacher) => teacher.name));
const years = Array.from({ length: 10 }, (_, index) => String(new Date().getFullYear() + 1 - index));

export default function TabulatorForm({ mode, recordId }: TabulatorFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [ready, setReady] = useState(mode === "add");
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "edit" || !recordId) return;
    const timer = window.setTimeout(async () => {
      const record = (await loadTabulators()).find((item) => item.id === recordId);
      if (record) {
        const { id: _id, reportingDate: _reportingDate, ...values } = record;
        void _id;
        void _reportingDate;
        setForm(record.examType === "Backlog" ? { ...values, semester: "" } : values);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mode, recordId]);

  const title = mode === "add" ? "Add Tabulators" : "Update Tabulator";
  const buttonText = mode === "add" ? "Save" : "Update";
  const buttonClass = mode === "add" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700";

  const fieldsComplete = useMemo(
    () => Object.entries(form).every(([field, value]) =>
      field === "semester" && form.examType === "Backlog" ? true : value.trim()
    ),
    [form]
  );
  const update = (field: keyof FormState, value: string) => setForm((current) =>
    field === "examType" && value === "Backlog"
      ? { ...current, examType: "Backlog", semester: "" }
      : { ...current, [field]: value }
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fieldsComplete) {
      setError("Please complete every field.");
      return;
    }
    const records = await loadTabulators();
    if (mode === "add") {
      records.push({ ...form, id: crypto.randomUUID(), reportingDate: form.formDate });
    } else {
      const index = records.findIndex((record) => record.id === recordId);
      if (index < 0) {
        setError("Tabulator record was not found.");
        return;
      }
      records[index] = { ...records[index], ...form };
    }
    await saveTabulators(records);
    router.push("/teacher/result/tabulators");
  };

  if (!ready) return null;

  const selectField = (label: string, field: keyof FormState, options: string[]) => (
    <label className="grid gap-2 sm:grid-cols-[150px_1fr] sm:items-center">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select className={inputClass} value={form[field]} onChange={(event) => update(field, event.target.value)} disabled={field === "semester" && form.examType === "Backlog"}>
        <option value="">Select</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );

  return (
    <div className="min-h-[calc(100vh-40px)] bg-slate-50 p-4 sm:p-7">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-[#12396d] px-6 py-5 text-center">
          <h1 className="text-2xl font-extrabold text-[#102555]">{title}</h1>
        </header>
        <form onSubmit={submit} className="grid gap-x-14 gap-y-4 p-6 lg:grid-cols-2">
          <div className="space-y-4">
            {selectField("Exam Type", "examType", ["Regular", "Backlog"])}
            {selectField("Academic Year", "academicYear", ["1st", "2nd", "3rd", "4th"])}
            {selectField("Chairman", "chairman", teacherNames)}
            {selectField("Member 2", "member2", teacherNames)}
          </div>
          <div className="space-y-4">
            {selectField("Exam Year", "examYear", years)}
            {selectField("Semester", "semester", ["Odd", "Even"])}
            {selectField("Member 1", "member1", teacherNames)}
            <label className="grid gap-2 sm:grid-cols-[190px_1fr] sm:items-center">
              <span className="text-sm font-semibold text-slate-700">Tabulator Create Date</span>
              <input type="date" className={inputClass} value={form.formDate} onChange={(event) => update("formDate", event.target.value)} />
            </label>
          </div>
          <div className="lg:col-span-2 lg:pl-[158px]">
            {error && <p role="alert" className="mb-3 text-sm font-medium text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => router.push("/teacher/result/tabulators")} className="rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Back</button>
              <button type="submit" className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${buttonClass}`}>{buttonText}</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}