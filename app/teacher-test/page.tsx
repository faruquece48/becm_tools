"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BookOpenText,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Grid2X2,
  Megaphone,
  Menu,
  Settings,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import logoImage from "../images/image_03.png";
import dashboardReference from "../images/image_04..png";
import SiteVisitorPanel from "@/components/SiteVisitorPanel";

const mainNavigation = [
  { label: "Dashboard", icon: Grid2X2, active: true, href: "/" },
  { label: "Remuneration Bill", icon: FileText, href: "/bills/create" },
  { label: "OBE", icon: BookOpenText },
  { label: "File", icon: Megaphone, href: "/files" },
  { label: "Exam Notice", icon: Bell },
  { label: "General Notice", icon: ClipboardList },
  { label: "Paper Setters", icon: SlidersHorizontal },
  { label: "Academic Calendar", icon: CalendarDays },
];

const quickLinks = [
  {
    title: "My Bill",
    text: "Review and manage your generated bill.",
    action: "Open",
    href: "/bills/individual",
    icon: FileText,
    card: "border-violet-200 bg-violet-50/60",
    iconBox: "bg-gradient-to-br from-violet-500 to-indigo-700 shadow-violet-200",
    actionStyle: "border-violet-200 text-violet-600",
  },
  {
    title: "File",
    text: "Prepare your Official file.",
    action: "Open",
    href: "/files",
    icon: Megaphone,
    card: "border-emerald-200 bg-emerald-50/60",
    iconBox: "bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-emerald-200",
    actionStyle: "border-emerald-200 text-emerald-600",
  },
  {
    title: "Exam Notice",
    text: "See exam-related updates and alerts.",
    action: "Open",
    href: "#exam-notice",
    icon: Bell,
    card: "border-orange-200 bg-orange-50/60",
    iconBox: "bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-200",
    actionStyle: "border-orange-200 text-orange-600",
  },
  {
    title: "General Notice",
    text: "View general notices and information.",
    action: "View",
    href: "#general-notice",
    icon: Bell,
    card: "border-cyan-200 bg-cyan-50/60",
    iconBox: "bg-gradient-to-br from-cyan-400 to-cyan-700 shadow-cyan-200",
    actionStyle: "border-cyan-200 text-cyan-600",
  },
  {
    title: "Paper Setters",
    text: "Configure paper settings and options.",
    action: "Open",
    href: "#paper-setters",
    icon: Settings,
    card: "border-pink-200 bg-pink-50/60",
    iconBox: "bg-gradient-to-br from-pink-400 to-pink-700 shadow-pink-200",
    actionStyle: "border-pink-200 text-pink-600",
  },
  {
    title: "Academic Calendar",
    text: "Check academic schedule and events.",
    action: "View",
    href: "#academic-calendar",
    icon: CalendarDays,
    card: "border-indigo-200 bg-indigo-50/60",
    iconBox: "bg-gradient-to-br from-indigo-400 to-indigo-700 shadow-indigo-200",
    actionStyle: "border-indigo-200 text-indigo-600",
  },
];

export default function TeacherTestPage() {
  return (
    <main className="min-h-screen bg-[#f7f9fd] text-[#102555]">
      <div className="mx-auto flex min-h-screen max-w-[1800px] bg-white">
        <aside className="hidden min-h-screen w-[var(--app-sidebar-width)] shrink-0 self-start border-r border-[#12396d] bg-[#082452] text-white lg:flex lg:flex-col">
          <div className="flex min-h-[190px] flex-col items-center justify-center border-b border-white/10 px-7 py-5 text-center">
            <Image src={logoImage} alt="RUET logo" className="h-24 w-24 object-contain" />
            <p className="mt-2 font-serif text-2xl font-bold tracking-wide">RUET</p>
            <p className="mt-1 text-sm font-medium text-blue-100">Bill Generator System</p>
          </div>

          <nav className="space-y-0 px-4 py-2">
            {mainNavigation.map(({ label, icon: Icon, active, href }) => {
              const classes = `flex w-full items-center gap-4 rounded-xl px-5 py-4 text-left text-sm font-medium transition ${
                active
                  ? "bg-gradient-to-r from-violet-600 to-indigo-700 text-white shadow-lg shadow-indigo-200"
                  : href
                    ? "text-blue-100 hover:bg-white/10"
                    : "cursor-not-allowed text-blue-200/45"
              }`;
              const content = <><Icon className="h-5 w-5" /><span>{label}</span></>;

              return href ? (
                <Link key={label} href={href} className={classes}>{content}</Link>
              ) : (
                <span key={label} className={classes} aria-disabled="true" title="This page is not available yet">{content}</span>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/10 px-4 py-5">
            <SiteVisitorPanel />
            <p className="mt-4 whitespace-nowrap border-t border-white/15 pt-4 text-center text-xs text-blue-200">© 2026 BECM, All rights reserved.</p>
          </div>
        </aside>

        <section className="min-h-screen min-w-0 flex-1 overflow-auto bg-[#f7f9fd]">
          <header className="flex h-[92px] items-center justify-between border-b border-slate-200 bg-white px-6 sm:px-8">
            <button type="button" className="rounded-lg p-2 text-[#17315e] hover:bg-slate-50" aria-label="Open navigation">
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-5">
              <button type="button" className="relative rounded-full p-2 text-[#29446f]" aria-label="Notifications">
                <Bell className="h-6 w-6" />
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
              </button>
              <div className="h-10 border-l border-slate-200" />
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <UserRound className="h-6 w-6" />
              </div>
              <div className="hidden sm:block">
                <p className="font-semibold text-[#14274e]">Faruque Abdullah</p>
                <p className="text-sm text-slate-500">Teacher</p>
              </div>
              <ChevronDown className="h-5 w-5" />
            </div>
          </header>

          <div className="space-y-7 p-5 sm:p-8">
            <section className="relative min-h-[205px] overflow-hidden rounded-[24px] border border-violet-200 bg-gradient-to-r from-[#eeeaff] via-[#f4f5ff] to-[#e4e9ff] px-8 py-10 shadow-sm sm:px-12">
              <div className="absolute inset-y-0 right-0 hidden w-[48%] overflow-hidden sm:block">
                <Image
                  src={dashboardReference}
                  alt="RUET bill dashboard illustration"
                  fill
                  className="object-cover object-[90%_20%] opacity-50"
                />
              </div>
              <div className="absolute -bottom-28 left-[45%] h-64 w-64 rounded-full border border-white/70" />
              <div className="relative z-10 max-w-2xl">
                <h1 className="text-2xl font-extrabold text-[#0d2151] sm:text-3xl">Welcome back</h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-[#354b78]">Manage bills, examinations, notices and academic activities efficiently from your dashboard.</p>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-7 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#102555]">Quick access</h2>
                <span className="flex items-center gap-2 text-sm font-medium text-indigo-600"><UserRound className="h-4 w-4" /> Teacher view</span>
              </div>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {quickLinks.map(({ title, text, action, href, icon: Icon, card, iconBox, actionStyle }) => (
                  <Link
                    key={title}
                    href={href}
                    className={`${card} group relative min-h-[200px] overflow-hidden rounded-[20px] border p-5 transition hover:-translate-y-0.5 hover:shadow-md xl:col-span-1`}
                  >
                    <div className="flex items-start gap-5">
                      <span className={`${iconBox} flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg`}><Icon className="h-8 w-8" /></span>
                      <div>
                        <h3 className="text-lg font-bold text-[#102555]">{title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#506184]">{text}</p>
                      </div>
                    </div>
                    <span className={`${actionStyle} absolute bottom-5 left-5 inline-flex items-center gap-3 rounded-full border bg-white/70 px-5 py-2 text-sm font-medium`}>
                      {action} <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                    <Icon className="absolute -bottom-5 -right-4 h-28 w-28 opacity-[0.035]" />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
