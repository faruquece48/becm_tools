"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { formatTabulatorDate, loadTabulators, saveTabulators, type TabulatorRecord } from "@/lib/storage/tabulators";

export default function TabulatorsPage() {
  const [records, setRecords] = useState<TabulatorRecord[]>([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => { loadTabulators().then(setRecords).catch((error) => window.alert(error instanceof Error ? error.message : "Unable to load tabulators")); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return records;
    return records.filter((record) => Object.values(record).some((value) => value.toLocaleLowerCase().includes(query)));
  }, [records, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRecords = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const first = filtered.length ? (currentPage - 1) * pageSize + 1 : 0;
  const last = Math.min(currentPage * pageSize, filtered.length);

  const remove = async (record: TabulatorRecord) => {
    if (!window.confirm(`Delete the ${record.examYear} ${record.semester} tabulator record?`)) return;
    const updated = records.filter((item) => item.id !== record.id);
    setRecords(updated);
    saveTabulators(updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-7">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex justify-end py-3">
          <Link href="/result/tabulators/new" className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600">
            <Plus className="h-4 w-4" /> Add Tabulators
          </Link>
        </div>

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              Show
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
                {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              entries
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              Search:
              <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="w-56 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] border-collapse text-sm">
              <thead className="bg-[#082f57] text-white">
                <tr>{["Sl.", "Exam Type", "Exam Year", "Academic Year", "Semester", "Chairman", "Member 1", "Member 2", "Form Date", "Reporting Date", "Edit", "Delete"].map((heading) => <th key={heading} className="border-r border-white/20 px-3 py-3 text-center font-bold">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {visibleRecords.map((record, index) => (
                  <tr key={record.id} className="border-b border-slate-200 odd:bg-white even:bg-slate-50 hover:bg-indigo-50/50">
                    <td className="px-3 py-3 text-center">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-3 py-3">{record.examType}</td>
                    <td className="px-3 py-3">{record.examYear}</td>
                    <td className="px-3 py-3">{record.academicYear}</td>
                    <td className="px-3 py-3">{record.semester}</td>
                    <td className="px-3 py-3">{record.chairman}</td>
                    <td className="px-3 py-3">{record.member1}</td>
                    <td className="px-3 py-3">{record.member2}</td>
                    <td className="px-3 py-3">{formatTabulatorDate(record.formDate)}</td>
                    <td className="px-3 py-3">{formatTabulatorDate(record.reportingDate)}</td>
                    <td className="px-3 py-3 text-center"><Link href={`/result/tabulators/${record.id}/edit`} aria-label="Edit tabulator" className="inline-flex rounded-lg bg-emerald-500 p-2.5 text-white hover:bg-emerald-600"><Pencil className="h-4 w-4" /></Link></td>
                    <td className="px-3 py-3 text-center"><button type="button" onClick={() => remove(record)} aria-label="Delete tabulator" className="inline-flex rounded-lg bg-red-500 p-2.5 text-white hover:bg-red-600"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
                {!visibleRecords.length && <tr><td colSpan={12} className="px-4 py-12 text-center text-slate-500">No tabulator records found.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>Showing {first} to {last} of {filtered.length} entries</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button type="button" key={number} onClick={() => setPage(number)} className={`h-9 min-w-9 rounded-lg border px-3 ${number === currentPage ? "border-[#082f57] bg-[#082f57] text-white" : "bg-white hover:bg-slate-50"}`}>{number}</button>)}
              <button type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}