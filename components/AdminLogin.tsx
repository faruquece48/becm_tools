"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";

export default function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: form.get("id"), password: form.get("password") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign in");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to sign in"); setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#071e49] via-[#0b3970] to-[#087f8b] p-5"><div className="w-full max-w-md rounded-3xl border border-white/20 bg-white p-8 shadow-2xl"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white"><ShieldCheck className="h-8 w-8" /></span><h1 className="mt-5 text-center text-3xl font-extrabold text-[#102555]">Admin Login</h1><p className="mt-2 text-center text-sm text-slate-500">Sign in to manage rental-library books and inventory.</p>{!configured && <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Set ADMIN_EMAIL and ADMIN_PASSWORD in the project environment.</p>}<form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-semibold text-slate-700">Admin ID<div className="relative mt-2"><UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input name="id" required autoComplete="username" className="h-12 w-full rounded-xl border border-slate-200 pl-12 pr-4 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" placeholder="Enter admin ID" /></div></label><label className="block text-sm font-semibold text-slate-700">Password<div className="relative mt-2"><LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input name="password" required type={showPassword ? "text" : "password"} autoComplete="current-password" className="h-12 w-full rounded-xl border border-slate-200 pl-12 pr-12 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" placeholder="Enter password" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-0 top-0 flex h-full w-12 items-center justify-center text-slate-500" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></label>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={loading || !configured} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 font-semibold text-white shadow-lg disabled:opacity-50">{loading && <LoaderCircle className="h-5 w-5 animate-spin" />} Sign in</button></form></div></main>;
}
