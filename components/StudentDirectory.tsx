"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Eye, Pencil, Plus, Printer, Search, Upload, X } from "lucide-react";
import { academicYears, departmentName, semesters, type StudentDirectoryRecord } from "@/lib/storage/studentDirectory";

const emptyStudent: StudentDirectoryRecord = { id: "", department: departmentName, series: "", year: "1st", semester: "Odd", section: "A", name: "", rollNo: "", registrationNo: "", fatherName: "", motherName: "", localGuardian: "", gender: "Male", birthDate: "" };
const sessionLabel = (series: string) => series ? `${series}-${Number(series) + 1}` : "";
const dateLabel = (value: string) => value ? value.split("-").reverse().join("/") : "";
const latestSeries = new Date().getFullYear();
const standardSeries = Array.from({ length: Math.max(1, latestSeries - 2018 + 1) }, (_, index) => String(latestSeries - index));

function SearchableSessionSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (series: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeWhenOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", closeWhenOutside);
    return () => document.removeEventListener("mousedown", closeWhenOutside);
  }, [open]);

  const matching = options.filter((series) => sessionLabel(series).includes(search.trim()));

  return <div ref={containerRef} className="relative">
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-left text-sm outline-none focus:border-blue-500">
      <span>{value ? sessionLabel(value) : "Select"}</span><ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="absolute z-40 mt-1 w-full rounded-sm border border-slate-400 bg-white p-1 shadow-xl">
      <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} className="mb-1 h-9 w-full rounded-sm border-2 border-slate-800 px-2 text-sm outline-none" aria-label="Search sessions" />
      <div className="max-h-48 overflow-y-auto">
        <button type="button" onClick={() => { onChange(""); setOpen(false); setSearch(""); }} className="block w-full px-2 py-1.5 text-left text-sm hover:bg-blue-500 hover:text-white">Select</button>
        {matching.map((series) => <button key={series} type="button" onClick={() => { onChange(series); setOpen(false); setSearch(""); }} className={`block w-full px-2 py-1.5 text-left text-sm hover:bg-blue-500 hover:text-white ${value === series ? "bg-slate-200" : ""}`}>{sessionLabel(series)}</button>)}
        {!matching.length && <p className="px-2 py-3 text-sm text-slate-500">No session found</p>}
      </div>
    </div>}
  </div>;
}

export default function StudentDirectory() {
  const [records, setRecords] = useState<StudentDirectoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ series: "", year: "", semester: "" });
  const [applied, setApplied] = useState(filters);
  const [searched, setSearched] = useState(false);
  const [editing, setEditing] = useState<StudentDirectoryRecord | null>(null);
  const [details, setDetails] = useState<StudentDirectoryRecord | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">("all");

  useEffect(() => { fetch(`/api/students/directory?refresh=${Date.now()}`, { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); setRecords(body.records || []); }).catch((error) => setMessage(error.message || "Unable to load students")).finally(() => setLoading(false)); }, []);
  const seriesOptions = useMemo(() => [...new Set([...standardSeries, ...records.map((record) => record.series)])].sort().reverse(), [records]);
  const filtered = useMemo(() => searched ? records.filter((record) => {
    const remainsInSemester = record.year === applied.year && record.semester === applied.semester;
    const selectedOrOlderSeries = Number(record.series) <= Number(applied.series);
    const text = `${record.name} ${record.rollNo} ${record.registrationNo} ${record.fatherName} ${record.motherName}`.toLowerCase();
    return remainsInSemester && selectedOrOlderSeries && text.includes(query.toLowerCase());
  }).sort((first, second) => {
    const firstGroup = first.series === applied.series ? 0 : 1;
    const secondGroup = second.series === applied.series ? 0 : 1;
    if (firstGroup !== secondGroup) return firstGroup - secondGroup;
    return first.rollNo.localeCompare(second.rollNo, undefined, { numeric: true, sensitivity: "base" });
  }) : [], [records, applied, query, searched]);
  const pages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const offset = pageSize === "all" ? 0 : (Math.min(page, pages) - 1) * pageSize;
  const visible = pageSize === "all" ? filtered : filtered.slice(offset, offset + pageSize);

  function searchStudents() {
    if (!filters.series || !filters.year || !filters.semester) {
      setSearched(false);
      setMessage("Select Session, Year and Semester before searching.");
      return;
    }
    setApplied(filters);
    setSearched(true);
    setMessage("");
    setPage(1);
  }

  async function saveStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setMessage("");
    const record = { ...editing, id: editing.id || crypto.randomUUID() };
    const response = await fetch("/api/students/directory", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records: [record] }) });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error || "Unable to save student"); return; }
    setRecords(body.records || []); setEditing(null); setMessage("Student saved successfully.");
  }

  const field = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500";
  return <section className="min-h-screen bg-[#f7f9fd] p-3 sm:p-6">
    <div className="border-t border-[#0a315b] bg-white shadow-sm">
      <div className="grid items-center gap-4 border-b border-slate-200 px-5 py-4 md:grid-cols-3">
        <h1 className="text-center text-xl font-bold text-[#102555] md:col-start-1">Search Student</h1>
        <button type="button" onClick={() => setEditing({ ...emptyStudent })} className="justify-self-center rounded bg-[#082f57] px-4 py-2 text-sm font-bold text-white md:col-start-2"><Plus className="mr-1 inline h-4 w-4" />Add Student</button>
        <Link href="/teacher/students/upload" className="justify-self-center rounded bg-[#082f57] px-4 py-2 text-sm font-bold text-white md:justify-self-end"><Upload className="mr-1 inline h-4 w-4" />Upload Student</Link>
      </div>
      <div className="grid gap-x-10 gap-y-3 border-b border-[#0a315b] p-5 md:grid-cols-2">
        <label className="grid items-center gap-2 text-sm font-semibold sm:grid-cols-[160px_1fr]">Department<select className={field} value={departmentName} disabled><option>{departmentName}</option></select></label>
        <div className="grid items-center gap-2 text-sm font-semibold sm:grid-cols-[160px_1fr]"><span>Session</span><SearchableSessionSelect value={filters.series} options={seriesOptions} onChange={(series) => setFilters({ ...filters, series })} /></div>
        <label className="grid items-center gap-2 text-sm font-semibold sm:grid-cols-[160px_1fr]">Year<select className={field} value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}><option value="">Select</option>{academicYears.map((year) => <option key={year}>{year}</option>)}</select></label>
        <label className="grid items-center gap-2 text-sm font-semibold sm:grid-cols-[160px_1fr]">Semester<select className={field} value={filters.semester} onChange={(e) => setFilters({ ...filters, semester: e.target.value })}><option value="">Select</option>{semesters.map((semester) => <option key={semester}>{semester}</option>)}</select></label>
        <button type="button" onClick={searchStudents} className="mt-2 w-fit rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white"><Search className="mr-1 inline h-4 w-4" />Search Students</button>
      </div>
    </div>
    {message && <p role="status" className={`my-4 rounded-lg p-3 text-sm font-semibold ${message.includes("successfully") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message}</p>}
    <div className="mt-5 bg-white p-3 shadow-sm print:shadow-none">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 print:hidden"><label className="text-sm font-semibold">Show <select className="mx-1 rounded border p-1" value={pageSize} onChange={(e) => { setPageSize(e.target.value === "all" ? "all" : Number(e.target.value)); setPage(1); }}><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="all">All</option></select> entries</label><label className="text-sm font-semibold">Search: <input className="rounded border px-2 py-1" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} /></label><button type="button" onClick={() => window.print()} className="rounded bg-[#082f57] px-4 py-2 text-sm font-bold text-white"><Printer className="mr-1 inline h-4 w-4" />Print</button></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1200px] border-collapse text-sm"><thead className="bg-[#082f57] text-white"><tr>{["Sl. No","Student Name","Roll No","Registration No","Father's Name","Mother's Name","Local Guardian","Gender","Birth Date","Details","Edit"].map((heading) => <th key={heading} className="border border-slate-300 px-3 py-3 text-center">{heading}</th>)}</tr></thead><tbody>{visible.map((record, index) => <tr key={record.id} className="odd:bg-white even:bg-slate-50"><td className="border p-3 text-center">{offset + index + 1}</td><td className="border p-3">{record.name}</td><td className="border p-3">{record.rollNo}</td><td className="border p-3">{record.registrationNo}</td><td className="border p-3">{record.fatherName}</td><td className="border p-3">{record.motherName}</td><td className="border p-3">{record.localGuardian}</td><td className="border p-3">{record.gender}</td><td className="border p-3">{dateLabel(record.birthDate)}</td><td className="border p-3 text-center"><button type="button" onClick={() => setDetails(record)} className="rounded bg-green-600 p-2 text-white"><Eye className="h-4 w-4" /></button></td><td className="border p-3 text-center"><button type="button" onClick={() => setEditing(record)} className="rounded bg-cyan-600 p-2 text-white"><Pencil className="h-4 w-4" /></button></td></tr>)}{!loading && !visible.length && <tr><td colSpan={11} className="border p-10 text-center text-slate-500">No students found.</td></tr>}{loading && <tr><td colSpan={11} className="border p-10 text-center text-slate-500">Loading students...</td></tr>}</tbody></table></div>
      <div className="mt-4 flex items-center justify-between text-sm"><span>Showing {filtered.length ? offset + 1 : 0} to {Math.min(offset + visible.length, filtered.length)} of {filtered.length} entries</span><div className="flex gap-2 print:hidden"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button><span className="rounded bg-[#082f57] px-3 py-2 text-white">{Math.min(page, pages)}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Next</button></div></div>
    </div>
    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"><form onSubmit={saveStudent} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-6 py-4"><div><h2 className="text-xl font-bold">{editing.id ? "Update Student" : "Add Student"}</h2><p className="mt-1 text-xs text-slate-500">Use the curriculum series the student has followed since 1st Year Odd Semester. Roll-number prefixes do not determine OBE/Non-OBE status.</p></div><button type="button" onClick={() => setEditing(null)}><X /></button></div><div className="grid gap-4 p-6 md:grid-cols-2">{([['name','Student Name'],['rollNo','Roll No'],['registrationNo','Registration No'],['series','Curriculum Series (e.g. 2020)'],['fatherName',"Father's Name"],['motherName',"Mother's Name"],['localGuardian','Local Guardian']] as const).map(([key,label]) => <label key={key} className="text-sm font-semibold">{label}<input required={['name','rollNo','registrationNo','series'].includes(key)} pattern={key === 'series' ? '\\d{4}' : undefined} className={`${field} mt-1`} value={editing[key]} onChange={(e) => setEditing({ ...editing, [key]: e.target.value })} /></label>)}<label className="text-sm font-semibold">Curriculum Session (calculated)<input readOnly tabIndex={-1} className={`${field} mt-1 bg-slate-100 text-slate-600`} value={/^\d{4}$/.test(editing.series) ? sessionLabel(editing.series) : "Enter a four-digit series"} /></label><label className="text-sm font-semibold">Year<select className={`${field} mt-1`} value={editing.year} onChange={(e) => setEditing({ ...editing, year: e.target.value as StudentDirectoryRecord['year'] })}>{academicYears.map((v) => <option key={v}>{v}</option>)}</select></label><label className="text-sm font-semibold">Semester<select className={`${field} mt-1`} value={editing.semester} onChange={(e) => setEditing({ ...editing, semester: e.target.value as StudentDirectoryRecord['semester'] })}>{semesters.map((v) => <option key={v}>{v}</option>)}</select></label><label className="text-sm font-semibold">Gender<select className={`${field} mt-1`} value={editing.gender} onChange={(e) => setEditing({ ...editing, gender: e.target.value })}>{["Male","Female","Other"].map((v) => <option key={v}>{v}</option>)}</select></label><label className="text-sm font-semibold">Birth Date<input required type="date" className={`${field} mt-1`} value={editing.birthDate} onChange={(e) => setEditing({ ...editing, birthDate: e.target.value })} /></label></div><div className="flex justify-end gap-2 border-t p-4"><button type="button" onClick={() => setEditing(null)} className="rounded border px-4 py-2">Back</button><button className="rounded bg-green-600 px-4 py-2 font-semibold text-white">Save</button></div></form></div>}
    {details && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"><div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl"><div className="flex justify-between"><h2 className="text-xl font-bold">Student Details</h2><button onClick={() => setDetails(null)}><X /></button></div><dl className="mt-5 grid grid-cols-2 gap-3 text-sm">{Object.entries({ Name: details.name, Roll: details.rollNo, Registration: details.registrationNo, Series: details.series, Session: sessionLabel(details.series), Year: details.year, Semester: details.semester, Father: details.fatherName, Mother: details.motherName, Guardian: details.localGuardian, Gender: details.gender, "Birth Date": dateLabel(details.birthDate) }).map(([key,value]) => <div key={key}><dt className="font-semibold text-slate-500">{key}</dt><dd>{value || "-"}</dd></div>)}</dl></div></div>}
  </section>;
}
