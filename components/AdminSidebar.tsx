"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenText, BriefcaseBusiness, ClipboardCheck, GraduationCap, Grid2X2, LogOut, ShieldAlert, ShieldCheck, Trash2, UsersRound } from "lucide-react";

const links = [
  { href: "/admin", label: "Overview", icon: Grid2X2 },
  { href: "/admin/students", label: "Student Accounts", icon: UsersRound },
  { href: "/admin/teachers", label: "Teacher Accounts", icon: GraduationCap },
  { href: "/admin/staff", label: "Staff Accounts", icon: BriefcaseBusiness },
  { href: "/admin/rental-library", label: "Rental Library", icon: BookOpenText },
  { href: "/admin/results", label: "Result Approval", icon: ClipboardCheck },
  { href: "/admin/expelled-students", label: "Expelled Students", icon: ShieldAlert },
  { href: "/admin/permanent-delete", label: "Permanent Delete", icon: Trash2 },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const router = useRouter();
  async function logout() { await fetch("/api/admin/session", { method: "DELETE" }); router.push("/admin"); router.refresh(); }
  return <aside className="flex min-h-screen w-72 shrink-0 flex-col bg-[#082452] text-white"><div className="flex h-24 items-center gap-3 border-b border-white/10 px-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500"><ShieldCheck className="h-6 w-6" /></span><div><h1 className="font-extrabold">BECM Admin</h1><p className="text-sm text-blue-200">Control panel</p></div></div><nav className="space-y-2 p-4" aria-label="Admin navigation">{links.map(({ href, label, icon: Icon }) => { const active = hydrated && (href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)); return <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg" : "text-blue-100 hover:bg-white/10"}`}><Icon className="h-5 w-5" />{label}</Link>; })}</nav><button type="button" onClick={logout} className="mt-auto m-4 flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-blue-100 hover:bg-white/10"><LogOut className="h-5 w-5" /> Log out</button></aside>;
}
