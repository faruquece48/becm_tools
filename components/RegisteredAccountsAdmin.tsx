"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, LoaderCircle, Pencil, Plus, Search, ShieldCheck, ShieldOff, Trash2, UsersRound, X } from "lucide-react";

type Role = "student" | "teacher" | "staff";
type Account = { id: string; email: string; role: Role; name: string | null; phone: string | null; active: boolean; registeredAt: string; lastLoginAt: string; loginCount: number; passwordResetRequestedAt: string | null };

export default function RegisteredAccountsAdmin({ role, title }: { role: Role; title: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/portal-accounts?role=${role}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Unable to load accounts");
          setAccounts(data.accounts || []);
        })
        .catch((caught) => {
          if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unable to load accounts");
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [role]);

  const filtered = useMemo(() => accounts.filter((account) => [account.name, account.email, account.phone].some((value) => value?.toLowerCase().includes(query.toLowerCase()))), [accounts, query]);

  async function toggle(account: Account) {
    const password = window.prompt(`Enter the admin password to ${account.active ? "disable" : "enable"} this account:`);
    if (password === null) return;
    setError("");
    const response = await fetch("/api/portal-accounts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: account.id, active: !account.active, password }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) { setError(data?.error || "Unable to update account"); return; }
    setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, active: !item.active } : item));
  }

  async function editAccount(account: Account) {
    const name = window.prompt("Edit full name:", account.name || "");
    if (name === null) return;
    const email = window.prompt("Edit email address:", account.email);
    if (email === null) return;
    const phone = window.prompt("Edit phone number (optional):", account.phone || "");
    if (phone === null) return;
    setError("");
    const response = await fetch("/api/portal-accounts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: account.id, name, email, phone: phone || null }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) { setError(data?.error || "Unable to edit account"); return; }
    setAccounts((current) => current.map((item) => item.id === account.id ? data.account : item));
    setMessage("Account updated successfully.");
  }

  async function deleteAccount(account: Account) {
    if (!window.confirm(`Delete the ${account.role} account for ${account.name || account.email}? This cannot be undone.`)) return;
    const password = window.prompt("Enter the admin password to permanently delete this account:");
    if (password === null) return;
    setError("");
    const response = await fetch("/api/portal-accounts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: account.id, password }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) { setError(data?.error || "Unable to delete account"); return; }
    setAccounts((current) => current.filter((item) => item.id !== account.id));
    setMessage("Account deleted successfully.");
  }

  async function resetPassword(account: Account) {
    const password = window.prompt("Enter the admin password to authorize this reset:");
    if (password === null) return;
    const newPassword = window.prompt(`Enter a new password for ${account.name || account.email} (minimum 6 characters):`);
    if (newPassword === null) return;
    const confirmation = window.prompt("Re-enter the new account password:");
    if (confirmation === null) return;
    if (newPassword !== confirmation) { setError("The new passwords do not match."); return; }
    setError("");
    const response = await fetch("/api/portal-accounts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: account.id, password, newPassword }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) { setError(data?.error || "Unable to reset password"); return; }
    setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, passwordResetRequestedAt: null } : item));
    setMessage("Account password reset successfully.");
  }
  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/portal-accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, name: form.get("name"), email: form.get("email"), phone: form.get("phone"), password: form.get("password") }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to create account");
      setAccounts((current) => [data.account, ...current]);
      setMessage(`${role.charAt(0).toUpperCase() + role.slice(1)} account added successfully.`);
      setShowForm(false);
      formElement.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create account");
    } finally {
      setCreating(false);
    }
  }

  return <div>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-extrabold">{title}</h1><p className="mt-2 text-slate-500">Review registrations, login activity and access status for {role} accounts.</p></div>
      <button type="button" onClick={() => { setShowForm((current) => !current); setError(""); setMessage(""); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700">{showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{showForm ? "Close" : `Add ${title.slice(0, -1)}`}</button>
    </div>

    {showForm && <form onSubmit={createAccount} className="mt-6 grid gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:grid-cols-2">
      <label className="text-sm font-semibold text-slate-700">Full Name<input name="name" required maxLength={100} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-blue-400" placeholder="Full name" /></label>
      <label className="text-sm font-semibold text-slate-700">Email Address<input name="email" type="email" required maxLength={150} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-blue-400" placeholder="name@example.com" /></label>
      <label className="text-sm font-semibold text-slate-700">Phone Number<input name="phone" maxLength={30} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-blue-400" placeholder="Optional" /></label>
      <label className="text-sm font-semibold text-slate-700">Initial Password<input name="password" type="password" required minLength={6} maxLength={200} autoComplete="new-password" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-blue-400" placeholder="Minimum 6 characters" /></label>
      <div className="md:col-span-2"><button disabled={creating} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{creating ? "Adding account..." : "Add Account"}</button></div>
    </form>}

    <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="relative block"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 pl-12 pr-4 outline-none focus:border-blue-400" placeholder={`Search ${role} name, email or phone`} /></label></div>
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    {message && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-700">{message}</p>}
    {loading ? <div className="flex h-64 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-blue-600" /></div> : <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Account</th><th className="px-5 py-4">Registered</th><th className="px-5 py-4">Last login</th><th className="px-5 py-4">Logins</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((account) => <tr key={account.id}><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700"><UsersRound className="h-5 w-5" /></span><div><p className="font-semibold">{account.name || "Unnamed account"}</p>{account.passwordResetRequestedAt && <p className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Password reset requested</p>}<p className="text-slate-500">{account.email}{account.phone ? ` Ãƒâ€šÃ‚Â· ${account.phone}` : ""}</p></div></div></td><td className="px-5 py-4">{new Date(account.registeredAt).toLocaleDateString()}</td><td className="px-5 py-4">{account.loginCount ? new Date(account.lastLoginAt).toLocaleString() : "Never"}</td><td className="px-5 py-4 font-semibold">{account.loginCount}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${account.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{account.active ? "Active" : role === "student" && account.loginCount === 0 ? "Pending approval" : "Disabled"}</span></td><td className="px-5 py-4"><button type="button" onClick={() => void toggle(account)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${account.active ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{account.active ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}{account.active ? "Disable" : role === "student" && account.loginCount === 0 ? "Approve" : "Enable"}</button><button type="button" onClick={() => void resetPassword(account)} className="ml-2 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700"><KeyRound className="h-4 w-4" />Reset Password</button><button type="button" onClick={() => void editAccount(account)} className="ml-2 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"><Pencil className="h-4 w-4" />Edit</button><button type="button" onClick={() => void deleteAccount(account)} className="ml-2 inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"><Trash2 className="h-4 w-4" />Delete</button></td></tr>)}{!filtered.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No {role} accounts found.</td></tr>}</tbody></table></div>}
  </div>;
}
