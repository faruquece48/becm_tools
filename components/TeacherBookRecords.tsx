"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, Search, X } from "lucide-react";

type Teacher = { name: string | null; email: string };
type Book = { id: string; title: string; author: string; edition: string | null; quantity: number };
type RecordItem = { id: string; returnedAt: string | null; book: Book };
type TeacherRecord = { id: string; teacherName: string; teacherEmail: string | null; issuedAt: string; dueAt: string | null; items: RecordItem[] };
type ProtectedAction = { itemId: string; action: "return" | "reopen" };

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "Not set";
}

export default function TeacherBookRecords() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [records, setRecords] = useState<TeacherRecord[]>([]);
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [protectedAction, setProtectedAction] = useState<ProtectedAction | null>(null);
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/staff/teacher-book-records", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load teacher records");
      setTeachers(data.teachers || []); setBooks(data.books || []); setRecords(data.records || []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load teacher records"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Load the staff-managed records after this client workspace mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const visibleBooks = useMemo(() => {
    const value = search.trim().toLowerCase();
    return books.filter((book) => book.quantity > 0 && (!value || `${book.title} ${book.author} ${book.edition || ""}`.toLowerCase().includes(value)));
  }, [books, search]);

  function selectTeacher(name: string) {
    setTeacherName(name);
    const teacher = teachers.find((entry) => entry.name?.trim().toLowerCase() === name.trim().toLowerCase());
    setTeacherEmail(teacher?.email || "");
  }

  async function createRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/staff/teacher-book-records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teacherName, teacherEmail, issuedAt, bookIds: selected }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save teacher record");
      setTeacherName(""); setTeacherEmail(""); setIssuedAt(""); setSelected([]); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save teacher record"); }
    finally { setSaving(false); }
  }

  async function updateRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!protectedAction) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/staff/teacher-book-records", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...protectedAction, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update teacher record");
      setProtectedAction(null); setPassword(""); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update teacher record"); }
    finally { setSaving(false); }
  }

  return <section className="space-y-6">
    <form onSubmit={createRecord} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Issue books to a teacher</h2>
      <p className="mt-1 text-sm text-slate-500">Choose a registered teacher or type any teacher name. No payment is required.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="grid gap-1.5 text-sm font-semibold">Teacher name<input required list="teacher-names" value={teacherName} onChange={(event) => selectTeacher(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500" placeholder="Select or type a name" /><datalist id="teacher-names">{teachers.map((teacher) => teacher.name && <option key={teacher.email} value={teacher.name}>{teacher.email}</option>)}</datalist></label>
        <label className="grid gap-1.5 text-sm font-semibold">Email (optional)<input type="email" value={teacherEmail} onChange={(event) => setTeacherEmail(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500" placeholder="teacher@example.com" /></label>
        <label className="grid gap-1.5 text-sm font-semibold">Issue date<input required type="date" value={issuedAt} onChange={(event) => setIssuedAt(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500" /></label>
      </div>
      <label className="relative mt-5 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 outline-none" placeholder="Search books" /></label>
      <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{visibleBooks.map((book) => <label key={book.id} className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={selected.includes(book.id)} disabled={!selected.includes(book.id) && selected.length >= 5} onChange={() => setSelected((old) => old.includes(book.id) ? old.filter((id) => id !== book.id) : [...old, book.id])} /><span><strong className="block">{book.title}</strong><span className="text-slate-500">{book.author} · {book.quantity} available</span></span></label>)}</div>
      <button disabled={saving || !teacherName.trim() || selected.length === 0} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Save teacher record ({selected.length})</button>
    </form>

    {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p className="flex justify-center p-10"><LoaderCircle className="animate-spin" /></p> : <div className="space-y-5">{records.map((record) => <article key={record.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><header className="bg-slate-50 px-5 py-4"><h2 className="font-bold">{record.teacherName}</h2><p className="text-sm text-slate-500">{record.teacherEmail || "Manually entered teacher"} · Issued {date(record.issuedAt)}</p></header><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-blue-50 text-xs uppercase text-slate-600"><tr><th className="px-4 py-3">Book</th><th className="px-4 py-3">Author</th><th className="px-4 py-3">Edition</th><th className="px-4 py-3">Issue date</th><th className="px-4 py-3">Payment status</th><th className="px-4 py-3">Condition</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{record.items.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{item.book.title}</td><td className="px-4 py-3">{item.book.author}</td><td className="px-4 py-3">{item.book.edition || "Not specified"}</td><td className="px-4 py-3">{date(record.issuedAt)}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Paid</span></td><td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.returnedAt ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{item.returnedAt ? "Returned" : "Active"}</span></td><td className="px-4 py-3"><div className="flex items-center gap-2"><span className={`text-xs font-bold ${item.returnedAt ? "text-emerald-700" : "text-amber-700"}`}>{item.returnedAt ? "Completed" : "Not completed"}</span><button type="button" onClick={() => { setProtectedAction({ itemId: item.id, action: item.returnedAt ? "reopen" : "return" }); setPassword(""); }} className={`flex h-9 w-9 items-center justify-center rounded-full ${item.returnedAt ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{item.returnedAt ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}</button></div></td></tr>)}</tbody></table></div></article>)}{!records.length && <p className="rounded-2xl border border-dashed p-10 text-center text-slate-500">No teacher book records yet.</p>}</div>}

    {protectedAction && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-5"><form onSubmit={updateRecord} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold">Password required</h2><input autoFocus required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-4 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-blue-500" placeholder="Staff password" /><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setProtectedAction(null)} className="rounded-lg bg-slate-100 px-4 py-2 font-semibold">Cancel</button><button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">Confirm</button></div></form></div>}
  </section>;
}
