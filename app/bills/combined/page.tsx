"use client";

import { useEffect, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { emptyBill } from "../create/components/emptyBill";
import type { ExaminationBillData } from "../create/components/types";
import { loadCurrentWork } from "@/lib/storage/draft";
import { loadAllIndividualTeacherInformation, type SavedIndividualTeacherInformation } from "@/lib/storage/individualTeacher";
import { collectTeacherNames, deriveTeacherRows } from "../individual/individualBill";
import CombinedBillPdfDocument, { type CombinedTeacherRecord } from "./CombinedBillPdfDocument";
import CombinedBillPdfPreview from "./CombinedBillPdfPreview";

export default function CombinedTeacherBillPage() {
  const [bill, setBill] = useState<ExaminationBillData>(emptyBill);
  const [information, setInformation] = useState<Record<string, SavedIndividualTeacherInformation>>({});
  const [downloading, setDownloading] = useState(false);
  const [excludedTeachers, setExcludedTeachers] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = loadCurrentWork();
      if (saved) setBill({ ...emptyBill, ...saved });
      setInformation(loadAllIndividualTeacherInformation());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const teachers = useMemo<CombinedTeacherRecord[]>(() =>
    collectTeacherNames(bill)
      .filter((teacher) => deriveTeacherRows(bill, teacher).length > 0)
      .map((teacher) => {
        const key = teacher.trim().toLocaleLowerCase();
        const saved = information[key] ?? Object.values(information).find(
          (record) => record.englishName?.trim().toLocaleLowerCase() === key
        );
        return { teacher, information: saved };
      }),
  [bill, information]);
  const selectedTeachers = useMemo(
    () => teachers.filter(({ teacher }) => !excludedTeachers.has(teacher.trim().toLocaleLowerCase())),
    [teachers, excludedTeachers]
  );
  const document = useMemo(() => <CombinedBillPdfDocument bill={bill} teachers={selectedTeachers} />, [bill, selectedTeachers]);

  const setTeacherSelected = (teacher: string, selected: boolean) => {
    const key = teacher.trim().toLocaleLowerCase();
    setExcludedTeachers((current) => {
      const next = new Set(current);
      if (selected) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const download = async () => {
    if (!selectedTeachers.length) return;
    setDownloading(true);
    try {
      const blob = await pdf(document).toBlob();
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = "combined-teacher-bills.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return <main className="mx-auto max-w-[1600px] p-6"><div className="mb-5 flex items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Combined Teacher Bill</h1><p className="text-sm text-slate-500">Select teachers on the left. Each selected bill uses a separate Legal page.</p></div><button onClick={download} disabled={downloading || !selectedTeachers.length} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">{downloading ? "Generating…" : `Download Combined PDF (${selectedTeachers.length})`}</button></div>{teachers.length ? <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]"><aside className="rounded-xl border bg-white p-4 shadow-sm lg:sticky lg:top-20"><div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="font-semibold">Select teacher bills</h2><p className="text-xs text-slate-500">{selectedTeachers.length} of {teachers.length} selected</p></div></div><div className="mb-3 flex gap-2"><button type="button" onClick={() => setExcludedTeachers(new Set())} className="rounded border px-2 py-1 text-xs hover:bg-slate-50">Select all</button><button type="button" onClick={() => setExcludedTeachers(new Set(teachers.map(({ teacher }) => teacher.trim().toLocaleLowerCase())))} className="rounded border px-2 py-1 text-xs hover:bg-slate-50">Clear all</button></div><div className="max-h-[calc(100vh-15rem)] space-y-1 overflow-y-auto pr-1">{teachers.map(({ teacher }, index) => { const checked = !excludedTeachers.has(teacher.trim().toLocaleLowerCase()); return <label key={teacher} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-slate-50"><input type="checkbox" checked={checked} onChange={(event) => setTeacherSelected(teacher, event.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" /><span><span className="mr-1 text-slate-400">{index + 1}.</span>{teacher}</span></label>; })}</div></aside><section className="min-w-0 rounded-xl bg-slate-300 p-5">{selectedTeachers.length ? <CombinedBillPdfPreview document={document} /> : <div className="rounded-xl bg-white p-10 text-center text-slate-500">Select at least one teacher to preview and generate the PDF.</div>}</section></div> : <div className="rounded-xl border bg-white p-8 text-center text-slate-500">No billable teacher rows are available.</div>}</main>;
}
