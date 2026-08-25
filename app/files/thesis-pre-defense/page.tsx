"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileText, FolderOpen, Menu, Save } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import useThesisTopicsState from "@/components/useThesisTopicsState";
import SeriesInput from "@/components/SeriesInput";
import BengaliNoticeTextEditor, { SutonnyNoticeText, toSutonnyNumber } from "@/components/BengaliNoticeTextEditor";
import logoImage from "@/app/images/image_03.png";
import { printNotice } from "@/lib/printNotice";

const inputClass = "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const computerDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatDate = (value: string) => {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return toSutonnyNumber(`${day}/${month}/${year}`);
};

const defaultHead = {
  name: "Rbve kvqjv kviwgb",
  designation: "wefvMxq cÖavb",
  department: "wewìs BwÄwbqvwis GÛ Kb÷ªvKkb g¨v‡bR‡g›U wefvM",
  university: "ivRkvnx cÖ‡KŠkj I cÖhyw³ wek¦we`¨vjq|",
};

const createNotice = () => ({
  memoNumber: `weBwmGg/${new Date().getFullYear()}/001`,
  date: computerDate(),
  series: "2020",
  defenseDate: computerDate(),
  defensePeriod: "morning",
  defenseTime: "09.00",
});

const defaultLayout = {
  header: { fontSize: 12, gapAfter: 0 },
  meta: { fontSize: 20, gapAfter: 28 },
  heading: { fontSize: 34, gapAfter: 34 },
  body: { fontSize: 20.5, gapAfter: 12 },
  table: { fontSize: 18, gapAfter: 96 },
  signature: { fontSize: 17, gapAfter: 32 },
};

type LayoutSection = keyof typeof defaultLayout;
const layoutLabels: Record<LayoutSection, string> = { header: "Header", meta: "Memo and date", heading: "Notice heading", body: "Notice body", table: "Schedule table", signature: "Head signature" };
const storageKey = "ruet-thesis-pre-defense-saved";

export default function ThesisPreDefensePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [thesisOpen, setThesisOpen] = useThesisTopicsState();
  const [notice, setNotice] = useState(createNotice);
  const [departmentHeadName, setDepartmentHeadName] = useState<string>(defaultHead.name);
  const [layout, setLayout] = useState(defaultLayout);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState("");
  const [customBody, setCustomBody] = useState("");
  const noticeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved?.notice) setNotice(saved.notice);
      if (saved?.departmentHeadName) setDepartmentHeadName(saved.departmentHeadName);
      if (saved?.layout) setLayout(saved.layout);
      if (typeof saved?.customBody === "string") setCustomBody(saved.customBody);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const update = (field: keyof ReturnType<typeof createNotice>, value: string) => setNotice((current) => ({ ...current, [field]: value }));
  const updateLayout = (section: LayoutSection, field: "fontSize" | "gapAfter", value: number) => setLayout((current) => ({ ...current, [section]: { ...current[section], [field]: Math.max(0, value || 0) } }));

  const generatePdf = async () => {
    const element = noticeRef.current;
    if (!element || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfStatus("");
    try {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      const imageData = await toPng(element, { backgroundColor: "#ffffff", pixelRatio: Math.max(2, window.devicePixelRatio || 1), cacheBust: true, width: element.scrollWidth, height: element.scrollHeight, style: { boxShadow: "none", maxWidth: "none" } });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      pdf.addImage(imageData, "PNG", 0, 0, 210, 297, undefined, "FAST");
      pdf.save(`Thesis-Pre-defense-${notice.series || "notice"}.pdf`);
      setPdfStatus("PDF generated successfully.");
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
          <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="Open navigation"><Menu className="h-6 w-6" /></button>
          <div><h1 className="text-xl font-bold text-[#102555]">Official Files</h1><p className="text-sm text-slate-500">Prepare and preview departmental documents</p></div>
        </header>

        <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[240px_minmax(320px,390px)_minmax(600px,1fr)]">
          <aside className="overflow-hidden rounded-xl border bg-white shadow-sm xl:sticky xl:top-[96px] xl:self-start">
            <div className="border-b px-4 py-4"><h2 className="font-semibold text-[#102555]">Topics and files</h2><p className="mt-1 text-xs text-slate-500">Select a document to prepare</p></div>
            <div className="p-3">
              <button type="button" onClick={() => setThesisOpen((open) => !open)} className="flex w-full items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2.5 text-left font-semibold text-indigo-800" aria-expanded={thesisOpen}><ChevronDown className={`h-4 w-4 transition-transform ${thesisOpen ? "" : "-rotate-90"}`} /><FolderOpen className="h-5 w-5" /><span>Thesis</span><span className="ml-auto text-[10px] font-medium">{thesisOpen ? "Minimize" : "Expand"}</span></button>
              {thesisOpen && <>
                <Link href="/files" className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"><span className="ml-5 border-l border-slate-300 pl-3"><FileText className="h-4 w-4" /></span><span>Thesis Distribution</span></Link>
                <Link href="/files/thesis-pre-defense" className="mt-1 flex w-full items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-left text-sm font-medium text-white shadow-sm" aria-current="page"><span className="ml-5 border-l border-indigo-300 pl-3"><FileText className="h-4 w-4" /></span><span>Thesis Pre-defense Student (1)</span></Link>
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
            <div className="border-b px-5 py-4"><h2 className="font-semibold text-[#102555]">Thesis Pre-defense Student (1)</h2><p className="mt-1 text-xs text-slate-500">Enter the notice and schedule information</p></div>
            <div className="max-h-[calc(100vh-120px)] space-y-4 overflow-y-auto p-5">
              <label className="block text-sm font-medium text-slate-700">Memo number<input className={`${inputClass} font-['SutonnyMJ'] text-lg`} value={notice.memoNumber} onChange={(event) => update("memoNumber", event.target.value)} /></label>
              <label className="block text-sm font-medium text-slate-700">Notice date<input type="date" className={inputClass} value={notice.date} onChange={(event) => update("date", event.target.value)} /></label>
              <label className="block text-sm font-medium text-slate-700">Series<SeriesInput value={notice.series} onChange={(value) => update("series", value)} inputClassName={inputClass} /></label>
              <div className="grid grid-cols-3 gap-3">
                <label className="block text-sm font-medium text-slate-700">Pre-defense date<input type="date" className={inputClass} value={notice.defenseDate} onChange={(event) => update("defenseDate", event.target.value)} /></label>
                <label className="block text-sm font-medium text-slate-700">Period<select className={inputClass} value={notice.defensePeriod} onChange={(event) => update("defensePeriod", event.target.value)}><option value="morning">সকাল</option><option value="afternoon">দুপুর</option></select></label>
                <label className="block text-sm font-medium text-slate-700">Time<input style={{ fontFamily: '"Times New Roman", Times, serif' }} className={inputClass} value={notice.defenseTime} onChange={(event) => update("defenseTime", event.target.value)} /></label>
              </div>
              <div className="border-t pt-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Layout controls</h3>
                <div className="space-y-2">{(Object.keys(layoutLabels) as LayoutSection[]).map((section) => <div key={section} className="grid grid-cols-[1fr_76px_76px] items-end gap-2 rounded-lg border bg-slate-50 p-2.5"><span className="self-center text-xs font-semibold text-slate-700">{layoutLabels[section]}</span><label className="text-[10px] font-medium text-slate-500">Font (px)<input type="number" min="6" max="40" value={layout[section].fontSize} onChange={(event) => updateLayout(section, "fontSize", Number(event.target.value))} className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-xs" /></label><label className="text-[10px] font-medium text-slate-500">Gap (px)<input type="number" min="0" max="200" value={layout[section].gapAfter} onChange={(event) => updateLayout(section, "gapAfter", Number(event.target.value))} className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-xs" /></label></div>)}</div>
              </div>
              <BengaliNoticeTextEditor value={customBody} onChange={setCustomBody} defaultValue={`এতদ্বারা বিইসিএম বিভাগের ৪র্থ বর্ষ বিজোড় সেমিস্টার (সিরিজ ${notice.series || "—"}) এর শিক্ষার্থীদের অবগতির জন্য জানানো যাচ্ছে যে, BECM 4000 (Undergraduate Thesis) কোর্সের প্রেজেন্টেশন উপস্থাপন করার জন্য নিম্নবর্ণিত ছক অনুযায়ী সময়সূচি নির্ধারণ করা হয়েছে। সংশ্লিষ্ট শিক্ষার্থীদের যথাসময়ে উপস্থিত হয়ে পরীক্ষায় অংশগ্রহণের জন্য নির্দেশ দেওয়া যাচ্ছে।`} />
              <label className="block rounded-lg border bg-slate-50 p-3 text-sm font-medium text-slate-700">Department head name<span className="mt-0.5 block text-xs font-normal text-slate-500">Change the name shown in the compact signature block</span><input className={`${inputClass} font-['SutonnyMJ'] text-lg`} value={departmentHeadName} onChange={(event) => setDepartmentHeadName(event.target.value)} placeholder={defaultHead.name} /></label>
            </div>
          </section>

          <section className="min-w-0 rounded-xl border bg-slate-300 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-300 bg-white px-5 py-3"><div><h2 className="font-semibold text-[#102555]">Preview</h2><p className="text-xs text-slate-500">Live A4 document preview</p></div><div className="flex items-center gap-3">{pdfStatus && <span role="status" className={`text-xs ${pdfStatus.startsWith("Unable") ? "text-red-600" : "text-emerald-700"}`}>{pdfStatus}</span>}<button type="button" onClick={printNotice} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><Save className="h-4 w-4" />Save as PDF</button><button type="button" onClick={generatePdf} disabled={isGeneratingPdf} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-400"><Download className="h-4 w-4" />{isGeneratingPdf ? "Generating PDF…" : "Generate PDF"}</button></div></div>
            <div className="overflow-auto p-4 sm:p-6">
              <article ref={noticeRef} lang="bn" className="file-print-document mx-auto min-h-[1123px] w-[794px] max-w-full bg-white px-[6%] py-12 text-[14px] leading-[1.55] text-black shadow-xl print:min-h-0 print:w-full print:max-w-none print:shadow-none">
                <header className="notice-header w-full border-b border-black pb-1">
                  <p style={{ fontSize: layout.header.fontSize * 0.8 }} className="text-center font-semibold leading-none text-[#2f78b7]">“Heaven&apos;s Light is Our Guide”</p>
                  <h2 style={{ fontSize: layout.header.fontSize * 1.7 }} className="mt-1 text-center font-bold leading-none tracking-tight text-[#145365]">Rajshahi University of Engineering &amp; Technology</h2>
                  <div className="mt-1 grid w-full grid-cols-[minmax(0,1fr)_68px_minmax(0,1fr)] items-center gap-3">
                    <div style={{ fontSize: layout.header.fontSize }} className="header-bangla text-left leading-[1.25]">
                      <p className="font-bold text-[#174e72]">wefvMxq cÖav‡bi Kvh©vjq</p>
                      <p className="whitespace-nowrap font-bold text-[#8b2525]">wewìs BwÄwbqvwis GÛ KÝUªvKkb g¨v‡bR‡g›U wefvM</p>
                      <p className="font-semibold text-[#8b4a11]">ivRkvnx-6204,evsjv‡`k</p>
                    </div>
                    <Image src={logoImage} alt="RUET logo" className="mx-auto h-[62px] w-[62px] object-contain" priority />
                    <div style={{ fontSize: layout.header.fontSize }} className="text-left leading-[1.15]">
                      <p style={{ fontSize: layout.header.fontSize * 1.3 }} className="font-bold text-[#174e72]">Office of the Head</p>
                      <p className="font-bold text-[#9b2929]">Building Engineering &amp; Construction Management</p>
                      <p className="font-semibold text-[#8b4a11]">Rajshahi-6204, Bangladesh</p>
                    </div>
                  </div>
                  <p style={{ fontSize: layout.header.fontSize * 0.9 }} className="mt-0.5 text-center font-semibold leading-none">Phone &amp; Fax : +88 0258886742, &nbsp; E-Mail : <span className="text-blue-700 underline">head@becm.ruet.ac.bd</span> , &nbsp; Website : www.becm.ruet.ac.bd</p>
                </header>
                <div style={{ marginTop: layout.header.gapAfter, fontSize: layout.meta.fontSize }} className="flex justify-between gap-4"><p>¯§viK bs- {notice.memoNumber || "-"}</p><p>ZvwiLt {formatDate(notice.date)} wLªt|</p></div>
                <h1 style={{ marginTop: layout.meta.gapAfter, fontSize: layout.heading.fontSize }} className="text-center font-medium">-t weÁwß t-</h1>
                <p style={{ marginTop: layout.heading.gapAfter, fontSize: layout.body.fontSize }} className="text-justify leading-[1.75] [text-justify:inter-word]">
                  {customBody.trim() ? <SutonnyNoticeText text={customBody} /> : <>GZØviv weBwmGg wefv‡Mi 4_© el© we‡Rvo †mwgóvi (wmwiR {notice.series ? toSutonnyNumber(notice.series) : "—"}) Gi wkÿv_©x‡`i AeMwZi Rb¨ Rvbv‡bv hv‡”Q †h, <span className="notice-times">BECM 4000 (Undergraduate Thesis)</span> †Kv‡m©i †cÖ‡R‡›Ukb Dc¯’vcb Kivi Rb¨ wb¤œewY©Z QK Abyhvqx mgq m~Px wba©viY Kiv n‡q‡Q| mswkøó wkÿv_©x‡`i h_vmg‡q Dcw¯’Z n‡q cixÿvq AskMÖn‡Yi Rb¨ wb‡`©k †`qv hv‡”Q|</>}
                </p>
                <table style={{ marginTop: layout.body.gapAfter, fontSize: layout.table.fontSize }} className="w-full table-fixed border-collapse text-center leading-[1.35]"><thead><tr><th className="w-[25%] border border-black px-2 py-1">el©/ †mwgóvi</th><th className="w-[34%] border border-black px-2 py-1">†Kv‡m©i bvg</th><th className="w-[21%] border border-black px-2 py-1">ZvwiL</th><th className="w-[20%] border border-black px-2 py-1">mgq</th></tr></thead><tbody><tr><td className="border border-black px-2 py-1">4_© el© we‡Rvo ‡mwg÷vi<br />(wmwiR {notice.series ? toSutonnyNumber(notice.series) : "—"})</td><td className="border border-black px-2 py-1"><span className="notice-times">BECM 4000<br />(Undergraduate Thesis)</span></td><td className="border border-black px-2 py-1">{formatDate(notice.defenseDate)} wLª.</td><td className="border border-black px-2 py-1">{notice.defensePeriod === "afternoon" ? "`ycyi" : "mKvj"} {notice.defenseTime ? toSutonnyNumber(notice.defenseTime) : "—"} NwUKv</td></tr></tbody></table>
                <div style={{ marginTop: layout.table.gapAfter, marginBottom: layout.signature.gapAfter, fontSize: layout.signature.fontSize }} className="ml-auto mr-2 w-[300px] text-center leading-[1.25]"><p style={{ fontSize: layout.signature.fontSize + 3 }} className="font-bold">({departmentHeadName.trim() || defaultHead.name})</p><p>{defaultHead.designation}</p><p>{defaultHead.department}</p><p>{defaultHead.university}</p></div>
              </article>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
