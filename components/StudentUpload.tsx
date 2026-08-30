"use client";

import { useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { departmentName, type StudentDirectoryRecord } from "@/lib/storage/studentDirectory";

const headers = ["Student Name", "Roll No", "Registration No", "Series", "Session", "Year", "Semester", "Father's Name", "Mother's Name", "Local Guardian", "Gender", "Birth Date"];
const cell = (row: Record<string, unknown>, key: string) => String(row[key] ?? "").trim();
const parseBirthDate = (value: unknown, rowNumber: number) => {
  let year: number; let month: number; let day: number;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    year = value.getFullYear(); month = value.getMonth() + 1; day = value.getDate();
  } else if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) throw new Error(`Row ${rowNumber}: Birth Date is not a valid Excel date.`);
    year = parsed.y; month = parsed.m; day = parsed.d;
  } else {
    const text = String(value ?? "").trim();
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) throw new Error(`Row ${rowNumber}: Birth Date must use M/D/YYYY format, for example 7/31/2002.`);
    month = Number(match[1]); day = Number(match[2]); year = Number(match[3]);
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error(`Row ${rowNumber}: Birth Date is not a valid date.`);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};
export default function StudentUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function downloadTemplate() {
    const sheet = XLSX.utils.aoa_to_sheet([headers, ["Sample Student", "2012001", "1163", "2020", "2020-2021", "1st", "Odd", "Father Name", "Mother Name", "", "Male", new Date(2002, 2, 9)]]);
    if (sheet["L2"]) sheet["L2"].z = "m/d/yyyy";
    sheet["!cols"] = headers.map(() => ({ wch: 20 }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Students");
    XLSX.writeFile(workbook, "student-upload-template.xlsx");
  }

  async function upload() {
    if (!file) { setMessage("Choose an Excel file first."); return; }
    setSaving(true); setMessage("");
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true, dateNF: "m/d/yyyy" });
      if (!rows.length) throw new Error("The Excel file contains no student rows.");
      const records: StudentDirectoryRecord[] = rows.map((row, index) => {
        let series = cell(row, "Series"); const session = cell(row, "Session"); const year = cell(row, "Year"); const semester = cell(row, "Semester"); const gender = cell(row, "Gender");
        if (!series && /^\d{4}-\d{4}$/.test(session)) series = session.slice(0, 4);
        if (!/^\d{4}$/.test(series)) throw new Error(`Row ${index + 2}: Series must be a four-digit year.`);
        const calculatedSession = `${series}-${Number(series) + 1}`;
        if (session && session !== calculatedSession) throw new Error(`Row ${index + 2}: Session must be ${calculatedSession} for series ${series}.`);
        if (!(["1st","2nd","3rd","4th"] as string[]).includes(year)) throw new Error(`Row ${index + 2}: Year must be 1st, 2nd, 3rd or 4th.`);
        if (!(["Odd","Even","Short Semester"] as string[]).includes(semester)) throw new Error(`Row ${index + 2}: Semester must be Odd, Even or Short Semester.`);
        if (!(["Male","Female","Other"] as string[]).includes(gender)) throw new Error(`Row ${index + 2}: Gender must be Male, Female or Other.`);
        const birthDate = parseBirthDate(row["Birth Date"], index + 2);
        return { id: crypto.randomUUID(), department: departmentName, series, year, semester, section: "A", name: cell(row, "Student Name"), rollNo: cell(row, "Roll No"), registrationNo: cell(row, "Registration No"), fatherName: cell(row, "Father's Name"), motherName: cell(row, "Mother's Name"), localGuardian: cell(row, "Local Guardian"), gender, birthDate } as StudentDirectoryRecord;
      });
      const response = await fetch("/api/students/directory", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to upload students");
      setMessage(`${records.length} student${records.length === 1 ? "" : "s"} uploaded successfully.`); setFile(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to read the Excel file."); }
    finally { setSaving(false); }
  }

  return <section className="min-h-screen bg-[#f7f9fd] p-3 sm:p-6"><div className="border-t border-[#0a315b] bg-white shadow-sm"><div className="border-b border-[#0a315b] px-5 py-4 text-center"><h1 className="text-xl font-bold">Upload Student</h1></div><div className="p-5"><div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><p className="font-semibold">Excel upload instructions</p><p className="mt-1">Download the template, keep its column headings unchanged, and enter the four-digit series. Session is calculated automatically; if supplied, it must match the series. For example, series <strong>2020</strong> is session <strong>2020-2021</strong>. Enter Birth Date in <strong>M/D/YYYY</strong> format, such as <strong>7/31/2002</strong>.</p><button type="button" onClick={downloadTemplate} className="mt-3 inline-flex items-center gap-2 rounded bg-blue-700 px-4 py-2 font-semibold text-white"><Download className="h-4 w-4" />Download Excel Template</button></div><div className="grid items-center gap-4 md:grid-cols-[240px_1fr_auto]"><label className="font-semibold">Excel File (.xlsx or .xls)</label><input type="file" accept=".xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] || null)} className="block w-full rounded border border-slate-300 bg-white p-2 text-sm" /><button type="button" disabled={saving} onClick={() => void upload()} className="inline-flex items-center justify-center gap-2 rounded bg-green-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"><Upload className="h-4 w-4" />{saving ? "Uploading..." : "Save"}</button></div>{message && <p role="status" className={`mt-5 rounded-lg p-3 text-sm font-semibold ${message.includes("successfully") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message}</p>}<a href="/teacher/students" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><ArrowLeft className="h-4 w-4" />Back to Student List</a></div></div><div className="mt-6 flex items-center justify-center text-slate-300"><FileSpreadsheet className="h-28 w-28" /></div></section>;
}
