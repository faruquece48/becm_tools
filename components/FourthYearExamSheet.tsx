"use client";

import { useState } from "react";
import { buildFourthYearSheet, type FourthYearSheet, type FourthYearExamType } from "@/lib/fourthYearExamData";
import { loadTabulators } from "@/lib/storage/tabulators";
import { loadExamCommittees } from "@/lib/storage/examCommittees";

type Props = {
  kind: "marks" | "tabulation";
  examType: FourthYearExamType;
  initialExamYear?: string;
  onExamTypeChange: (value: "Regular" | "Backlog" | "Short Semester") => void;
  onAcademicYearChange?: (value: string) => void;
};

export default function FourthYearExamSheet({ kind, examType, initialExamYear, onExamTypeChange, onAcademicYearChange }: Props) {
  const current = new Date().getFullYear();
  const [examYear, setExamYear] = useState(initialExamYear || String(current));
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [sheet, setSheet] = useState<FourthYearSheet | null>(null);
  const title = kind === "marks" ? "Mark Sheets Summary" : "Tabulation Sheet";
  const field = "h-10 w-full rounded border border-slate-300 bg-white px-3";

  async function generate() {
    setBusy(true); setMessage("");
    try {
      const get = async (url: string) => { const response = await fetch(url, { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Unable to load examination data."); return body; };
      const [bundle, registrationBody, tabulators, committees] = await Promise.all([
        get("/api/excel-result-input"), get(examType === "Backlog" ? "/api/backlog-registrations" : "/api/short-semester-registrations"),
        kind === "tabulation" ? loadTabulators() : Promise.resolve([]), loadExamCommittees(),
      ]);
      const model = buildFourthYearSheet(bundle.data || {}, registrationBody.registrations || [], examYear, examType);
      if (!model.rows.length || !model.courses.length) throw new Error("No registered subjects or saved marks found for this examination.");
      const tabulator = tabulators.find(item => item.examYear === examYear && item.academicYear === "4th" && item.examType === "Backlog");
      const committee = committees.find(item => item.examYear === examYear && item.academicYear === "4th" && item.examType === "Backlog");
      if (kind === "tabulation" && (!tabulator || !committee)) throw new Error("Add the matching 4th-year backlog tabulators and examination committee for this exam year first.");
      const [{ jsPDF }, { renderFourthYearExamPdf }] = await Promise.all([import("jspdf"), import("@/lib/fourthYearExamPdf")]);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      await Promise.all([["FreeSerif.ttf", "normal"], ["FreeSerifBold.ttf", "bold"], ["FreeSerifBoldItalic.ttf", "bolditalic"]].map(async ([file, style]) => {
        const response = await fetch(`/fonts/${file}`); if (!response.ok) throw new Error("Unable to load the PDF font.");
        const bytes = new Uint8Array(await response.arrayBuffer()); let binary = "";
        for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
        doc.addFileToVFS(file, btoa(binary)); doc.addFont(file, "FreeSerif", style);
      }));
      const output = renderFourthYearExamPdf(doc, model, kind, { committee, tabulator });
      doc.save(`${kind === "marks" ? "mark" : "tabulation"}-sheet-${examType === "Backlog" ? "backlog" : "short-semester"}-${examYear}-4th.pdf`);
      setSheet(model); setMessage(`Generated ${output.pages} pages. Student identity repeats across ${output.horizontalParts} table parts.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to generate examination sheet."); }
    finally { setBusy(false); }
  }

  return <section className="min-h-screen bg-[#f7f9fd] p-3"><div className="border-t border-[#082f57] bg-white">
    <header className="border-b p-4 text-center"><h1 className="text-2xl font-bold">{title}</h1></header>
    <div className="grid gap-4 border-b p-6 md:grid-cols-2">
      <label className="grid gap-2 font-semibold">Exam Type<select disabled={busy} className={field} value={examType} onChange={event => onExamTypeChange(event.target.value as "Regular" | "Backlog" | "Short Semester")}><option>Regular</option><option>Backlog</option><option value="Short Semester">Short Semester</option></select></label>
      <label className="grid gap-2 font-semibold">Exam Year<select disabled={busy} className={field} value={examYear} onChange={event => { setExamYear(event.target.value); setSheet(null); setMessage(""); }}>{Array.from({ length: current - 2018 + 1 }, (_, index) => <option key={current - index}>{current - index}</option>)}</select></label>
      <label className="grid gap-2 font-semibold">Academic Year<select disabled={busy || examType === "Short Semester"} className={field} value="4th" onChange={event => onAcademicYearChange?.(event.target.value)}>{(examType === "Backlog" ? ["1st", "2nd", "3rd", "4th"] : ["4th"]).map(year => <option key={year}>{year}</option>)}</select></label>
      <p className="self-center text-sm text-slate-600">Subjects continue onto additional pages at a readable width. Student identity repeats on every table page.</p>
      <button disabled={busy} onClick={() => void generate()} className="mx-auto rounded bg-green-700 px-5 py-2.5 font-semibold text-white disabled:opacity-50 md:col-span-2">{busy ? "Generating..." : `Generate ${kind === "marks" ? "Marksheet" : "Tabulation Sheet"} PDF`}</button>
    </div>
    {message && <p role="status" className="m-4 rounded bg-slate-100 p-3">{message}</p>}
    {sheet && <p className="p-4 text-sm">{sheet.rows.length} students · {sheet.courses.length} subjects · {sheet.examYear} 4th-year {sheet.examType}</p>}
  </div></section>;
}
