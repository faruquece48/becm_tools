"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CreditCard, FileText, LoaderCircle, Users } from "lucide-react";
import { labReportPrices } from "@/lib/studentBillPayment";

type LabOption = keyof typeof labReportPrices;
type Profile = { studentName: string; email: string; phone: string };

export default function StudentBillPaymentForm() {
  const [labReportOption, setLabReportOption] = useState<LabOption>("none");
  const [associationYear, setAssociationYear] = useState(0);
  const [letterOfAttestation, setLetterOfAttestation] = useState(false);
  const [equivalentCertificate, setEquivalentCertificate] = useState(false);
  const [profile, setProfile] = useState<Profile>({ studentName: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const total = useMemo(() => labReportPrices[labReportOption] + (associationYear ? 750 : 0) + (letterOfAttestation ? 200 : 0) + (equivalentCertificate ? 200 : 0), [labReportOption, associationYear, letterOfAttestation, equivalentCertificate]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("becm-student-profile");
      if (saved) queueMicrotask(() => setProfile((current) => ({ ...current, ...JSON.parse(saved) })));
    } catch {}
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/student-payments/initiate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profile, rentalBookCount: 0, labReportOption, associationYear, letterOfAttestation, equivalentCertificate }) });
      const data = await response.json() as { paymentUrl?: string; error?: string };
      if (!response.ok || !data.paymentUrl) throw new Error(data.error || "Unable to start payment");
      localStorage.setItem("becm-student-profile", JSON.stringify(profile));
      location.assign(data.paymentUrl);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to start payment"); setLoading(false); }
  }

  const inputClass = "mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
  const itemClass = "grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_220px] sm:items-center";
  const selectClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400";

  return <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Users className="h-5 w-5" /></span><div><h2 className="font-bold">Student information</h2><p className="text-sm text-slate-500">Loaded from your profile. You may edit it for this payment.</p></div></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold md:col-span-2">Full name<input required value={profile.studentName} onChange={(e) => setProfile({ ...profile, studentName: e.target.value })} className={inputClass} /></label><label className="text-sm font-semibold">Email address<input required type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={inputClass} /></label><label className="text-sm font-semibold">Mobile number<input required type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputClass} /></label></div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><FileText className="h-5 w-5" /></span><h2 className="font-bold">Select bill items</h2></div>
        <div className="mt-5 space-y-4">
          <label className={itemClass}><span><strong className="block text-sm">Lab report</strong><small className="text-slate-500">Select a report package</small></span><select value={labReportOption} onChange={(e) => setLabReportOption(e.target.value as LabOption)} className={selectClass}><option value="none">Not required — ৳0</option><option value="cover">Cover — ৳65</option><option value="main">Main report — ৳110</option><option value="both">Cover + main — ৳175</option></select></label>
          <label className={itemClass}><span><strong className="block text-sm">BECM Association fee</strong><small className="text-slate-500">৳750 once in each of the four years</small></span><select value={associationYear} onChange={(e) => setAssociationYear(Number(e.target.value))} className={selectClass}><option value="0">Select payment year</option>{[1,2,3,4].map((year) => <option key={year} value={year}>Year {year} — ৳750</option>)}</select></label>
          <label className={itemClass}><span><strong className="block text-sm">Letter of Attestation</strong><small className="text-slate-500">৳200 for each request</small></span><span className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm"><span>{letterOfAttestation ? "Selected — ৳200" : "Not selected"}</span><input type="checkbox" checked={letterOfAttestation} onChange={(e) => setLetterOfAttestation(e.target.checked)} className="h-5 w-5 accent-blue-600" /></span></label>
          <label className={itemClass}><span><strong className="block text-sm">Equivalent Certificate</strong><small className="text-slate-500">৳200 for each request</small></span><span className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm"><span>{equivalentCertificate ? "Selected — ৳200" : "Not selected"}</span><input type="checkbox" checked={equivalentCertificate} onChange={(e) => setEquivalentCertificate(e.target.checked)} className="h-5 w-5 accent-teal-600" /></span></label>
        </div>
      </section>
    </div>
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6"><h2 className="text-lg font-bold">Payment summary</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Lab report</span><strong>৳{labReportPrices[labReportOption]}</strong></div><div className="flex justify-between"><span className="text-slate-500">Association fee{associationYear ? ` — Year ${associationYear}` : ""}</span><strong>৳{associationYear ? 750 : 0}</strong></div><div className="flex justify-between"><span className="text-slate-500">Letter of Attestation</span><strong>৳{letterOfAttestation ? 200 : 0}</strong></div><div className="flex justify-between"><span className="text-slate-500">Equivalent Certificate</span><strong>৳{equivalentCertificate ? 200 : 0}</strong></div></div><div className="mt-5 flex items-end justify-between border-t border-dashed pt-5"><span className="font-semibold">Total payable</span><strong className="text-3xl text-blue-700">৳{total.toLocaleString()}</strong></div>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button type="submit" disabled={loading || total < 10} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 font-semibold text-white disabled:opacity-50">{loading ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Connecting…</> : <><CreditCard className="h-5 w-5" /> Pay Now</>}</button></aside>
  </form>;
}
