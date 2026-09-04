"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { FilePlus2, Link2, Mail } from "lucide-react";
import type { ColumnWidths, ExaminationBillData } from "../create/components/types";
import CombinedBillPdfPreview from "../combined/CombinedBillPdfPreview";


import { defaultIndividualBillLayout } from "../individual/IndividualLayoutEditor";
import { loadAllIndividualTeacherInformation, type SavedIndividualTeacherInformation } from "@/lib/storage/individualTeacher";
import { normalizeImportedBill, teachersForBill, type ImportedSummaryBill } from "../summary/summaryData";
import IndividualSummaryPdfDocument from "./IndividualSummaryPdfDocument";
import type { IndividualSummaryPage } from "./types";
import { deriveTeacherRows, rowAmount } from "../individual/individualBill";
import { loadSummarySession, type SummarySession } from "@/lib/storage/summary";
import SummaryPdfDocument from "../summary/SummaryPdfDocument";
import { withStaffRemunerationData } from "@/lib/staffRemunerationMatching";
import type { StaffRemunerationData } from "@/lib/storage/staffRemuneration";
import { defaultTeacherRankData, normalizeTeacherRankData, type TeacherRankData } from "@/lib/storage/teacherRank";

const defaultMetaWidths: ColumnWidths = { qualifications: 40, examination: 42, billNumber: 18 };
const defaultTableWidths: ColumnWidths = { serial: 6, descriptionGroup: 9, description: 22, course: 18, quantity: 10, courseCount: 8, classTestCount: 9, rate: 10, amount: 8 };
const defaultAddress = "বিইসিএম বিভাগ, রুয়েট।";
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const teacherKey = (name: string) => name.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase();
const fileSafeName = (name: string) => name.trim().replace(/[\\/:*?"<>|]/g, "-") || "Selected_Teacher";

const inputClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

function individualPagesFromSummary(
  bills: ImportedSummaryBill[],
  information: Record<string, SavedIndividualTeacherInformation>,
): IndividualSummaryPage[] {
  return [...bills]
    .sort((left, right) => collator.compare(left.fileName, right.fileName))
    .flatMap((item, billIndex) => {
      const bill = normalizeImportedBill(item.bill);
      return teachersForBill(bill).map(({ name: teacher, department }, teacherIndex) => {
        const saved = information[teacherKey(teacher)];
        return {
          id: `summary-${item.id}-${billIndex}-${teacherIndex}`,
          fileName: item.fileName,
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
        };
      });
    });
}

export default function IndividualSummaryBillPage() {
  const [pages, setPages] = useState<IndividualSummaryPage[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("Dept. of BECM, RUET");
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [teacherInformation, setTeacherInformation] = useState<Record<string, SavedIndividualTeacherInformation>>({});
  const [selectedEmailTeacherKeys, setSelectedEmailTeacherKeys] = useState<string[]>([]);
  const [emailing, setEmailing] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [attachFullSummary, setAttachFullSummary] = useState(true);
  const [summaryWorkspace, setSummaryWorkspace] = useState<SummarySession | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const connectSummary = useCallback(async () => {
    let workspace = loadSummarySession();
    try {
      const response = await fetch("/api/summary-workspace", { cache: "no-store" });
      const body = await response.json() as { workspace?: SummarySession | null };
      if (response.ok && Array.isArray(body.workspace?.bills) && body.workspace.bills.length) workspace = body.workspace;
    } catch {
      // The browser-saved Summary workspace remains available when Neon is offline.
    }
    const summaryBills = workspace?.bills ?? [];
    setSummaryWorkspace(workspace);
    let information = loadAllIndividualTeacherInformation();
    try {
      const response = await fetch("/api/teacher-information", { cache: "no-store" });
      const body = await response.json() as { records?: Record<string, SavedIndividualTeacherInformation> };
      if (response.ok) information = body.records ?? {};
    } catch {
      // Existing browser data is only a fallback when Neon cannot be reached.
    }
    setTeacherInformation(information);
    setSelectedEmailTeacherKeys([]);
    setEmailMessage("");
    const connectedPages = individualPagesFromSummary(summaryBills, information);
    const initialPage = connectedPages.find((page) => page.department === "Dept. of BECM, RUET") ?? connectedPages[0];
    setPages(connectedPages);
    setSelectedDepartment(initialPage?.department || "Dept. of BECM, RUET");
    setSelectedTeacher(initialPage?.teacher || "");
    setMessage(summaryBills.length
      ? `${summaryBills.length} saved Summary bill(s) connected; ${connectedPages.length} individual bill page(s) generated.`
      : "No saved bills were found on the Summary page.");
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void connectSummary(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [connectSummary]);
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
  const emailCandidates = useMemo(() => teachers.map(({ name, billCount }) => ({
    name,
    billCount,
    key: teacherKey(name),
    email: teacherInformation[teacherKey(name)]?.email?.trim() || "",
  })), [teacherInformation, teachers]);
  const emailableCandidates = emailCandidates.filter((candidate) => candidate.email);

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
    const information = Object.keys(teacherInformation).length ? teacherInformation : loadAllIndividualTeacherInformation();
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

  const sendSelectedBills = async () => {
    const recipients = emailCandidates.filter((candidate) => selectedEmailTeacherKeys.includes(candidate.key) && candidate.email);
    if (!recipients.length) return;
    setEmailing(true);
    setEmailMessage(`Preparing 1 of ${recipients.length}…`);
    let sent = 0;
    try {
      let fullSummaryBlob: Blob | null = null;
      if (attachFullSummary && summaryWorkspace?.bills.length) {
        setEmailMessage("Preparing the complete Summary book…");
        const [staffResponse, rankResponse] = await Promise.all([
          fetch("/api/staff/remuneration", { cache: "no-store" }),
          fetch(`/api/teacher-rank?refresh=${Date.now()}`, { cache: "no-store" }),
        ]);
        const staffBody = await staffResponse.json().catch(() => null) as { data?: StaffRemunerationData } | null;
        const rankBody = await rankResponse.json().catch(() => null) as { data?: TeacherRankData } | null;
        const staffData = staffResponse.ok ? staffBody?.data ?? null : null;
        const rankData = rankResponse.ok && rankBody?.data ? normalizeTeacherRankData(rankBody.data) : defaultTeacherRankData;
        const summaryBills = summaryWorkspace.bills.map((item) => ({ ...item, bill: withStaffRemunerationData(item.bill, staffData) }));
        const generatedSummaryBlob = await pdf(<SummaryPdfDocument bills={summaryBills} tableGap={summaryWorkspace.tableGap} remunerationListYear={summaryWorkspace.remunerationListYear} indexTableWidth={summaryWorkspace.indexTableWidth} rankData={rankData} />).toBlob();
        const deletedPages = [...new Set(summaryWorkspace.deletedPageIndexes)]
          .filter((index) => Number.isInteger(index) && index >= 0)
          .sort((left, right) => right - left);
        if (deletedPages.length) {
          const { PDFDocument } = await import("pdf-lib");
          const finalizedSummary = await PDFDocument.load(await generatedSummaryBlob.arrayBuffer());
          deletedPages
            .filter((index) => index < finalizedSummary.getPageCount())
            .forEach((index) => finalizedSummary.removePage(index));
          if (finalizedSummary.getPageCount() < 1) throw new Error("The finalized Summary has no pages to email.");
          const finalizedBytes = await finalizedSummary.save();
          fullSummaryBlob = new Blob([Uint8Array.from(finalizedBytes).buffer], { type: "application/pdf" });
        } else {
          fullSummaryBlob = generatedSummaryBlob;
        }
      }
      for (const recipient of recipients) {
        setEmailMessage(`Preparing ${sent + 1} of ${recipients.length}: ${recipient.name}`);
        const teacherPages = pages.filter((page) => teacherKey(page.teacher) === recipient.key && (!selectedDepartment || page.department === selectedDepartment));
        const blob = await pdf(<IndividualSummaryPdfDocument pages={teacherPages} />).toBlob();
        const form = new FormData();
        form.append("teacher", recipient.name);
        form.append("email", recipient.email);
        form.append("file", blob, `${fileSafeName(recipient.name)}_Individual_Summary_Bills.pdf`);
        if (fullSummaryBlob) form.append("summaryFile", fullSummaryBlob, `Complete_Summary_Book_${summaryWorkspace?.remunerationListYear || ""}.pdf`);
        const response = await fetch("/api/individual-bills/email", { method: "POST", body: form });
        const body = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(`${recipient.name}: ${body?.error || "Email could not be sent"}`);
        sent += 1;
      }
      setEmailMessage(`${sent} teacher bill email(s) sent successfully.`);
    } catch (error) {
      setEmailMessage(`${sent} sent. ${error instanceof Error ? error.message : "Email delivery failed."}`);
    } finally {
      setEmailing(false);
    }
  };


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
          <p className="text-sm text-slate-500">Automatically use bills saved on the Summary page, or add JSON files manually, to generate individual teacher bills.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void connectSummary()} className="flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"><Link2 className="h-4 w-4" />Load from Summary</button>
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
            <select value={selectedDepartment} onChange={(event) => { setSelectedDepartment(event.target.value); setSelectedTeacher(""); setSelectedEmailTeacherKeys([]); setEmailMessage(""); }} className={`${inputClass} mt-1.5`}>
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

          <div className="mt-4 shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-emerald-700" />
              <div><h3 className="text-sm font-semibold text-emerald-900">Email individual bills</h3><p className="text-xs text-emerald-700">{selectedDepartment || "All departments"}: choose teachers whose saved email will receive their own PDF.</p></div>
            </div>
            <label className="mt-3 flex items-center gap-2 border-b border-emerald-200 pb-2 text-xs font-semibold text-emerald-900">
              <input type="checkbox" checked={emailableCandidates.length > 0 && emailableCandidates.every((candidate) => selectedEmailTeacherKeys.includes(candidate.key))} onChange={(event) => setSelectedEmailTeacherKeys(event.target.checked ? emailableCandidates.map((candidate) => candidate.key) : [])} />
              Select all teachers with email ({emailableCandidates.length})
            </label>
            <div className="max-h-40 space-y-1 overflow-y-auto py-2">
              {emailCandidates.map((candidate) => <label key={candidate.key} className={`flex items-start gap-2 rounded px-1 py-1 text-xs ${candidate.email ? "text-slate-700" : "text-slate-400"}`}>
                <input type="checkbox" className="mt-0.5" disabled={!candidate.email || emailing} checked={selectedEmailTeacherKeys.includes(candidate.key)} onChange={(event) => setSelectedEmailTeacherKeys((current) => event.target.checked ? [...new Set([...current, candidate.key])] : current.filter((key) => key !== candidate.key))} />
                <span className="min-w-0"><span className="block font-medium">{candidate.name} ({candidate.billCount} bills)</span><span className="block truncate">{candidate.email || "No email saved in Teacher Information"}</span></span>
              </label>)}
              {!emailCandidates.length && <p className="py-2 text-xs text-slate-500">No teachers are available in this department.</p>}
            </div>
            <label className="mb-2 flex items-start gap-2 rounded border border-emerald-200 bg-white px-2 py-2 text-xs font-medium text-emerald-900">
              <input type="checkbox" className="mt-0.5" checked={attachFullSummary} disabled={!summaryWorkspace?.bills.length || emailing} onChange={(event) => setAttachFullSummary(event.target.checked)} />
              <span>Also attach the complete finalized Summary book to every selected teacher email</span>
            </label>
            <button type="button" disabled={emailing || !selectedEmailTeacherKeys.length} onClick={() => void sendSelectedBills()} className="w-full rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400">{emailing ? "Sending emails…" : `Send selected teacher bills (${selectedEmailTeacherKeys.length})`}</button>
            {emailMessage && <p role="status" className="mt-2 text-xs text-slate-700">{emailMessage}</p>}
          </div>

        </aside>

        <section className="min-w-0 rounded-xl bg-slate-300 p-5">
          {selectedPages.length ? <CombinedBillPdfPreview document={document} /> : <div className="rounded-xl bg-white p-12 text-center text-slate-500">Select a teacher to preview their individual bills.</div>}
        </section>
      </div>
    </main>
  );
}
