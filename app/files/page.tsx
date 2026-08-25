"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { unicodeToBijoy } from "@abdalgolabs/ansi-unicode-converter";
import {
  ChevronDown,
  Download,
  FileText,
  FolderOpen,
  Menu,
  Plus,
  Save,
} from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import SeriesInput from "@/components/SeriesInput";
import CollapsibleTeacherCard from "@/components/CollapsibleTeacherCard";
import useThesisTopicsState from "@/components/useThesisTopicsState";
import BengaliNoticeTextEditor, { SutonnyNoticeText, toSutonnyNumber } from "@/components/BengaliNoticeTextEditor";
import logoImage from "@/app/images/image_03.png";
import { printNotice } from "@/lib/printNotice";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const computerDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatSutonnyDate = (value: string) => {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return toSutonnyNumber(`${day}/${month}/${year}`);
};

const headSignature = {
  name: "Rbve kvqjv kviwgb",
  designation: "wefvMxq cÖavb",
  department: "wewìs BwÄwbqvwis GÛ Kb÷ªvKkb g¨v‡bR‡g›U wefvM",
  university: "ivRkvnx cÖ‡KŠkj I cÖhyw³ wek¦we`¨vjq|",
} as const;

const createDefaultNotice = () => ({
  memoNumber: `weBwmGg/${new Date().getFullYear()}/001`,
  date: computerDate(),
  series: "2020",
});

const defaultDesignation = "সহকারী অধ্যাপক";
const storageKey = "ruet-thesis-distribution-last-generated";

const defaultRows = [
  { id: "teacher-1", name: "জনাব শায়লা শারমিন", designation: defaultDesignation, address: "বিইসিএম বিভাগ।", isDepartmentHead: true, rolls: "20120012, 20120020, 20120026, 20120028, 20120030" },
  { id: "teacher-2", name: "জনাব মেহেদী হাসান", designation: defaultDesignation, address: "বিইসিএম বিভাগ।", isDepartmentHead: false, rolls: "20120008, 20120009, 20120016, 20120018, 20120020" },
  { id: "teacher-3", name: "জনাব ফারুক আব্দুল্লাহ", designation: defaultDesignation, address: "বিইসিএম বিভাগ।", isDepartmentHead: false, rolls: "20120002, 20120007, 20120024, 20120025, 20120027" },
  { id: "teacher-4", name: "জনাব মোঃ আশরাফুল ইসলাম", designation: defaultDesignation, address: "বিইসিএম বিভাগ।", isDepartmentHead: false, rolls: "20120001, 20120006, 20120019, 20120023, 20120029" },
  { id: "teacher-5", name: "জনাব মোঃ নূর আলম রিয়াদ", designation: defaultDesignation, address: "বিইসিএম বিভাগ।", isDepartmentHead: false, rolls: "20120011, 20120013, 20120021" },
  { id: "teacher-6", name: "জনাব মোঃ তৌফিক হাসান", designation: "প্রভাষক", address: "বিইসিএম বিভাগ।", isDepartmentHead: false, rolls: "20120005, 20120014" },
  { id: "teacher-7", name: "জনাব মোঃ মেহেদী হাসান গালিব", designation: "প্রভাষক", address: "বিইসিএম বিভাগ।", isDepartmentHead: false, rolls: "20120003, 20120015" },
];

const designationOptions = [
  { value: "প্রভাষক", label: "প্রভাষক" },
  { value: "সহকারী অধ্যাপক", label: "সহকারী অধ্যাপক" },
  { value: "সহযোগী অধ্যাপক", label: "সহযোগী অধ্যাপক" },
  { value: "অধ্যাপক", label: "অধ্যাপক" },
] as const;

const layoutSectionLabels = {
  header: "Header",
  meta: "Memo and date",
  heading: "Notice heading",
  body: "Notice body",
  table: "Distribution table",
  signature: "Head signature",
} as const;

type LayoutSection = keyof typeof layoutSectionLabels;

const defaultLayout = {
  header: { fontSize: 12, banglaFontSize: 12, englishFontSize: 12, bottomFontSize: 10.8, gapAfter: 0 },
  meta: { fontSize: 16, gapAfter: 28 },
  heading: { fontSize: 30, gapAfter: 8 },
  body: { fontSize: 15, gapAfter: 12 },
  table: { fontSize: 15, gapAfter: 96 },
  signature: { fontSize: 15, gapAfter: 32 },
};

const defaultTableWidths = {
  table: 100,
  serial: 9,
  supervisor: 40,
  rolls: 40,
};

export default function FilesPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [thesisOpen, setThesisOpen] = useThesisTopicsState();
  const [notice, setNotice] = useState(createDefaultNotice);
  const [rows, setRows] = useState(defaultRows);
  const [departmentHeadName, setDepartmentHeadName] = useState<string>(headSignature.name);
  const [layout, setLayout] = useState(defaultLayout);
  const [tableWidths, setTableWidths] = useState(defaultTableWidths);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState("");
  const [customBody, setCustomBody] = useState("");
  const noticeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
        if (!saved) return;
        if (saved.notice) setNotice(saved.notice);
        if (Array.isArray(saved.rows)) setRows(saved.rows);
        if (saved.departmentHeadName) setDepartmentHeadName(saved.departmentHeadName);
        if (saved.layout) setLayout({
          ...defaultLayout,
          ...saved.layout,
          header: { ...defaultLayout.header, ...saved.layout.header },
        });
        if (saved.tableWidths) setTableWidths(saved.tableWidths);
        if (typeof saved.customBody === "string") setCustomBody(saved.customBody);
      } catch { /* Ignore invalid saved templates. */ }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  const update = (field: keyof ReturnType<typeof createDefaultNotice>, value: string) => {
    setNotice((current) => ({ ...current, [field]: value }));
  };

  const updateRow = (index: number, field: "name" | "designation" | "address" | "rolls", value: string) => {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setRows((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const reordered = [...current];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      return reordered;
    });
  };

  const updateLayout = (section: LayoutSection, field: "fontSize" | "gapAfter", value: number) => {
    setLayout((current) => ({
      ...current,
      [section]: { ...current[section], [field]: Math.max(0, value || 0) },
    }));
  };

  const updateHeaderFont = (field: "fontSize" | "banglaFontSize" | "englishFontSize" | "bottomFontSize", value: number) => {
    setLayout((current) => ({
      ...current,
      header: { ...current.header, [field]: Math.max(6, value || 6) },
    }));
  };

  const updateTableWidth = (field: keyof typeof defaultTableWidths, value: number) => {
    setTableWidths((current) => ({ ...current, [field]: Math.max(1, Math.min(100, value || 1)) }));
  };

  const generatePdf = async () => {
    const documentElement = noticeRef.current;
    if (!documentElement || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    setPdfStatus("");
    try {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);
      const imageData = await toPng(documentElement, {
        backgroundColor: "#ffffff",
        pixelRatio: Math.max(2, window.devicePixelRatio || 1),
        cacheBust: true,
        width: documentElement.scrollWidth,
        height: documentElement.scrollHeight,
        style: { boxShadow: "none", maxWidth: "none" },
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      pdf.addImage(imageData, "PNG", 0, 0, 210, 297, undefined, "FAST");
      pdf.save(`Thesis-Distribution-${notice.series || "notice"}.pdf`);
      localStorage.setItem(storageKey, JSON.stringify({ notice, rows, departmentHeadName, layout, tableWidths, customBody }));
      setPdfStatus("PDF generated and template saved.");
    } catch (error) {
      console.error("Unable to generate notice PDF", error);
      setPdfStatus("Unable to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1800px] bg-slate-100 text-slate-900">
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-[72px] items-center gap-4 border-b bg-white px-4 shadow-sm sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#102555]">Official Files</h1>
            <p className="text-sm text-slate-500">Prepare and preview departmental documents</p>
          </div>
        </header>

        <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[240px_minmax(320px,390px)_minmax(600px,1fr)]">
          <aside className="overflow-hidden rounded-xl border bg-white shadow-sm xl:sticky xl:top-[96px] xl:self-start">
            <div className="border-b px-4 py-4">
              <h2 className="font-semibold text-[#102555]">Topics and files</h2>
              <p className="mt-1 text-xs text-slate-500">Select a document to prepare</p>
            </div>
            <div className="p-3">
              <button type="button" onClick={() => setThesisOpen((open) => !open)} className="flex w-full items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2.5 text-left font-semibold text-indigo-800" aria-expanded={thesisOpen}>
                <ChevronDown className={`h-4 w-4 transition-transform ${thesisOpen ? "" : "-rotate-90"}`} />
                <FolderOpen className="h-5 w-5" />
                <span>Thesis</span>
                <span className="ml-auto text-[10px] font-medium">{thesisOpen ? "Minimize" : "Expand"}</span>
              </button>
              {thesisOpen && <>
              <Link
                href="/files"
                className="mt-1 flex w-full items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-left text-sm font-medium text-white shadow-sm"
                aria-current="page"
              >
                <span className="ml-5 border-l border-indigo-300 pl-3">
                  <FileText className="h-4 w-4" />
                </span>
                <span>Thesis Distribution</span>
              </Link>
              <Link
                href="/files/thesis-pre-defense"
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
              >
                <span className="ml-5 border-l border-slate-300 pl-3">
                  <FileText className="h-4 w-4" />
                </span>
                <span>Thesis Pre-defense Student (1)</span>
              </Link>
              <Link href="/files/thesis-final-defense" className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"><span className="ml-5 border-l border-slate-300 pl-3"><FileText className="h-4 w-4" /></span><span>Thesis Pre-defense Student (2)</span></Link>
              <Link href="/files/pre-defense-teacher" className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"><span className="ml-5 border-l border-slate-300 pl-3"><FileText className="h-4 w-4" /></span><span>Pre-defense Teacher</span></Link>
              <Link href="/files/thesis-final-defense-student" className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"><span className="ml-5 border-l border-slate-300 pl-3"><FileText className="h-4 w-4" /></span><span>Thesis Final Defense Student</span></Link>
              <Link href="/files/thesis-final-defense-teacher" className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"><span className="ml-5 border-l border-slate-300 pl-3"><FileText className="h-4 w-4" /></span><span>Thesis Final Defense Teacher</span></Link>
              <Link href="/files/external" className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"><span className="ml-5 border-l border-slate-300 pl-3"><FileText className="h-4 w-4" /></span><span>External</span></Link>
              <Link href="/files/attendance" className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"><span className="ml-5 border-l border-slate-300 pl-3"><FileText className="h-4 w-4" /></span><span>Attendance</span></Link>
              <Link href="/files/internal-external" className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"><span className="ml-5 border-l border-slate-300 pl-3"><FileText className="h-4 w-4" /></span><span>Internal-External</span></Link>
              </>}
            </div>
          </aside>

          <section className="rounded-xl border bg-white shadow-sm xl:sticky xl:top-[96px] xl:self-start">
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold text-[#102555]">Thesis Distribution</h2>
              <p className="mt-1 text-xs text-slate-500">Enter the notice information</p>
            </div>
            <div className="max-h-[calc(100vh-120px)] space-y-4 overflow-y-auto p-5">
              <label className="block text-sm font-medium text-slate-700">
                Memo number
                <input className={`${inputClass} font-['SutonnyMJ'] text-lg`} value={notice.memoNumber} onChange={(event) => update("memoNumber", event.target.value)} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Date
                <input type="date" className={inputClass} value={notice.date} onChange={(event) => update("date", event.target.value)} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Series
                <SeriesInput value={notice.series} onChange={(value) => update("series", value)} inputClassName={inputClass} placeholder="e.g. 2020" />
              </label>
              <div className="border-t pt-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">Layout controls</h3>
                  <p className="text-xs text-slate-500">Customize font size and gap after each section</p>
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg border bg-slate-50 p-2.5">
                    <span className="text-xs font-semibold text-slate-700">Header</span>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {([
                        ["fontSize", "Top heading"],
                        ["banglaFontSize", "Left Bangla"],
                        ["englishFontSize", "Right English"],
                        ["bottomFontSize", "Bottom address"],
                      ] as const).map(([field, label]) => (
                        <label key={field} className="text-[10px] font-medium text-slate-500">
                          {label} (px)
                          <input type="number" min="6" max="40" step="0.5" value={layout.header[field]} onChange={(event) => updateHeaderFont(field, Number(event.target.value))} className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-xs text-slate-800" />
                        </label>
                      ))}
                    </div>
                    <label className="mt-2 block text-[10px] font-medium text-slate-500">
                      Combined gap after header (px)
                      <input type="number" min="0" max="200" value={layout.header.gapAfter} onChange={(event) => updateLayout("header", "gapAfter", Number(event.target.value))} className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-xs text-slate-800" />
                    </label>
                  </div>
                  {(Object.keys(layoutSectionLabels) as LayoutSection[]).filter((section) => section !== "header").map((section) => (
                    <div key={section} className="grid grid-cols-[1fr_76px_76px] items-end gap-2 rounded-lg border bg-slate-50 p-2.5">
                      <span className="self-center text-xs font-semibold text-slate-700">{layoutSectionLabels[section]}</span>
                      <label className="text-[10px] font-medium text-slate-500">
                        Font (px)
                        <input type="number" min="6" max="40" value={layout[section].fontSize} onChange={(event) => updateLayout(section, "fontSize", Number(event.target.value))} className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-xs text-slate-800" />
                      </label>
                      <label className="text-[10px] font-medium text-slate-500">
                        Gap (px)
                        <input type="number" min="0" max="200" value={layout[section].gapAfter} onChange={(event) => updateLayout(section, "gapAfter", Number(event.target.value))} className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-xs text-slate-800" />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg border bg-slate-50 p-3">
                  <h4 className="text-xs font-semibold text-slate-700">Table width controls</h4>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {([
                      ["table", "Overall table"],
                      ["serial", "Serial column"],
                      ["supervisor", "Supervisor column"],
                      ["rolls", "Roll column"],
                    ] as const).map(([field, label]) => (
                      <label key={field} className="text-[10px] font-medium text-slate-500">
                        {label} (%)
                        <input type="number" min="1" max="100" value={tableWidths[field]} onChange={(event) => updateTableWidth(field, Number(event.target.value))} className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-xs text-slate-800" />
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">Column percentages are relative to the table width.</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Distribution rows</h3>
                    <p className="text-xs text-slate-500">Supervisor and assigned student rolls</p>
                  </div>
                  <button type="button" onClick={() => setRows((current) => [...current, { id: crypto.randomUUID(), name: "", designation: defaultDesignation, address: "বিইসিএম বিভাগ।", isDepartmentHead: false, rolls: "" }])} className="inline-flex items-center gap-1 rounded-md border border-indigo-200 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                    <Plus className="h-3.5 w-3.5" /> Add row
                  </button>
                </div>
                <div className="space-y-3">
                  {rows.map((row, index) => (
                    <CollapsibleTeacherCard key={row.id} name={row.name} index={index} isFirst={index === 0} isLast={index === rows.length - 1} onMoveUp={() => moveRow(index, -1)} onMoveDown={() => moveRow(index, 1)} onDelete={row.isDepartmentHead ? undefined : () => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>
                      <label className="block text-xs font-medium text-slate-600">
                        Supervisor name
                        <input lang="bn" style={{ fontFamily: '"Nirmala UI", Arial, sans-serif' }} className={inputClass} value={row.name} onChange={(event) => updateRow(index, "name", event.target.value)} />
                      </label>
                      <label className="mt-2 block text-xs font-medium text-slate-600">
                        Designation
                        <select lang="bn" style={{ fontFamily: '"Nirmala UI", Arial, sans-serif' }} className={inputClass} value={row.designation} onChange={(event) => updateRow(index, "designation", event.target.value)}>
                          {designationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label className="mt-2 block text-xs font-medium text-slate-600">
                        Address
                        <input lang="bn" style={{ fontFamily: '"Nirmala UI", Arial, sans-serif' }} className={inputClass} value={row.address} onChange={(event) => updateRow(index, "address", event.target.value)} />
                      </label>
                      <label className="mt-2 block text-xs font-medium text-slate-600">
                        Student roll numbers
                        <textarea rows={2} className={inputClass} value={row.rolls} onChange={(event) => updateRow(index, "rolls", event.target.value)} inputMode="numeric" />
                      </label>
                    </CollapsibleTeacherCard>
                  ))}
                </div>
              </div>
              <BengaliNoticeTextEditor value={customBody} onChange={setCustomBody} defaultValue={`এতদ্বারা সংশ্লিষ্ট সকলের অবগতির জন্য জানানো যাচ্ছে যে, অত্র বিভাগের ৪র্থ বর্ষ বিজোড় সেমিস্টার (${notice.series || "—"} সিরিজ) এর BECM 4000 (Undergraduate Thesis) কোর্সের থিসিস সুপারভাইজার বণ্টন নিম্নরূপ। শিক্ষার্থীদের নিজ নিজ সুপারভাইজারদের সাথে জরুরি ভিত্তিতে যোগাযোগ করে থিসিস কার্যক্রম পরিচালনার প্রয়োজনীয় পদক্ষেপ গ্রহণের নির্দেশ দেওয়া হচ্ছে।`} />
              <label className="block rounded-lg border bg-slate-50 p-3 text-sm font-medium text-slate-700">
                Department head name
                <span className="mt-0.5 block text-xs font-normal text-slate-500">Change the name shown in the compact signature block</span>
                <input
                  className={`${inputClass} font-['SutonnyMJ'] text-lg`}
                  value={departmentHeadName}
                  onChange={(event) => setDepartmentHeadName(event.target.value)}
                  placeholder={headSignature.name}
                />
              </label>
            </div>
          </section>

          <section className="min-w-0 rounded-xl border bg-slate-300 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-300 bg-white px-5 py-3">
              <div>
                <h2 className="font-semibold text-[#102555]">Preview</h2>
                <p className="text-xs text-slate-500">Live A4 document preview</p>
              </div>
              <div className="flex items-center gap-3">
                {pdfStatus && <span role="status" className={`text-xs ${pdfStatus.startsWith("Unable") ? "text-red-600" : "text-emerald-700"}`}>{pdfStatus}</span>}
                <button type="button" onClick={printNotice} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                  <Save className="h-4 w-4" /> Save as PDF
                </button>
                <button type="button" onClick={generatePdf} disabled={isGeneratingPdf} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-400">
                  <Download className="h-4 w-4" /> {isGeneratingPdf ? "Generating PDF…" : "Generate PDF"}
                </button>
              </div>
            </div>
            <div className="overflow-auto p-4 sm:p-6">
              <article ref={noticeRef} lang="bn" className="file-print-document mx-auto min-h-[1123px] w-[794px] max-w-full bg-white px-[6%] py-12 font-serif text-[14px] leading-[1.55] text-black shadow-xl print:min-h-0 print:w-full print:max-w-none print:shadow-none">
                <header className="notice-header border-b border-black pb-1">
                  <p style={{ fontSize: layout.header.fontSize * 0.8 }} className="text-center font-semibold leading-none text-[#2f78b7]">“Heaven&apos;s Light is Our Guide”</p>
                  <h2 style={{ fontSize: layout.header.fontSize * 1.7 }} className="mt-1 text-center font-bold leading-none tracking-tight text-[#145365]">Rajshahi University of Engineering &amp; Technology</h2>
                  <div className="mt-1 grid w-full grid-cols-[minmax(0,1fr)_68px_minmax(0,1fr)] items-center gap-3">
                    <div style={{ fontSize: layout.header.banglaFontSize }} className="header-bangla text-left leading-[1.25]">
                      <p className="font-bold text-[#174e72]">wefvMxq cÖav‡bi Kvh©vjq</p>
                      <p className="whitespace-nowrap font-bold text-[#8b2525]">wewìs BwÄwbqvwis GÛ KÝUªvKkb g¨v‡bR‡g›U wefvM</p>
                      <p className="font-semibold text-[#8b4a11]">ivRkvnx-6204,evsjv‡`k</p>
                    </div>
                    <Image src={logoImage} alt="RUET logo" className="mx-auto h-[62px] w-[62px] object-contain" priority />
                    <div style={{ fontSize: layout.header.englishFontSize }} className="text-left leading-[1.15]">
                      <p style={{ fontSize: layout.header.englishFontSize * 1.3 }} className="font-bold text-[#174e72]">Office of the Head</p>
                      <p className="font-bold text-[#9b2929]">Building Engineering &amp; Construction Management</p>
                      <p className="font-semibold text-[#8b4a11]">Rajshahi-6204, Bangladesh</p>
                    </div>
                  </div>
                  <p style={{ fontSize: layout.header.bottomFontSize }} className="mt-0.5 text-center font-semibold leading-none">Phone &amp; Fax : +88 0258886742, &nbsp; E-Mail : <span className="text-blue-700 underline">head@becm.ruet.ac.bd</span> , &nbsp; Website : www.becm.ruet.ac.bd</p>
                </header>

                <div style={{ marginTop: layout.header.gapAfter, fontSize: layout.meta.fontSize }} className="flex justify-between gap-4">
                  <p>¯§viK bs- {notice.memoNumber || "-"}</p>
                  <p>ZvwiLt {formatSutonnyDate(notice.date)} wLªt|</p>
                </div>

                <h1 style={{ marginTop: layout.meta.gapAfter, fontSize: layout.heading.fontSize }} className="text-center font-medium">-t weÁwß t-</h1>
                <p style={{ marginTop: layout.heading.gapAfter, fontSize: layout.body.fontSize }} className="text-justify leading-[1.65] [text-justify:inter-word]">
                  {customBody.trim() ? <SutonnyNoticeText text={customBody} /> : <>GZØviv mswkøó mK‡ji AeMwZi Rb¨ Rvbv‡bv hv‡”Q †h, AÎ wefv‡Mi 4_© el© we†Rvo †mwgóvi{" "}
                  ({notice.series ? toSutonnyNumber(notice.series) : "—"} wmwiR) Gi{" "}
                  <span className="notice-times" style={{ fontFamily: '"Times New Roman", Times, serif' }}>BECM 4000 (Undergraduate Thesis)</span> †Kv‡m©i w_wmm mycvifvBRvi e›Ub wb¤œiƒc| wkÿv_©x‡`i wbR wbR mycvifvBRvi†`i mv‡_ Riæix wfwË‡Z †hvMv‡hvM K‡i w_wmm Kvh©µg cwiPvjbvi cÖ‡qvRbxq c`‡ÿc MÖn‡bi wb‡`©k †`qv n‡”Q|</>}
                </p>

                <table style={{ marginTop: layout.body.gapAfter, fontSize: layout.table.fontSize, width: `${tableWidths.table}%`, marginInline: "auto" }} className="table-fixed border-collapse leading-[1.4]">
                  <thead>
                    <tr>
                      <th style={{ width: `${tableWidths.serial}%` }} className="border border-black px-2 py-1.5">µwgK bs</th>
                      <th style={{ width: `${tableWidths.supervisor}%` }} className="border border-black px-2 py-1.5">w_wmm mycvifvBRv‡ii bvg</th>
                      <th style={{ width: `${tableWidths.rolls}%` }} className="border border-black px-2 py-1.5">wkÿv_©x‡`i †ivj bs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={row.id}>
                        <td className="border border-black px-2 py-1 text-center align-middle">{index + 1}.</td>
                        <td className="border border-black px-2 py-1 align-top">
                          <p>{row.name ? unicodeToBijoy(row.name) : "—"}</p>
                          <p>{unicodeToBijoy(row.designation)}{row.isDepartmentHead ? ", wefvMxq cÖavb" : ""}, {unicodeToBijoy(row.address)}</p>
                        </td>
                        <td className="whitespace-pre-wrap border border-black px-2 py-1 text-center align-middle">{row.rolls || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: layout.table.gapAfter, marginBottom: layout.signature.gapAfter, fontSize: layout.signature.fontSize }} className="ml-auto mr-2 w-[300px] text-center leading-[1.25]">
                  <p style={{ fontSize: layout.signature.fontSize + 3 }} className="font-bold">({departmentHeadName.trim() || headSignature.name})</p>
                  <p className="font-normal">{headSignature.designation}</p>
                  <p className="font-normal">{headSignature.department}</p>
                  <p className="font-normal">{headSignature.university}</p>
                </div>
              </article>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
