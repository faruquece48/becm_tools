"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, Bell, BookOpenText, CalendarDays, FileText, Grid2X2, LogOut, Menu, ReceiptText, Settings, Users, X, type LucideIcon } from "lucide-react";
import logoImage from "@/app/images/image_03.png";

type DashboardItem = { title: string; description: string; icon: LucideIcon };
type Props = { role: "Student" | "Staff"; subtitle: string; welcome: string; items: DashboardItem[]; accent: string; children?: ReactNode };

export default function RoleDashboard({ role, subtitle, welcome, items, accent, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const navigation = role === "Student"
    ? [
        { label: "Dashboard", icon: Grid2X2, href: "/student/dashboard" },
        { label: "Academic Notices", icon: Bell },
        { label: "Class & Exam Schedule", icon: CalendarDays },
        { label: "Learning Resources", icon: BookOpenText },
        { label: "Rental Library", icon: BookOpenText, href: "/student/rental-library" },
        { label: "Bill Payment", icon: ReceiptText, href: "/student/bill-payment" },
        { label: "My Profile", icon: Users },
      ]
    : [
        { label: "Dashboard", icon: Grid2X2, href: "/staff/dashboard" },
        { label: "Office Notices", icon: Bell },
        { label: "Document Records", icon: FileText },
        { label: "Rental Inventory", icon: BookOpenText, href: "/staff/rental-library" },
        { label: "Department Calendar", icon: CalendarDays },
        { label: "Settings", icon: Settings },
      ];

  const sidebar = <aside className="flex h-screen w-[var(--app-sidebar-width)] shrink-0 flex-col border-r border-[#12396d] bg-[#082452] text-white">
    <div className="relative flex min-h-[184px] flex-col items-center justify-center border-b border-white/10 px-7 py-5 text-center">
      <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 rounded-lg p-2 text-blue-100 hover:bg-white/10 lg:hidden" aria-label="Close navigation"><X className="h-5 w-5" /></button>
      <Image src={logoImage} alt="RUET logo" className="h-24 w-24 object-contain" priority />
      <p className="mt-1 font-serif text-2xl font-bold tracking-wide">RUET</p>
      <p className="mt-1 text-sm font-medium text-blue-100">{subtitle}</p>
    </div>
    <nav className="space-y-1 px-4 py-4" aria-label={`${role} navigation`}>
      {navigation.map(({ label, icon: Icon, href }) => {
        const active = href === pathname;
        const className = `flex w-full items-center gap-4 rounded-xl px-5 py-3 text-sm font-medium ${active ? `bg-gradient-to-r ${accent} text-white shadow-lg shadow-blue-950/40` : href ? "text-blue-100 transition hover:bg-white/10" : "cursor-not-allowed text-blue-200/50"}`;
        const content = <><Icon className="h-5 w-5" /><span>{label}</span></>;
        return href ? <Link key={label} href={href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} className={className}>{content}</Link> : <span key={label} aria-disabled title="This page is coming soon" className={className}>{content}</span>;
      })}
    </nav>
    <div className="mt-auto border-t border-white/10 p-4">
      <Link href="/" className="flex items-center gap-4 rounded-xl px-5 py-3 text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white"><LogOut className="h-5 w-5" /> Logout</Link>
      <p className="mt-4 border-t border-white/10 pt-4 text-center text-xs leading-5 text-white">
        Developed by Faruque Abdullah
        <br />
        Assistant Professor, Dept. of BECM, RUET
      </p>
    </div>
  </aside>;

  return <main className="min-h-screen bg-[#f4f7fb] text-[#102555]">
    <div className="mx-auto flex min-h-screen max-w-[1800px] bg-white">
      <div className="sticky top-0 hidden self-start lg:block">{sidebar}</div>
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" className="absolute inset-0 bg-slate-950/55" onClick={() => setMobileOpen(false)} aria-label="Close navigation" /><div className="relative h-full w-fit shadow-2xl">{sidebar}</div></div>}

      <section className="min-h-screen min-w-0 flex-1 bg-[#f4f7fb]">
      <header className="border-b border-slate-200 bg-white"><div className="flex h-[92px] items-center justify-between px-5 sm:px-8"><button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-[#17315e] hover:bg-slate-50 lg:invisible" aria-label="Open navigation"><Menu className="h-6 w-6" /></button><div className="text-right"><p className="font-semibold text-[#14274e]">{role} Account</p><p className="text-sm text-slate-500">{subtitle}</p></div></div></header>
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      {children ?? <>
      <section className={`relative overflow-hidden rounded-[28px] bg-gradient-to-r ${accent} px-7 py-10 text-white shadow-xl sm:px-10`}><div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[40px] border-white/10" /><p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">{role} dashboard</p><h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{welcome}</h1><p className="mt-3 max-w-xl text-white/75">Your dedicated workspace is ready. New services will appear here as they become available.</p></section>
      <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Quick access</h2><span className="text-sm font-medium text-slate-500">{role} services</span></div><div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(({ title, description, icon: Icon }) => <div key={title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white`}><Icon className="h-6 w-6" /></span><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{description}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600">Coming soon <ArrowRight className="h-4 w-4" /></span></div>)}</div></section>
      </>}
    </div>
    </section>
    </div>
  </main>;
}

export const studentItems: DashboardItem[] = [
  { title: "Academic Notices", description: "View departmental announcements and academic updates.", icon: Bell },
  { title: "Class & Exam Schedule", description: "Check upcoming classes, examinations and important dates.", icon: CalendarDays },
  { title: "Learning Resources", description: "Access course materials and departmental resources.", icon: BookOpenText },
];
export const staffItems: DashboardItem[] = [
  { title: "Office Notices", description: "Review internal circulars and administrative announcements.", icon: Bell },
  { title: "Document Records", description: "Access and organize departmental office documents.", icon: FileText },
  { title: "Department Calendar", description: "Track meetings, deadlines and departmental events.", icon: CalendarDays },
];
