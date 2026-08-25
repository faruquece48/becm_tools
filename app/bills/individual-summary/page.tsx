"use client";

import { useMemo, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { FilePlus2, Trash2 } from "lucide-react";
import type { ColumnWidths, ExaminationBillData } from "../create/components/types";
import CombinedBillPdfPreview from "../combined/CombinedBillPdfPreview";
import ColumnWidthEditor from "../preview/components/ColumnWidthEditor";
import SectionPanel from "../preview/components/SectionPanel";
import IndividualLayoutEditor, {
  defaultIndividualBillLayout,
} from "../individual/IndividualLayoutEditor";
import { loadAllIndividualTeacherInformation } from "@/lib/storage/individualTeacher";
import { normalizeImportedBill, teachersForBill } from "../summary/summaryData";
import IndividualSummaryPdfDocument from "./IndividualSummaryPdfDocument";
import type { IndividualSummaryPage } from "./types";
import { deriveTeacherRows, rowAmount } from "../individual/individualBill";

const defaultMetaWidths: ColumnWidths = { qualifications: 40, examination: 42, billNumber: 18 };
const defaultTableWidths: ColumnWidths = { serial: 6, descriptionGroup: 9, description: 22, course: 18, quantity: 10, courseCount: 8, classTestCount: 9, rate: 10, amount: 8 };
const defaultAddress = "বিইসিএম বিভাগ, রুয়েট।";
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const teacherKey = (name: string) => name.trim().toLocaleLowerCase();
const fileSafeName = (name: string) => name.trim().replace(/[\\/:*?"<>|]/g, "-") || "Selected_Teacher";

const inputClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

export default function IndividualSummaryBillPage() {
  const [pages, setPages] = useState<IndividualSummaryPage[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("Dept. of BECM, RUET");
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const departments = useMemo(
    () => Array.from(new Set(["Dept. of BECM, RUET", ...pages.map((page) => page.department).filter(Boolean)]))
      .sort((left, right) => left.localeCompare(right)),
    [pages]
  );
  const teachers = useMemo(() => {
    const names = new Map<string, { name: string; billCount: number }>();
    pages
      .filter((page) => !selectedDepartment || page.department === selectedDepartment)
      .forEach((page) => {
        const key = teacherKey(page.teacher);
        const existing = names.get(key);
        names.set(key, { name: existing?.name || page.teacher, billCount: (existing?.billCount || 0) + 1 });
      });
    return Array.from(names.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [pages, selectedDepartment]);
  const selectedPages = useMemo(
    () => pages
      .filter((page) => (
        teacherKey(page.teacher) === teacherKey(selectedTeacher)
        && (!selectedDepartment || page.department === selectedDepartment)
      ))
      .sort((left, right) => collator.compare(left.fileName, right.fileName)),
    [pages, selectedTeacher, selectedDepartment]
  );
  const document = useMemo(
    () => <IndividualSummaryPdfDocument pages={selectedPages} />,
    [selectedPages]
  );
  const totalBillAmount = useMemo(
    () => selectedPages.reduce(
      (total, page) => total + deriveTeacherRows(page.bill, page.teacher).reduce(
        (billTotal, row) => billTotal + rowAmount(row),
        0
      ),
      0
    ),
    [selectedPages]
  );
  const taxAmount = totalBillAmount * 0.2;
  const remainingAmount = totalBillAmount * 0.8;

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const information = loadAllIndividualTeacherInformation();
    const imported: IndividualSummaryPage[] = [];
    const rejected: string[] = [];
    const sortedFiles = Array.from(files).sort((left, right) => collator.compare(left.name, right.name));

    for (const [fileIndex, file] of sortedFiles.entries()) {
      try {
        const parsed = JSON.parse(await file.text()) as Partial<ExaminationBillData>;
        if (!parsed.billInfo || typeof parsed.billInfo !== "object") throw new Error("Missing bill information");
        const bill = normalizeImportedBill(parsed);
        teachersForBill(bill).forEach(({ name: teacher, department }, teacherIndex) => {
          const saved = information[teacherKey(teacher)];
          imported.push({
            id: `${Date.now()}-${fileIndex}-${teacherIndex}-${file.name}`,
            fileName: file.name,
            bill,
            teacher,
            department: department || saved?.departmentKey || "",
            nameBangla: saved?.nameBangla || teacher.replace(/^(mr|mrs|ms|mst)\.?\s+/i, ""),
            designationBangla: saved?.designationBangla || "",
            addressBangla: saved?.addressBangla || defaultAddress,
            accountNumber: saved?.accountNumber || "",
            metaWidths: { ...defaultMetaWidths },
            tableWidths: { ...defaultTableWidths },
            layoutSettings: {
              fontSizes: { ...defaultIndividualBillLayout.fontSizes },
              sectionGaps: { ...defaultIndividualBillLayout.sectionGaps },
            },
          });
        });
      } catch {
        rejected.push(file.name);
      }
    }

    setPages((current) => [...current, ...imported]);
    setSelectedTeacher((current) => current || imported[0]?.teacher || "");
    setMessage(rejected.length
      ? `${imported.length} individual bill page(s) added. Could not read: ${rejected.join(", ")}`
      : `${imported.length} individual bill page(s) added.`);
    if (inputRef.current) inputRef.current.value = "";
  };

  const updatePage = (id: string, update: Partial<IndividualSummaryPage>) =>
    setPages((current) => current.map((page) => page.id === id ? { ...page, ...update } : page));

  const download = async () => {
    if (!selectedPages.length) return;
    setDownloading(true);
    try {
      const blob = await pdf(document).toBlob();
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${fileSafeName(selectedTeacher)}_Individual_Summary_Bills.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1700px] p-6">
      <input ref={inputRef} type="file" accept="application/json,.json" multiple className="hidden" onChange={(event) => void importFiles(event.target.files)} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Individual Summary Bill</h1>
          <p className="text-sm text-slate-500">Import multiple bill JSON files and generate a separate Legal-page individual bill for every billable teacher.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><FilePlus2 className="h-4 w-4" />Add JSON files</button>
          <button type="button" onClick={download} disabled={!selectedPages.length || downloading} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">{downloading ? "Generating…" : `Download Selected Teacher (${selectedPages.length})`}</button>
        </div>
      </div>
      {message && <p className="mb-4 rounded-md border bg-white px-3 py-2 text-sm text-slate-600">{message}</p>}

      <div className="grid items-start gap-5 lg:grid-cols-[430px_minmax(0,1fr)]">
        <aside className="rounded-xl border bg-white p-4 shadow-sm lg:sticky lg:top-20 lg:flex lg:max-h-[calc(100vh-6rem)] lg:flex-col">
          <div className="shrink-0"><h2 className="font-semibold">Select teacher</h2><p className="text-xs text-slate-500">The preview and PDF include only the selected teacher.</p></div>
          <label className="mt-3 block shrink-0 text-xs font-medium text-slate-600">
            Department
            <select value={selectedDepartment} onChange={(event) => { setSelectedDepartment(event.target.value); setSelectedTeacher(""); }} className={`${inputClass} mt-1.5`}>
              <option value="">All departments</option>
              {departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
          </label>
          <label className="mt-3 block shrink-0 text-xs font-medium text-slate-600">
            Teacher name
            <select value={selectedTeacher} onChange={(event) => setSelectedTeacher(event.target.value)} className={`${inputClass} mt-1.5`}>
              <option value="">Select teacher</option>
              {teachers.map(({ name, billCount }) => <option key={teacherKey(name)} value={name}>{name} ({billCount} bills)</option>)}
            </select>
          </label>
          {selectedTeacher && (
            <div className="mt-3 shrink-0 rounded-lg border bg-slate-50 p-3">
              <h3 className="text-sm font-semibold text-slate-800">Amount summary</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3"><dt className="text-slate-600">Total bill amount</dt><dd className="font-semibold">৳ {totalBillAmount.toLocaleString("en-BD", { maximumFractionDigits: 2 })}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-slate-600">Tax amount (20%)</dt><dd className="font-semibold text-red-600">৳ {taxAmount.toLocaleString("en-BD", { maximumFractionDigits: 2 })}</dd></div>
                <div className="flex items-center justify-between gap-3 border-t pt-2"><dt className="font-medium text-slate-700">Remaining amount (80%)</dt><dd className="font-bold text-emerald-700">৳ {remainingAmount.toLocaleString("en-BD", { maximumFractionDigits: 2 })}</dd></div>
              </dl>
            </div>
          )}

          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {selectedTeacher && <div className="sticky top-0 z-10 bg-white pb-1"><h3 className="text-sm font-semibold">Bills for {selectedTeacher}</h3><p className="text-xs text-slate-500">{selectedPages.length} bill page(s)</p></div>}
          {selectedPages.map((page, index) => (
            <SectionPanel key={page.id} title={`${index + 1}. ${page.fileName} — Bill ${page.bill.billInfo.billNo || "—"}`}>
              <p className="truncate text-xs text-slate-500">{page.fileName}</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="col-span-2 text-xs text-slate-600">Name (Bangla)<input value={page.nameBangla} onChange={(event) => updatePage(page.id, { nameBangla: event.target.value })} className={`${inputClass} mt-1`} /></label>
                <label className="text-xs text-slate-600">Designation<input value={page.designationBangla} onChange={(event) => updatePage(page.id, { designationBangla: event.target.value })} className={`${inputClass} mt-1`} /></label>
                <label className="text-xs text-slate-600">Account number<input value={page.accountNumber} onChange={(event) => updatePage(page.id, { accountNumber: event.target.value })} className={`${inputClass} mt-1`} /></label>
                <label className="col-span-2 text-xs text-slate-600">Address<input value={page.addressBangla} onChange={(event) => updatePage(page.id, { addressBangla: event.target.value })} className={`${inputClass} mt-1`} /></label>
              </div>
              <div><h3 className="mb-2 text-sm font-semibold">Information table widths</h3><ColumnWidthEditor widths={page.metaWidths} setWidths={(metaWidths) => updatePage(page.id, { metaWidths })} labels={{ qualifications: "Qualifications", examination: "Examination", billNumber: "Bill number" }} /></div>
              <div><h3 className="mb-2 text-sm font-semibold">Remuneration table widths</h3><ColumnWidthEditor widths={page.tableWidths} setWidths={(tableWidths) => updatePage(page.id, { tableWidths })} labels={{ serial: "Sl. No.", descriptionGroup: "Description", description: "Individual description", course: "Course", quantity: "Scripts/students", courseCount: "Courses", classTestCount: "Class tests", rate: "Rate", amount: "Amount" }} /></div>
              <IndividualLayoutEditor settings={page.layoutSettings} setSettings={(layoutSettings) => updatePage(page.id, { layoutSettings })} />
              <button type="button" onClick={() => setPages((current) => current.filter((item) => item.id !== page.id))} className="flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Remove this bill page</button>
            </SectionPanel>
          ))}
          {selectedTeacher && selectedPages.length === 0 && <div className="rounded-lg border border-dashed p-5 text-center text-sm text-slate-500">This teacher has no remaining bill pages.</div>}
          </div>
        </aside>

        <section className="min-w-0 rounded-xl bg-slate-300 p-5">
          {selectedPages.length ? <CombinedBillPdfPreview document={document} /> : <div className="rounded-xl bg-white p-12 text-center text-slate-500">Select a teacher to preview their individual bills.</div>}
        </section>
      </div>
    </main>
  );
}
