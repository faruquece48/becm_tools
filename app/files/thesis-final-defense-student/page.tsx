"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileText, FolderOpen, Menu, Save } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import useThesisTopicsState from "@/components/useThesisTopicsState";
import SeriesInput from "@/components/SeriesInput";
import BengaliNoticeTextEditor, { bijoyNoticeToUnicode, SutonnyNoticeText, toSutonnyNumber } from "@/components/BengaliNoticeTextEditor";
import logoImage from "@/app/images/image_03.png";
import { printNotice } from "@/lib/printNotice";

const inputClass = "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const computerDate = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const formatDate = (value: string) => { if (!value) return "-"; const [year, month, day] = value.split("-"); return toSutonnyNumber(`${day}/${month}/${year}`); };
const defaultHead = { name: "Rbve kvqjv kviwgb", designation: "wefvMxq cÖavb", department: "wewìs BwÄwbqvwis GÛ Kb÷ªvKkb g¨v‡bR‡g›U wefvM", university: "ivRkvnx cÖ‡KŠkj I cÖhyw³ wek¦we`¨vjq|" };
const bodyStart = "GZØviv weBwmGg wefv‡Mi 4_© el© †Rvo †mwgóvi (wmwiR ";
const bodyBeforeCourse = ") Gi wkÿv_©x‡`i AeMwZi Rb¨ Rvbv‡bv hv‡”Q †h, ";
const bodyEnd = " ‡Kv‡m©i P~ovšÍ wi‡cvU© Ges †cÖ‡R‡›Ukb Dc¯’vcb Kivi Rb¨ wb¤œewY©Z QK Abyhvqx mgq m~Px wba©viY Kiv n‡q‡Q| mswkøó wkÿv_©x‡`i h_vmg‡q Dcw¯’Z n‡q cixÿvq AskMÖn‡Yi Rb¨ wb‡`©k †`qv hv‡”Q|";

const storageKey = "ruet-thesis-final-defense-student-saved";

export default function ThesisFinalDefenseStudentPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [thesisOpen, setThesisOpen] = useThesisTopicsState();
  const [memoNumber, setMemoNumber] = useState(`weBwmGg/${new Date().getFullYear()}/001`);
  const [noticeDate, setNoticeDate] = useState(computerDate);
  const [series, setSeries] = useState("2020");
  const [defenseDate, setDefenseDate] = useState(computerDate);
  const [period, setPeriod] = useState("morning");
  const [time, setTime] = useState("09.00");
  const [departmentHeadName, setDepartmentHeadName] = useState(defaultHead.name);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [customBody, setCustomBody] = useState("");
  const noticeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (!saved) return;
      if (saved.memoNumber) setMemoNumber(saved.memoNumber);
      if (saved.noticeDate) setNoticeDate(saved.noticeDate);
      if (saved.series) setSeries(saved.series);
      if (saved.defenseDate) setDefenseDate(saved.defenseDate);
      if (saved.period) setPeriod(saved.period);
      if (saved.time) setTime(saved.time);
      if (saved.departmentHeadName) setDepartmentHeadName(saved.departmentHeadName);
      if (typeof saved.customBody === "string") setCustomBody(saved.customBody);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const generatePdf = async () => { const element = noticeRef.current; if (!element || isGenerating) return; setIsGenerating(true); setStatus(""); try { await document.fonts.ready; const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]); const data = await toPng(element, { backgroundColor: "#fff", pixelRatio: Math.max(2, window.devicePixelRatio || 1), cacheBust: true }); const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true }); pdf.addImage(data, "PNG", 0, 0, 210, 297, undefined, "FAST"); pdf.save(`Thesis-Final-Defense-Student-${series || "notice"}.pdf`); setStatus("PDF generated."); } catch (error) { console.error(error); setStatus("Unable to generate PDF."); } finally { setIsGenerating(false); } };
  const linkClass = "mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-indigo-50";

  return <div className="mx-auto flex min-h-screen w-full max-w-[1800px] bg-slate-100 text-slate-900"><AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} /><main className="min-w-0 flex-1">
    <header className="sticky top-0 z-40 flex h-[72px] items-center gap-4 border-b bg-white px-4 shadow-sm sm:px-6"><button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 lg:hidden" aria-label="Open navigation"><Menu className="h-6 w-6" /></button><div><h1 className="text-xl font-bold text-[#102555]">Official Files</h1><p className="text-sm text-slate-500">Prepare and preview departmental documents</p></div></header>
    <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[240px_minmax(320px,390px)_minmax(600px,1fr)]">
      <aside className="overflow-hidden rounded-xl border bg-white shadow-sm xl:sticky xl:top-[96px] xl:self-start"><div className="border-b px-4 py-4"><h2 className="font-semibold text-[#102555]">Topics and files</h2><p className="text-xs text-slate-500">Select a document to prepare</p></div><div className="p-3"><button type="button" onClick={() => setThesisOpen((open) => !open)} className="flex w-full items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2.5 text-left font-semibold text-indigo-800"><ChevronDown className={`h-4 w-4 ${thesisOpen ? "" : "-rotate-90"}`} /><FolderOpen className="h-5 w-5" />Thesis<span className="ml-auto text-[10px] font-medium">{thesisOpen ? "Minimize" : "Expand"}</span></button>{thesisOpen && <><Link href="/files" className={linkClass}><FileText className="ml-5 h-4 w-4" />Thesis Distribution</Link><Link href="/files/thesis-pre-defense" className={linkClass}><FileText className="ml-5 h-4 w-4" />Thesis Pre-defense Student (1)</Link><Link href="/files/thesis-final-defense" className={linkClass}><FileText className="ml-5 h-4 w-4" />Thesis Pre-defense Student (2)</Link><Link href="/files/pre-defense-teacher" className={linkClass}><FileText className="ml-5 h-4 w-4" />Pre-defense Teacher</Link><Link href="/files/thesis-final-defense-student" className="mt-1 flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm text-white shadow-sm" aria-current="page"><FileText className="ml-5 h-4 w-4" />Thesis Final Defense Student</Link><Link href="/files/thesis-final-defense-teacher" className={linkClass}><FileText className="ml-5 h-4 w-4" />Thesis Final Defense Teacher</Link><Link href="/files/external" className={linkClass}><FileText className="ml-5 h-4 w-4" />External</Link><Link href="/files/attendance" className={linkClass}><FileText className="ml-5 h-4 w-4" />Attendance</Link><Link href="/files/internal-external" className={linkClass}><FileText className="ml-5 h-4 w-4" />Internal-External</Link></>}</div></aside>
      <section className="rounded-xl border bg-white shadow-sm xl:sticky xl:top-[96px] xl:self-start"><div className="border-b px-5 py-4"><h2 className="font-semibold text-[#102555]">Thesis Final Defense Sudent</h2><p className="text-xs text-slate-500">Enter the final-defense schedule</p></div><div className="max-h-[calc(100vh-120px)] space-y-4 overflow-y-auto p-5">
        <label className="block text-sm font-medium">Memo number<input className={`${inputClass} font-['SutonnyMJ'] text-lg`} value={memoNumber} onChange={(event) => setMemoNumber(event.target.value)} /></label><label className="block text-sm font-medium">Notice date<input type="date" className={inputClass} value={noticeDate} onChange={(event) => setNoticeDate(event.target.value)} /></label><label className="block text-sm font-medium">Series<SeriesInput value={series} onChange={setSeries} inputClassName={inputClass} /></label><label className="block text-sm font-medium">Defense date<input type="date" className={inputClass} value={defenseDate} onChange={(event) => setDefenseDate(event.target.value)} /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Period<select className={inputClass} value={period} onChange={(event) => setPeriod(event.target.value)}><option value="morning">Morning</option><option value="afternoon">Afternoon</option></select></label><label className="text-sm font-medium">Time<input className={inputClass} value={time} onChange={(event) => setTime(event.target.value)} /></label></div><BengaliNoticeTextEditor value={customBody} onChange={setCustomBody} defaultValue={bijoyNoticeToUnicode(`${bodyStart}${series || "—"}${bodyBeforeCourse}BECM 4000 (Undergraduate Thesis)${bodyEnd}`)} /><label className="block text-sm font-medium">Department head name<input className={`${inputClass} font-['SutonnyMJ'] text-lg`} value={departmentHeadName} onChange={(event) => setDepartmentHeadName(event.target.value)} /></label>
      </div></section>
      <section className="min-w-0 rounded-xl border bg-slate-300 shadow-sm"><div className="flex items-center justify-between border-b bg-white px-5 py-3"><div><h2 className="font-semibold">Preview</h2><p className="text-xs text-slate-500">Live A4 document preview</p></div><div className="flex items-center gap-3">{status && <span className="text-xs text-emerald-700">{status}</span>}<button type="button" onClick={printNotice} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><Save className="h-4 w-4" />Save as PDF</button><button type="button" onClick={generatePdf} disabled={isGenerating} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-indigo-400"><Download className="h-4 w-4" />{isGenerating ? "Generating…" : "Generate PDF"}</button></div></div><div className="overflow-auto p-4 sm:p-6">
        <article ref={noticeRef} lang="bn" className="file-print-document mx-auto min-h-[1123px] w-[794px] max-w-full bg-white px-[6%] py-12 text-black shadow-xl">
          <header className="notice-header w-full border-b border-black pb-1"><p className="text-center text-[10px] font-semibold leading-none text-[#2f78b7]">“Heaven&apos;s Light is Our Guide”</p><h2 className="mt-1 text-center text-[20px] font-bold leading-none text-[#145365]">Rajshahi University of Engineering &amp; Technology</h2><div className="mt-1 grid grid-cols-[minmax(0,1fr)_68px_minmax(0,1fr)] items-center gap-3"><div className="header-bangla text-right text-[12px] leading-[1.25]"><p className="font-bold text-[#174e72]">wefvMxq cÖav‡bi Kvh©vjq</p><p className="whitespace-nowrap font-bold text-[#8b2525]">wewìs BwÄwbqvwis GÛ KÝUªvKkb g¨v‡bR‡g›U wefvM</p><p className="font-semibold text-[#8b4a11]">ivRkvnx-6204,evsjv‡`k</p></div><Image src={logoImage} alt="RUET logo" className="mx-auto h-[62px] w-[62px] object-contain" priority /><div className="text-left text-[12px] leading-[1.15]"><p className="text-[16px] font-bold text-[#174e72]">Office of the Head</p><p className="font-bold text-[#9b2929]">Building Engineering &amp; Construction Management</p><p className="font-semibold text-[#8b4a11]">Rajshahi-6204, Bangladesh</p></div></div><p className="mt-0.5 text-center text-[11px] font-semibold leading-none">Phone &amp; Fax : +88 0258886742, &nbsp; E-Mail : <span className="text-blue-700 underline">head@becm.ruet.ac.bd</span> , &nbsp; Website : www.becm.ruet.ac.bd</p></header>
          <div className="mt-0 flex justify-between text-[18px]"><p>¯§viK bs- {memoNumber || "-"}</p><p>ZvwiLt {formatDate(noticeDate)} wLªt|</p></div><h1 className="mt-5 text-center text-[32px]">-t weÁwß t-</h1>
          <p className="mt-7 text-justify text-[17px] leading-[1.65]">{customBody.trim() ? <SutonnyNoticeText text={customBody} /> : <>{bodyStart}{series ? toSutonnyNumber(series) : "—"}{bodyBeforeCourse}<span className="notice-times">BECM 4000 (Undergraduate Thesis)</span>{bodyEnd}</>}</p>
          <table className="mt-5 w-full table-fixed border-collapse text-center text-[16px] leading-[1.35]"><thead><tr><th className="w-[31%] border border-black p-1">el©/†mwgóvi</th><th className="w-[27%] border border-black p-1">†Kv‡m©i bvg</th><th className="w-[25%] border border-black p-1">ZvwiL</th><th className="w-[17%] border border-black p-1">mgq</th></tr></thead><tbody><tr><td className="border border-black p-2">4_© el© †Rvo †mwgóvi<br />(wmwiR {series ? toSutonnyNumber(series) : "—"})</td><td className="notice-times border border-black p-2">BECM-4000<br />(Undergraduate Thesis)</td><td className="border border-black p-2">{formatDate(defenseDate)} wLªt</td><td className="border border-black p-2">{period === "morning" ? "mKvj" : "`ycyi"}<br />{time ? toSutonnyNumber(time) : "—"} NwUKv</td></tr></tbody></table>
          <div className="ml-auto mr-2 mt-20 w-[300px] text-center text-[17px] leading-[1.25]"><p className="text-[20px] font-bold">({departmentHeadName.trim() || defaultHead.name})</p><p>{defaultHead.designation}</p><p>{defaultHead.department}</p><p>{defaultHead.university}</p></div>
        </article>
      </div></section>
    </div>
  </main></div>;
}

