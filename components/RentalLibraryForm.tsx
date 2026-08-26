"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, CalendarClock, CreditCard, LoaderCircle, Search } from "lucide-react";

type Book = { id: string; title: string; author: string; edition?: string | null; publication?: string | null; imageUrl: string; quantity: number; price: number };
type Profile = { studentName: string; email: string; phone: string };
type RentalOrder = { id: string; status: string; rentedAt: string | null; dueAt: string | null; items: { id: string; quantity: number; book: Book }[] };

export default function RentalLibraryForm() {
  const [allBooks, setBooks] = useState<Book[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [profile, setProfile] = useState<Profile>({ studentName: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const books = useMemo(() => { const query = search.trim().toLowerCase(); return query ? allBooks.filter((book) => [book.title, book.author, book.edition, book.publication].some((value) => value?.toLowerCase().includes(query))) : allBooks; }, [allBooks, search]);
  const selectedBooks = useMemo(() => allBooks.filter((book) => selected.includes(book.id)), [allBooks, selected]);
  const activeItems = useMemo(() => orders.filter((order) => order.status === "ACTIVE").flatMap((order) => order.items), [orders]);
  const activeBookIds = useMemo(() => new Set(activeItems.map((item) => item.book.id)), [activeItems]);
  const remainingLimit = Math.max(0, 5 - activeItems.length);
  const total = selectedBooks.reduce((sum, book) => sum + book.price, 0);

  useEffect(() => {
    let savedProfile: Profile = { studentName: "", email: "", phone: "" };
    try { savedProfile = { ...savedProfile, ...JSON.parse(localStorage.getItem("becm-student-profile") || "{}") }; } catch {}
    setTimeout(() => setProfile(savedProfile), 0);
    Promise.all([
      fetch("/api/rental-books", { cache: "no-store" }).then((response) => response.json()),
      savedProfile.email ? fetch(`/api/rental-orders?email=${encodeURIComponent(savedProfile.email)}`, { cache: "no-store" }).then((response) => response.json()) : Promise.resolve({ orders: [] }),
    ]).then(([catalog, history]) => { setBooks(catalog.books || []); setOrders(history.orders || []); }).catch(() => setError("Unable to load the rental library")).finally(() => setPageLoading(false));
  }, []);

  function toggleBook(book: Book) {
    if (book.quantity < 1 || activeBookIds.has(book.id)) return;
    setSelected((current) => current.includes(book.id) ? current.filter((id) => id !== book.id) : current.length < remainingLimit ? [...current, book.id] : current);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const rentalBooks = selected.map((id) => ({ id, quantity: 1 as const }));
      const response = await fetch("/api/student-payments/initiate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profile, rentalBookCount: selected.length, rentalBooks, labReportOption: "none", associationYear: 0, letterOfAttestation: false, equivalentCertificate: false }) });
      const data = await response.json() as { paymentUrl?: string; error?: string };
      if (!response.ok || !data.paymentUrl) throw new Error(data.error || "Unable to start payment");
      localStorage.setItem("becm-student-profile", JSON.stringify(profile));
      location.assign(data.paymentUrl);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to start payment"); setLoading(false); }
  }

  const fieldClass = "h-11 rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
  if (pageLoading) return <div className="flex min-h-72 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return <div data-rental-library className="space-y-8">
    <section><Link href="/student/bill-payment" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><ArrowLeft className="h-4 w-4" /> Back to bill payment</Link><h1 className="text-3xl font-extrabold">Rental library books</h1><p className="mt-2 text-slate-500">Select each title once. You may rent up to 5 books for 180 days.</p><label className="relative mt-5 block max-w-2xl"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" placeholder="Search by book title, author, edition or publication" /></label></section>

    {orders.length > 0 && <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6"><div className="flex items-center gap-3"><CalendarClock className="h-6 w-6 text-blue-700" /><h2 className="text-xl font-bold">My rented books</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2">{orders.flatMap((order) => order.items.map((item) => <article key={item.id} className="flex gap-4 rounded-xl bg-white p-4 shadow-sm"><Image src={item.book.imageUrl} alt={item.book.title} width={64} height={88} unoptimized className="h-22 w-16 rounded-lg object-cover" /><div><h3 className="font-bold">{item.book.title}</h3><p className="text-sm text-slate-500">{item.book.author}</p>{(item.book.edition || item.book.publication) && <p className="text-xs text-slate-500">{[item.book.edition, item.book.publication].filter(Boolean).join(" · ")}</p>}<p className="mt-2 text-sm font-semibold text-blue-700">Quantity: {item.quantity}</p><p className="text-sm text-slate-600">Valid until: {order.dueAt ? new Date(order.dueAt).toLocaleDateString() : "Pending"}</p></div></article>))}</div></section>}

    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_340px]"><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{books.map((book) => { const checked = selected.includes(book.id); const disabled = book.quantity < 1 || activeBookIds.has(book.id) || (!checked && selected.length >= remainingLimit); return <label key={book.id} className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition ${checked ? "border-blue-500 ring-4 ring-blue-100" : "border-slate-200"} ${disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleBook(book)} className="absolute right-4 top-4 z-10 h-5 w-5 accent-blue-600" /><div className="relative h-48 bg-slate-100"><Image src={book.imageUrl} alt={book.title} fill sizes="(min-width: 1024px) 25vw, 50vw" unoptimized className="object-cover" /></div><div className="p-4"><h2 className="font-bold">{book.title}</h2><p className="mt-1 text-sm text-slate-500">{book.author}</p><div className="mt-4 flex items-center justify-between text-sm"><span className={book.quantity ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>{book.quantity ? `${book.quantity} available` : "Out of stock"}</span><strong>৳{book.price}</strong></div></div></label>; })}{!books.length && <div className="col-span-full rounded-2xl border border-dashed p-10 text-center text-slate-500"><BookOpen className="mx-auto h-10 w-10" /><p className="mt-3">No rental books are currently available.</p></div>}</section>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Rental summary</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">{selected.length}/{remainingLimit}</span></div><div className="mt-4 space-y-3">{selectedBooks.map((book) => <div key={book.id} className="flex justify-between gap-3 text-sm"><span>{book.title}</span><strong>৳{book.price}</strong></div>)}{!selected.length && <p className="text-sm text-slate-500">{remainingLimit > 0 ? `Select up to ${remainingLimit} more available ${remainingLimit === 1 ? "title" : "titles"}.` : "You currently have the maximum of five active rentals."}</p>}</div><div className="mt-5 flex justify-between border-t border-dashed pt-5"><span className="font-semibold">Total bill</span><strong className="text-3xl text-blue-700">৳{total}</strong></div><p className="mt-2 text-xs text-slate-500">Rental validity: 180 days from successful payment</p><div className="mt-6 grid gap-3"><input required value={profile.studentName} onChange={(e) => setProfile({ ...profile, studentName: e.target.value })} className={fieldClass} placeholder="Full name" /><input required type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={fieldClass} placeholder="Email address" /><input required type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={fieldClass} placeholder="01XXXXXXXXX" /></div>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button type="submit" disabled={loading || !selected.length} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 font-semibold text-white disabled:opacity-50">{loading ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Connecting…</> : <><CreditCard className="h-5 w-5" /> Pay rental bill</>}</button></aside>
    </form>
  </div>;
}
