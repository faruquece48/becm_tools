"use client";
import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { unicodeToBijoy } from "@abdalgolabs/ansi-unicode-converter";
import { emptyBill } from "../create/components/emptyBill";
import type { ExaminationBillData } from "../create/components/types";
import { loadCurrentWork } from "@/lib/storage/draft";
import {
  loadIndividualTeacherInformation,
  saveIndividualTeacherInformation,
} from "@/lib/storage/individualTeacher";
import ColumnWidthEditor from "../preview/components/ColumnWidthEditor";
import type { ColumnWidths } from "../create/components/types";
import {
  amountInBanglaWords,
  buildRemunerationChart,
  collectTeacherNames,
  collectTeacherNameWarnings,
  descriptionRowSpan,
  deriveTeacherRows,
  isMinimumAmountApplied,
  rowAmount,
} from "./individualBill";

const inputClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500";
const defaultAddressBangla = "বিইসিএম বিভাগ, রুয়েট।";

function toSutonnyText(value: string | number) {
  const bengaliDigits = String(value).replace(/\d/g, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)]);
  return unicodeToBijoy(bengaliDigits);
}

function convertBillText(node: ReactNode): ReactNode {
  if (typeof node === "string" || typeof node === "number") return toSutonnyText(node);
  if (!isValidElement<{ children?: ReactNode; className?: string }>(node)) return node;
  if (node.props.className?.includes("individual-course-code")) return node;
  return cloneElement(node, undefined, Children.map(node.props.children, convertBillText));
}

function SutonnyBillText({ children }: { children: ReactNode }) {
  return Children.map(children, convertBillText);
}

export default function IndividualTeacherBillPage() {
  const [bill, setBill] = useState<ExaminationBillData>(emptyBill);
  const [teacher, setTeacher] = useState("");
  const [nameBangla, setNameBangla] = useState("");
  const [designationBangla, setDesignationBangla] = useState("");
  const [addressBangla, setAddressBangla] = useState(defaultAddressBangla);
  const [accountNumber, setAccountNumber] = useState("");
  const [teacherSaveStatus, setTeacherSaveStatus] = useState("");
  const [divisionGaps, setDivisionGaps] = useState<Record<string, number>>({ header: 0, teacher: 0, exam: 1, mainTable: 0, signature: 0, account: 0, footer: 0 });
  const [approvalSignatureGap, setApprovalSignatureGap] = useState(16);
  const [sectionFontSizes, setSectionFontSizes] = useState<Record<string, number>>({ header: 12, teacher: 12, exam: 12, mainTable: 10, signature: 13, account: 13, footer: 10 });
  const [tableContentFontSizes, setTableContentFontSizes] = useState({ values: 12, total: 12 });
  const [remunerationOpen, setRemunerationOpen] = useState(false);
  const [metaWidths, setMetaWidths] = useState<ColumnWidths>({ qualifications: 40, examination: 42, billNumber: 18 });
  const [tableWidths, setTableWidths] = useState<ColumnWidths>({ serial: 6, descriptionGroup: 9, description: 22, course: 18, quantity: 10, courseCount: 8, classTestCount: 9, rate: 10, amount: 8 });
  const billSheetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const saved = loadCurrentWork();
    // Hydrate the client-only draft after the page mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setBill({ ...emptyBill, ...saved });
  }, []);

  const teachers = useMemo(() => collectTeacherNames(bill), [bill]);
  const teacherNameWarnings = useMemo(() => collectTeacherNameWarnings(bill), [bill]);
  const rows = useMemo(() => deriveTeacherRows(bill, teacher), [bill, teacher]);
  const chartSections = useMemo(() => buildRemunerationChart(rows), [rows]);
  const total = useMemo(() => rows.reduce((sum, row) => sum + rowAmount(row), 0), [rows]);
  const bengaliYear: Record<string, string> = { "1st Year": "১ম বর্ষ", "2nd Year": "২য় বর্ষ", "3rd Year": "৩য় বর্ষ", "4th Year": "৪র্থ বর্ষ" };
  const bengaliSemester: Record<string, string> = { Odd: "বিজোড়", Even: "জোড়", "Odd Semester": "বিজোড়", "Even Semester": "জোড়" };
  const toBengaliDigits = (value: string) => value.replace(/[0-9]/g, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)]);
  const examTitle = bill.billInfo.examType === "backlog"
    ? `${bengaliYear[bill.billInfo.year] || bill.billInfo.year || "১ম বর্ষ"} ব্যাকলগ পরীক্ষা ${toBengaliDigits(bill.billInfo.examYear || "২০২৪")}`
    : bill.billInfo.examType === "short"
      ? `${bengaliYear[bill.billInfo.year] || bill.billInfo.year || "১ম বর্ষ"} শর্ট সেমিস্টার ${toBengaliDigits(bill.billInfo.examYear || "২০২৪")}`
      : `${bengaliYear[bill.billInfo.year] || bill.billInfo.year || "১ম বর্ষ"} ${bengaliSemester[bill.billInfo.semester] || bill.billInfo.semester || "বিজোড়"} সেমিস্টার পরীক্ষা ${toBengaliDigits(bill.billInfo.examYear || "২০২৪")}`;

  const degreeOptions = [
    { key: "B.Sc. Engineering", label: "বি.এস.সি. ইঞ্জিনিয়ারিং" },
    { key: "B.U.R.P", label: "বি.ইউ.আর.পি" },
    { key: "B.Arch.", label: "বি.আর্ক." },
    { key: "M.Sc. Engineering", label: "এম.এস.সি. ইঞ্জিনিয়ারিং" },
    { key: "M.Phil.", label: "এম.ফিল." },
    { key: "PhD", label: "পি.এইচ.ডি." },
  ];
  const selectedDegreeKey = bill.billInfo.examination === "Ph.D." ? "PhD" : bill.billInfo.examination;

  const selectTeacher = (value: string) => {
    setTeacher(value);
    setTeacherSaveStatus("");
    const savedInformation = value
      ? loadIndividualTeacherInformation(value)
      : null;
    setNameBangla(savedInformation?.nameBangla ?? value);
    setDesignationBangla(savedInformation?.designationBangla ?? "");
    setAddressBangla(savedInformation?.addressBangla ?? defaultAddressBangla);
    setAccountNumber(savedInformation?.accountNumber ?? "");
  };

  const saveTeacherInformation = () => {
    if (!teacher) return;
    const saved = saveIndividualTeacherInformation(teacher, {
      nameBangla,
      designationBangla,
      addressBangla,
      accountNumber,
    });
    setTeacherSaveStatus(saved ? "Teacher information saved." : "Unable to save teacher information.");
  };

  const printOrSavePdf = async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.print();
  };

  return (
    <main className="individual-bill-page py-8">
      <div className="max-w-[1700px] px-4 sm:px-6">
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Individual Teacher Bill</h1>
            <p className="text-sm text-slate-500">বাংলা নির্ধারিত ফরমে ব্যক্তিগত পরীক্ষার পারিশ্রমিক বিল</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={printOrSavePdf} className="rounded-md border border-blue-600 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">Legal Print Preview / Save as PDF</button>
          </div>
        </div>
        <div className="grid items-start gap-6 xl:grid-cols-[430px_1fr]">
          <section className="no-print space-y-5 rounded-xl border bg-white p-5 shadow-sm">
            <div className="space-y-3">
              <h2 className="font-semibold">Teacher information</h2>
              <label className="block text-sm">Teacher from master bill<select value={teacher} onChange={(event) => selectTeacher(event.target.value)} className={`${inputClass} mt-1`}><option value="">Select teacher</option>{teachers.map((name) => <option key={name}>{name}</option>)}</select></label>
              {teacherNameWarnings.length > 0 && <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"><p className="font-semibold">Names missing Mr./Mrs./Mst.</p><p className="mt-1 text-amber-700">Names containing Dr. are exempt. Correct these entries in the master bill:</p><ul className="mt-2 list-disc space-y-1 pl-4">{teacherNameWarnings.map((warning, index) => <li key={`${warning.location}-${index}`}><span className="font-semibold">{warning.name}</span> — {warning.location}</li>)}</ul></div>}
              <label className="block text-sm">নাম (বাংলায়)<input value={nameBangla} onChange={(event) => setNameBangla(event.target.value)} className={`${inputClass} mt-1`} /></label>
              <label className="block text-sm">পদবী (বাংলায়)<input value={designationBangla} onChange={(event) => setDesignationBangla(event.target.value)} className={`${inputClass} mt-1`} placeholder="সহকারী অধ্যাপক" /></label>
              <label className="block text-sm">ঠিকানা<input value={addressBangla} onChange={(event) => setAddressBangla(event.target.value)} className={`${inputClass} mt-1`} /></label>
              <label className="block text-sm">হিসাব নং<input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} className={`${inputClass} mt-1`} /></label>
              <div className="flex items-center gap-3">
                <button type="button" disabled={!teacher} onClick={saveTeacherInformation} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">Save teacher information</button>
                {teacherSaveStatus && <span role="status" className={`text-xs ${teacherSaveStatus.startsWith("Unable") ? "text-red-600" : "text-emerald-700"}`}>{teacherSaveStatus}</span>}
              </div>
            </div>
            <div className="space-y-3 border-t pt-4">
              <button type="button" className="flex w-full items-start justify-between text-left" onClick={() => setRemunerationOpen((open) => !open)} aria-expanded={remunerationOpen}>
                <span><span className="block font-semibold">Automatic remuneration details</span><span className="mt-1 block text-xs text-slate-500">Work, quantity, rate, and total amount are calculated automatically from the master bill.</span></span>
                <span className="ml-3 text-xs text-slate-500">{remunerationOpen ? "Hide" : "Show"}</span>
              </button>
              {remunerationOpen && <>
              {rows.length === 0 && <p className="rounded bg-slate-50 p-3 text-xs text-slate-500">{teacher ? "No billable work was found for the selected teacher." : "Select a teacher above to generate the detailed bill."}</p>}
              <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={row.id} className="space-y-2 rounded-lg border p-3">
                  <div className="text-xs font-semibold">বিবরণ {index + 1}</div>
                  <input aria-label="কাজের বিবরণ" value={row.description} placeholder="কাজের বিবরণ" readOnly className={`${inputClass} bg-slate-50`} />
                  <div className="grid grid-cols-2 gap-2"><input aria-label="কোর্স" value={row.course} placeholder="বিষয় / কোর্স" readOnly className={`${inputClass} bg-slate-50`} /><input aria-label="খাতা বা ছাত্র সংখ্যা" value={row.quantity ? toBengaliDigits(String(row.quantity)) : ""} placeholder="খাতা / ছাত্র সংখ্যা" readOnly className={`${inputClass} bg-slate-50`} /><input aria-label="কোর্স সংখ্যা" value={row.courseCount ? toBengaliDigits(String(row.courseCount)) : ""} placeholder="কোর্স সংখ্যা" readOnly className={`${inputClass} bg-slate-50`} /><input aria-label="ক্লাস টেস্ট সংখ্যা" value={row.classTestCount ? toBengaliDigits(String(row.classTestCount)) : ""} placeholder="ক্লাস টেস্ট সংখ্যা" readOnly className={`${inputClass} bg-slate-50`} /><input aria-label="হার" value={row.rate ? toBengaliDigits(String(row.rate)) : ""} placeholder="পারিশ্রমিকের হার" readOnly className={`${inputClass} bg-slate-50`} /><div className="flex items-center rounded bg-slate-50 px-3 text-sm font-semibold">৳ {rowAmount(row).toLocaleString("bn-BD")}</div></div>
                </div>
              ))}
              </div>
              </>}
            </div>
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
                <h2 className="font-semibold">Document division gaps</h2>
                <div className="grid grid-cols-[1fr_72px_72px] gap-3 text-xs font-semibold text-slate-500"><span>Section</span><span>Gap (mm)</span><span>Font (px)</span></div>
                {([
                  ["header", "1. Header"],
                  ["teacher", "2. Teacher information"],
                  ["exam", "3. Exam information"],
                  ["mainTable", "4. Main table"],
                  ["signature", "5. Signature division"],
                  ["account", "6. Account section"],
                  ["footer", "7. Footer"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="grid grid-cols-[1fr_72px_72px] items-center gap-3 text-sm">
                    <span>{label}</span>
                    <input type="number" min="0" max="30" step="1" value={divisionGaps[key] ?? 0} onChange={(event) => setDivisionGaps((current) => ({ ...current, [key]: Math.min(30, Math.max(0, Number(event.target.value) || 0)) }))} className={inputClass} aria-label={`Gap after ${label} in millimeters`} />
                    <input type="number" min="6" max="30" step="1" value={sectionFontSizes[key] ?? 10} onChange={(event) => setSectionFontSizes((current) => ({ ...current, [key]: Math.min(30, Math.max(6, Number(event.target.value) || 6)) }))} className={inputClass} aria-label={`Font size for ${label} in pixels`} />
                  </label>
                ))}
                <label className="grid grid-cols-[1fr_72px] items-center gap-3 border-t pt-3 text-sm">
                  <span>Gap between countersigned text and signature lines</span>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="1"
                    value={approvalSignatureGap}
                    onChange={(event) => setApprovalSignatureGap(Math.min(60, Math.max(0, Number(event.target.value) || 0)))}
                    className={inputClass}
                    aria-label="Gap between countersigned text and signature lines in millimeters"
                  />
                </label>
                <div className="border-t pt-3">
                  <p className="mb-3 text-xs font-semibold text-slate-500">Separate table content sizes</p>
                  <div className="space-y-3">
                    <label className="grid grid-cols-[1fr_72px] items-center gap-3 text-sm">
                      <span>Course codes and digits</span>
                      <input type="number" min="6" max="30" step="1" value={tableContentFontSizes.values} onChange={(event) => setTableContentFontSizes((current) => ({ ...current, values: Math.min(30, Math.max(6, Number(event.target.value) || 6)) }))} className={inputClass} aria-label="Font size for course codes and numeric table values in pixels" />
                    </label>
                    <label className="grid grid-cols-[1fr_72px] items-center gap-3 text-sm">
                      <span>Bottom total row</span>
                      <input type="number" min="6" max="30" step="1" value={tableContentFontSizes.total} onChange={(event) => setTableContentFontSizes((current) => ({ ...current, total: Math.min(30, Math.max(6, Number(event.target.value) || 6)) }))} className={inputClass} aria-label="Font size for the bottom total row in pixels" />
                    </label>
                  </div>
                </div>
              </div>
              <div><h2 className="mb-2 font-semibold">Information table widths</h2><ColumnWidthEditor widths={metaWidths} setWidths={setMetaWidths} labels={{ qualifications: "Qualifications", examination: "Examination", billNumber: "Bill number" }} /></div>
              <div><h2 className="mb-2 font-semibold">Remuneration table widths</h2><ColumnWidthEditor widths={tableWidths} setWidths={setTableWidths} labels={{ serial: "Serial", descriptionGroup: "Description", description: "Individual description", course: "Course", quantity: "Scripts/students", courseCount: "Courses", classTestCount: "Class tests", rate: "Rate", amount: "Amount" }} /></div>
            </div>
          </section>
          <section className="preview-shell overflow-auto rounded-xl bg-slate-300 p-5">
            <div className="legal-page-preview relative mx-auto w-[215.9mm]">
            <div className="legal-page-limit no-print" aria-hidden="true">
              <span>Legal page limit (14 in)</span>
            </div>
            <article ref={billSheetRef} className="bill-sheet individual-print-document mx-auto bg-white text-black shadow-xl" lang="bn" style={{ "--teacher-gap": `${divisionGaps.teacher}mm`, "--exam-gap": `${divisionGaps.exam}mm`, "--main-table-gap": `${divisionGaps.mainTable}mm`, "--signature-gap": `${divisionGaps.signature}mm`, "--account-gap": `${divisionGaps.account}mm`, "--footer-gap": `${divisionGaps.footer}mm`, "--header-font-size": `${sectionFontSizes.header}px`, "--teacher-font-size": `${sectionFontSizes.teacher}px`, "--exam-font-size": `${sectionFontSizes.exam}px`, "--main-table-font-size": `${sectionFontSizes.mainTable}px`, "--table-values-font-size": `${tableContentFontSizes.values}px`, "--table-total-font-size": `${tableContentFontSizes.total}px`, "--signature-font-size": `${sectionFontSizes.signature}px`, "--account-font-size": `${sectionFontSizes.account}px`, "--footer-font-size": `${sectionFontSizes.footer}px` } as React.CSSProperties}>
              <SutonnyBillText>
              <header className="relative text-center bill-header" style={{ marginBottom: `${divisionGaps.header}mm` }}>
                <p className="text-[10px]">ঐশী জ্যোতিই আমাদের পথ প্রদর্শক</p>
                <h2 className="mt-1 text-[18px] font-bold">রাজশাহী প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়</h2>
                <h1 className="mt-2 text-[17px] font-bold">পরীক্ষা সংক্রান্ত পারিশ্রমিকের বিল ফরম</h1>
              </header>
              <div className="teacher-info grid grid-cols-2 text-[12px]"><div><p>নামঃ <span className="font-semibold">{nameBangla || "................................"}</span></p><p>ঠিকানাঃ <span className="font-semibold">{addressBangla}</span></p></div><div className="justify-self-end text-left"><p>পদবীঃ <span className="font-semibold">{designationBangla || "................................"}</span></p><p>হিসাব নংঃ <span className="font-semibold">{accountNumber || "........................"}</span></p></div></div>
              <table className="bill-meta w-full table-fixed border-collapse text-[10px]"><colgroup><col style={{ width: `${metaWidths.qualifications}%` }}/><col style={{ width: `${metaWidths.examination}%` }}/><col style={{ width: `${metaWidths.billNumber}%` }}/></colgroup><tbody><tr><td className="align-top">{degreeOptions.map((degree, index) => <span key={degree.key} className={selectedDegreeKey && selectedDegreeKey !== degree.key ? "line-through" : undefined}>{index > 0 ? "/" : ""}{degree.label}</span>)}<br/><span>বিভাগঃ বিইসিএম বিভাগ</span></td><td className="text-center font-bold">{examTitle}</td><td className="text-center font-bold">বিল নং- {toBengaliDigits(bill.billInfo.billNo || "০১")}</td></tr></tbody></table>
              <table className="bill-table w-full table-fixed border-collapse text-[10px]">
                <colgroup><col style={{ width: `${tableWidths.serial}%` }}/><col style={{ width: `${tableWidths.descriptionGroup}%` }}/><col style={{ width: `${tableWidths.description}%` }}/><col style={{ width: `${tableWidths.course}%` }}/><col style={{ width: `${tableWidths.quantity}%` }}/><col style={{ width: `${tableWidths.courseCount}%` }}/><col style={{ width: `${tableWidths.classTestCount}%` }}/><col style={{ width: `${tableWidths.rate}%` }}/><col style={{ width: `${tableWidths.amount}%` }}/></colgroup>
                <thead><tr><th>ক্রমিক নং</th><th colSpan={2}>কাজের বিবরণ</th><th>বিষয় / কোর্স</th><th>খাতা / ছাত্র সংখ্যা</th><th>কোর্স সংখ্যা</th><th>ক্লাস টেস্ট সংখ্যা</th><th>পারিশ্রমিকের হার</th><th>টাকার পরিমাণ</th></tr></thead>
                <tbody>
                  {chartSections.flatMap((section) =>
                    section.rows.map((chartRow, rowIndex) => {
                      const duty = chartRow.duty;
                      const workDescriptionRowSpan = descriptionRowSpan(section.rows, rowIndex);
                      return (
                        <tr key={`${section.serial}-${chartRow.id}`}>
                          {rowIndex === 0 && <td rowSpan={section.rows.length} className="text-center">{toBengaliDigits(String(section.serial))}।</td>}
                          {rowIndex === 0 && <td rowSpan={section.rows.length} className="text-center">{section.title}</td>}
                          {workDescriptionRowSpan > 0 && (
                            <td rowSpan={workDescriptionRowSpan}>{chartRow.description}</td>
                          )}
                          <td className="individual-course-code individual-table-value text-center">{duty?.course || ""}</td>
                          <td className="individual-table-value text-center">{duty?.quantity ? toBengaliDigits(String(duty.quantity)) : ""}</td>
                          <td className="individual-table-value text-center">{duty?.courseCount ? toBengaliDigits(String(duty.courseCount)) : ""}</td>
                          <td className="individual-table-value text-center">{duty?.classTestCount ? toBengaliDigits(String(duty.classTestCount)) : ""}</td>
                          <td className="individual-table-value text-center">
                            {duty && isMinimumAmountApplied(duty)
                              ? `${toBengaliDigits(String(duty.minimumAmount))} (নূন্যতম)`
                              : duty?.rate
                                ? toBengaliDigits(String(duty.rate))
                                : ""}
                          </td>
                          <td className="individual-table-value text-center">{duty ? rowAmount(duty).toLocaleString("bn-BD") : ""}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="individual-table-total"><tr><td className="text-center font-semibold">কথায়ঃ</td><td colSpan={6} className="font-semibold">{amountInBanglaWords(total)} মাত্র |</td><td className="text-center font-semibold">মোটঃ</td><td className="text-center font-bold">{total.toLocaleString("bn-BD")}</td></tr></tfoot>
              </table>
              <div className="legacy-bottom">
              <p className="mt-5 text-[11px]">প্রতি স্বাক্ষরিত</p>
              <div className="mt-12 grid grid-cols-2 text-center text-[11px]"><div><div className="mx-auto w-56 border-t border-black pt-1">সভাপতি, পরীক্ষা কমিটি।</div></div><div><div className="mx-auto w-56 border-t border-black pt-1">পরীক্ষকের স্বাক্ষর</div><p className="mt-1">তারিখঃ</p></div></div>
              <p className="mt-6 text-center text-[11px] font-semibold underline">বিত্ত শাখা পূরণ করিবেন</p>
              <p className="mt-4 text-[11px]">{nameBangla || "................................"}-কে {amountInBanglaWords(total)} মাত্র | পরিশোধ করা হইল।</p>
              <div className="mt-12 grid grid-cols-4 text-center text-[10px]"><p>হিসাব সহকারী</p><p>হিসাব রক্ষক</p><p>সহকারী কম্পট্রোলার</p><p>কম্পট্রোলার<br/>রাজশাহী প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়</p></div>
              <div className="mt-7 border-t border-black pt-2 text-[9px] leading-5"><p><strong>বিঃদ্রঃ-</strong> বিলের মোট পরিমাণ ২০০/- টাকার উপরে হইলে ১০/- টাকা মূল্যের রাজস্ব স্ট্যাম্প দিতে হইবে।</p><p>সরকারি শিক্ষক/অফিসারদের ক্ষেত্রে যথাযথ কর্তৃপক্ষের অনুমোদন প্রয়োজন। উল্লেখ্য যে, প্রত্যেক সেমিস্টার পরীক্ষার জন্য পৃথকভাবে বিল জমা দিতে হইবে।</p></div>
              </div>
              <p className="signature-section mt-5 text-center">প্রতি স্বাক্ষরিত</p>
              <div className="signature-section grid grid-cols-2 text-center" style={{ marginTop: `${approvalSignatureGap}mm` }}><div><p className="mb-8">সভাপতি, পরীক্ষা কমিটি।</p></div><div><div className="mx-auto w-56 border-t border-black pt-1">পরীক্ষকের স্বাক্ষর</div><p className="mt-2">তারিখঃ</p></div></div>
              <div className="account-section mt-6 border border-black text-center"><p className="border-b border-black py-1 font-semibold">হিসাব শাখা পূরণ করিবেন</p><p className="py-3">{nameBangla || "................................"} কে {amountInBanglaWords(total)} মাত্র | পরিশোধ করা হইল।</p></div>
              <div className="account-section mt-10 grid grid-cols-4 text-center"><p>হিসাব সহকারী</p><p>হিসাব রক্ষক</p><p>সহকারী কম্পট্রোলার</p><p>কম্পট্রোলার<br/>রাজশাহী প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়</p></div>
              <div className="footer-section mt-5 border-t border-black pt-2 text-center leading-5"><p>বিঃদ্রঃ বিলের মোট পরিমাণ ২০০/- টাকার উপরে হইলে ১০/- টাকা মূল্যের রাজস্ব স্ট্যাম্প দিতে হইবে।</p><p>সরকারি শিক্ষক/অফিসারদের ক্ষেত্রে যথাযথ কর্তৃপক্ষের অনুমোদন প্রয়োজন। উল্লেখ্য যে, প্রত্যেক সেমিস্টার পরীক্ষার জন্য পৃথকভাবে বিল জমা দিতে হইবে।</p></div>
              </SutonnyBillText>
             </article>
             </div>
           </section>
                 </div>
       </div>
      <style jsx global>{`
        .bill-sheet {
          box-sizing: border-box;
          width: 215.9mm;
          min-height: 355.6mm;
          padding: 12mm 13mm;
          font-family: "SutonnyMJ", serif;
          color: #000;
          /* Fully opaque background stops html-to-image from compositing
             the capture against a transparent/gray canvas fallback, which
             is what makes exported text look washed-out/ash colored. */
          background-color: #ffffff;
          -webkit-font-smoothing: antialiased;
        }
        .legal-page-limit {
          position: absolute;
          top: 355.6mm;
          left: 0;
          right: 0;
          z-index: 20;
          border-top: 2px dashed #dc2626;
          pointer-events: none;
        }
        .legal-page-limit span {
          position: absolute;
          right: 8px;
          bottom: 4px;
          border-radius: 4px;
          background: #dc2626;
          padding: 2px 7px;
          color: white;
          font-family: Arial, sans-serif;
          font-size: 11px;
          font-weight: 600;
        }
        .bill-sheet * { color: inherit; }
        .bill-sheet .individual-course-code,
        .bill-sheet .individual-course-code * {
          font-family: "Times New Roman", Times, serif !important;
        }
        .bill-header { font-size: var(--header-font-size); }
        .bill-header > p { font-size: calc(var(--header-font-size) - 2px); }
        .bill-header > h2 { font-size: calc(var(--header-font-size) + 6px); }
        .bill-header > h1 { font-size: calc(var(--header-font-size) + 5px); }
        .teacher-info { font-size: var(--teacher-font-size); }
        .bill-meta { font-size: var(--exam-font-size); }
        .bill-table { font-size: var(--main-table-font-size); }
        .bill-table .individual-table-value { font-size: var(--table-values-font-size); }
        .bill-table .individual-table-total { font-size: var(--table-total-font-size); }
        .signature-section { font-size: var(--signature-font-size); }
        .account-section { font-size: var(--account-font-size); }
        .footer-section { font-size: var(--footer-font-size); }
        .teacher-info { margin-bottom: var(--teacher-gap); }
        .bill-meta, .bill-table { border-collapse: collapse; border-spacing: 0; }
        .bill-meta, .bill-table { width: 100%; max-width: 100%; min-width: 0; }
        .bill-meta { margin-bottom: var(--exam-gap); }
        .bill-meta td { border: 1px solid #000; padding: 4px 5px; vertical-align: middle; }
        .bill-table { margin-top: 0; margin-bottom: var(--main-table-gap); table-layout: fixed !important; }
        .legacy-bottom { display: none; }
        .bill-table + .legacy-bottom + p { width: 50%; margin-top: 0; text-align: center; }
        .bill-table + .legacy-bottom + p + div { margin-bottom: var(--signature-gap); }
        .bill-table + .legacy-bottom + p + div + div { margin-top: 0; }
        .bill-table + .legacy-bottom + p + div + div + div { margin-bottom: var(--account-gap); }
        .bill-table + .legacy-bottom + p + div + div + div + div { margin-top: 0; padding-bottom: var(--footer-gap); }
        .bill-table th, .bill-table td { min-width: 0; max-width: 0; border: 1px solid #000; padding: 4px 5px; vertical-align: middle; overflow-wrap: anywhere; word-break: break-word; }
        .bill-table th { text-align: center; vertical-align: top; font-weight: 600; }
        @media print {
          @page { size: legal portrait; margin: 0; }
          body:has(.individual-print-document) *:not(:has(.individual-print-document)):not(.individual-print-document):not(.individual-print-document *) {
            display: none !important;
          }
          body:has(.individual-print-document) *:has(.individual-print-document) {
            position: static !important;
            display: block !important;
            width: auto !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .individual-print-document {
            display: block !important;
            width: 215.9mm !important;
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </main>
  );
}
