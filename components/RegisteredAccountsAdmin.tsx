"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Search, ShieldCheck, ShieldOff, UsersRound } from "lucide-react";

type Account = { id: string; email: string; role: string; name: string | null; phone: string | null; active: boolean; registeredAt: string; lastLoginAt: string; loginCount: number };

export default function RegisteredAccountsAdmin() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/portal-accounts", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load accounts");
    setAccounts(data.accounts || []);
  }

  useEffect(() => { const timer = window.setTimeout(() => load().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load accounts")).finally(() => setLoading(false)), 0); return () => window.clearTimeout(timer); }, []);
  const filtered = useMemo(() => accounts.filter((account) => (role === "all" || account.role === role) && [account.name, account.email, account.phone].some((value) => value?.toLowerCase().includes(query.toLowerCase()))), [accounts, query, role]);

  async function toggle(account: Account) {
    const response = await fetch("/api/portal-accounts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: account.id, active: !account.active }) });
    if (response.ok) setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, active: !item.active } : item));
  }

  return <div><div><h1 className="text-3xl font-extrabold">Registered account monitoring</h1><p className="mt-2 text-slate-500">Review account roles, activity, login counts and access status.</p></div><div className="mt-7 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"><label className="relative flex-1"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 pl-12 pr-4 outline-none focus:border-blue-400" placeholder="Search name, email or phone" /></label><select value={role} onChange={(e) => setRole(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-4"><option value="all">All roles</option><option value="student">Students</option><option value="teacher">Teachers</option><option value="staff">Staff</option></select></div>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}{loading ? <div className="flex h-64 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-blue-600" /></div> : <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Account</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Registered</th><th className="px-5 py-4">Last login</th><th className="px-5 py-4">Logins</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((account) => <tr key={account.id}><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700"><UsersRound className="h-5 w-5" /></span><div><p className="font-semibold">{account.name || "Unnamed account"}</p><p className="text-slate-500">{account.email}{account.phone ? ` · ${account.phone}` : ""}</p></div></div></td><td className="px-5 py-4 capitalize">{account.role}</td><td className="px-5 py-4">{new Date(account.registeredAt).toLocaleDateString()}</td><td className="px-5 py-4">{new Date(account.lastLoginAt).toLocaleString()}</td><td className="px-5 py-4 font-semibold">{account.loginCount}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${account.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{account.active ? "Active" : "Disabled"}</span></td><td className="px-5 py-4"><button type="button" onClick={() => toggle(account)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${account.active ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{account.active ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}{account.active ? "Disable" : "Enable"}</button></td></tr>)}{!filtered.length && <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">No matching registered accounts.</td></tr>}</tbody></table></div>}</div>;
}
