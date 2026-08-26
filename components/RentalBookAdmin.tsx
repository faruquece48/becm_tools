"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { BookPlus, LoaderCircle, Pencil, Trash2, X } from "lucide-react";

type Book = { id: string; title: string; author: string; edition?: string | null; publication?: string | null; imageUrl: string; quantity: number; active: boolean };
const emptyBook = { title: "", author: "", edition: "", publication: "", imageUrl: "/Image/home.png", quantity: 0, active: true };

async function responseData(response: Response) {
  const text = await response.text();
  if (!text) return {} as { error?: string; books?: Book[] };
  try { return JSON.parse(text) as { error?: string; books?: Book[] }; }
  catch { return { error: `The server returned an invalid response (HTTP ${response.status})` }; }
}

export default function RentalBookAdmin() {
  const [books, setBooks] = useState<Book[]>([]);
  const [editing, setEditing] = useState<(typeof emptyBook & { id?: string })>(emptyBook);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/rental-books", { cache: "no-store" });
    const data = await responseData(response);
    if (!response.ok) throw new Error(data.error || `Unable to load books (HTTP ${response.status})`);
    setBooks(data.books || []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => load().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load books")), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/rental-books", { method: editing.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error || `Unable to save book (HTTP ${response.status})`);
      setEditing(emptyBook); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save book"); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Remove this book from the rental catalog? Existing rental records will be preserved.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/rental-books?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error || `Unable to remove book (HTTP ${response.status})`);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to remove book"); }
    finally { setBusy(false); }
  }

  function editBook(book: Book) {
    setEditing({ ...book, edition: book.edition || "", publication: book.publication || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const inputClass = "mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
  return <div>
    <div className="mb-7"><h1 className="text-3xl font-extrabold">Rental library inventory</h1><p className="mt-2 text-slate-500">Manage the book cover, details and current quantity shown to students.</p></div>
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <form onSubmit={save} className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6">
        <div className="flex items-center justify-between"><h2 className="font-bold">{editing.id ? "Edit book" : "Add a book"}</h2>{editing.id && <button type="button" onClick={() => setEditing(emptyBook)} aria-label="Cancel editing"><X className="h-5 w-5" /></button>}</div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm font-semibold">Title<input required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={inputClass} /></label>
          <label className="text-sm font-semibold">Author name<input required value={editing.author} onChange={(e) => setEditing({ ...editing, author: e.target.value })} className={inputClass} /></label>
          <label className="text-sm font-semibold">Edition <span className="font-normal text-slate-400">(optional)</span><input value={editing.edition} onChange={(e) => setEditing({ ...editing, edition: e.target.value })} className={inputClass} placeholder="e.g. 5th edition" /></label>
          <label className="text-sm font-semibold">Publication <span className="font-normal text-slate-400">(optional)</span><input value={editing.publication} onChange={(e) => setEditing({ ...editing, publication: e.target.value })} className={inputClass} placeholder="Publisher name" /></label>
          <label className="text-sm font-semibold">Book image URL<input required value={editing.imageUrl} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} className={inputClass} placeholder="/Image/book-cover.jpg" /></label>
          <label className="text-sm font-semibold">Current quantity<input required type="number" min="0" value={editing.quantity} onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) })} className={inputClass} /></label>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <BookPlus className="h-5 w-5" />}{editing.id ? "Save changes" : "Add book"}</button>
      </form>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{books.map((book) => <article key={book.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="relative h-44 bg-slate-100"><Image src={book.imageUrl} alt={book.title} fill unoptimized className="object-cover" /></div><div className="p-4"><h2 className="font-bold">{book.title}</h2><p className="mt-1 text-sm text-slate-500">{book.author}</p>{(book.edition || book.publication) && <p className="mt-1 text-xs text-slate-500">{[book.edition, book.publication].filter(Boolean).join(" · ")}</p>}<p className="mt-3 text-sm font-semibold text-emerald-700">{book.quantity} available</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => editBook(book)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"><Pencil className="h-4 w-4" /> Edit</button><button type="button" onClick={() => remove(book.id)} className="rounded-lg bg-red-50 p-2 text-red-700" aria-label={`Remove ${book.title}`}><Trash2 className="h-4 w-4" /></button></div></div></article>)}</section>
    </div>
  </div>;
}
