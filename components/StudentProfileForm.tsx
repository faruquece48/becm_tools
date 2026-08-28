"use client";

import { FormEvent, useEffect, useState } from "react";
import { BookOpenText, LoaderCircle, Save, UserRound } from "lucide-react";

type Profile = { name: string; email: string; phone: string; roll: string; series: string; department: string };
type Rental = { id:string; status:string; rentedAt:string|null; dueAt:string|null; returnedAt:string|null; items:Array<{id:string;returnedAt:string|null;book:{title:string;author:string;edition:string|null}}> };
const emptyProfile: Profile = { name: "", email: "", phone: "", roll: "", series: "", department: "BECM" };

export default function StudentProfileForm() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let local = { studentName: "", email: "", phone: "", roll: "", series: "", department: "BECM" };
    try { local = { ...local, ...JSON.parse(localStorage.getItem("becm-student-profile") || "{}") }; } catch {}
    const initial = { ...emptyProfile, name: local.studentName, email: local.email, phone: local.phone, roll: local.roll, series: local.series, department: local.department || "BECM" };
    setTimeout(() => setProfile(initial), 0);
    if (!local.email) { setTimeout(() => setLoading(false), 0); return; }
    fetch(`/api/student-profile?email=${encodeURIComponent(local.email)}`, { cache: "no-store" }).then((response) => response.json()).then((data) => { if (data.profile) setProfile(data.profile); if (data.rentals) setRentals(data.rentals); }).catch(() => setError("Unable to load your saved profile")).finally(() => setLoading(false));
  }, []);

  function update(field: keyof Profile, value: string) { setProfile((current) => ({ ...current, [field]: value })); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/student-profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save profile");
      localStorage.setItem("becm-student-profile", JSON.stringify({ studentName: profile.name, email: profile.email, phone: profile.phone, roll: profile.roll, series: profile.series, department: profile.department }));
      setMessage("Your student profile has been saved.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save profile"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex min-h-72 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-blue-600" /></div>;
  const inputClass = "mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
  return <div className="mx-auto max-w-3xl"><div className="mb-7 flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 text-white"><UserRound className="h-7 w-7" /></span><div><h1 className="text-3xl font-extrabold">Student profile</h1><p className="mt-1 text-slate-500">These details are used for payments and library lending records.</p></div></div><form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold sm:col-span-2">Full name<input required value={profile.name} onChange={(e) => update("name", e.target.value)} className={inputClass} /></label><label className="text-sm font-semibold">Email address<input required type="email" value={profile.email} onChange={(e) => update("email", e.target.value)} className={inputClass} /></label><label className="text-sm font-semibold">Mobile number<input required type="tel" value={profile.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} placeholder="01XXXXXXXXX" /></label><label className="text-sm font-semibold">Roll number<input required value={profile.roll} onChange={(e) => update("roll", e.target.value)} className={inputClass} placeholder="e.g. 2101001" /></label><label className="text-sm font-semibold">Series<input required value={profile.series} onChange={(e) => update("series", e.target.value)} className={inputClass} placeholder="e.g. 2021" /></label><label className="text-sm font-semibold sm:col-span-2">Department<input required value={profile.department} onChange={(e) => update("department", e.target.value)} className={inputClass} /></label></div>{error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}<button disabled={saving} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Save profile</button></form><section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><BookOpenText className="h-6 w-6 text-blue-600"/><div><h2 className="text-xl font-bold">My rented books</h2><p className="text-sm text-slate-500">Activated rentals and their validity periods.</p></div></div><div className="mt-5 space-y-4">{rentals.flatMap((rental)=>rental.items.map((item)=><article key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{item.book.title}</h3><p className="mt-1 text-sm text-slate-500">{item.book.author}{item.book.edition?` · ${item.book.edition}`:""}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.returnedAt?"bg-blue-50 text-blue-700":rental.dueAt&&new Date(rental.dueAt).getTime()<Date.now()?"bg-red-50 text-red-700":"bg-emerald-50 text-emerald-700"}`}>{item.returnedAt?"Returned":rental.dueAt&&new Date(rental.dueAt).getTime()<Date.now()?"Expired":"Active"}</span></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-slate-500">Activated:</span> {rental.rentedAt?new Date(rental.rentedAt).toLocaleDateString():"—"}</p><p><span className="text-slate-500">Valid until:</span> {rental.dueAt?new Date(rental.dueAt).toLocaleDateString():"—"}</p></div></article>))}{!rentals.length&&<p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No activated rental books yet.</p>}</div></section></div>;
}
