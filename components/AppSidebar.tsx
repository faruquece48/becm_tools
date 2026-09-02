"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  BookOpenText,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  Download,
  FileChartColumn,
  FileText,
  Grid2X2,
  LibraryBig,
  LogOut,
  Megaphone,
  SlidersHorizontal,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import logoImage from "@/app/images/image_03.png";
import { resultNavigation } from "@/lib/resultNavigation";

type AppSidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

type NavigationItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  activeFor?: (pathname: string) => boolean;
};

const mainNavigation: NavigationItem[] = [
  { label: "Dashboard", icon: Grid2X2, href: "/teacher/dashboard" },
  {
    label: "Remuneration Bill",
    icon: FileText,
    href: "/bills/create",
    activeFor: (pathname) =>
      pathname.startsWith("/bills") && !pathname.startsWith("/bills/summary"),
  },
  { label: "OBE", icon: BookOpenText },
  { label: "Result", icon: FileChartColumn, href: "/teacher/result" },
  { label: "Student", icon: UsersRound },
  { label: "Syllabus", icon: LibraryBig, href: "/teacher/syllabus" },
  { label: "File", icon: Megaphone, href: "/files" },
  { label: "Exam Notice", icon: Bell },
  { label: "General Notice", icon: ClipboardList },
  { label: "Paper Setters", icon: SlidersHorizontal },
  { label: "Academic Calendar", icon: CalendarDays },
  { label: "Video Downloader", icon: Download, href: "/download" },
];

function SidebarLink({ item, onNavigate }: { item: NavigationItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = item.activeFor
    ? item.activeFor(pathname)
    : item.href === pathname || (item.href ? pathname.startsWith(`${item.href}/`) : false);
  const Icon = item.icon;
  const classes = `flex w-full items-center gap-4 rounded-xl px-5 py-2.5 text-left text-sm font-medium transition ${
    active
      ? "bg-gradient-to-r from-violet-600 to-indigo-700 text-white shadow-lg shadow-indigo-950/40"
      : item.href
        ? "text-blue-100 hover:bg-white/10"
        : "cursor-not-allowed text-blue-200/45"
  }`;

  if (!item.href) {
    return (
      <span className={classes} aria-disabled="true" title="This page is not available yet">
        <Icon className="h-5 w-5 shrink-0" />
        <span>{item.label}</span>
      </span>
    );
  }

  return (
    <Link href={item.href} className={classes} onClick={onNavigate} aria-current={active ? "page" : undefined} suppressHydrationWarning>
      <Icon className="h-5 w-5 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export default function AppSidebar({ mobileOpen = false, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const [resultMenuOpen, setResultMenuOpen] = useState(false);
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);
  const sidebar = (
    <aside className="flex h-screen w-[var(--app-sidebar-width)] shrink-0 flex-col border-r border-[#12396d] bg-[#082452] text-white">
      <div className="relative flex min-h-[184px] flex-col items-center justify-center border-b border-white/10 px-7 py-5 text-center">
        {onClose && (
          <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-lg p-2 text-blue-100 hover:bg-white/10 lg:hidden" aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        )}
        <Image src={logoImage} alt="RUET logo" className="h-24 w-24 object-contain" priority />
        <p className="mt-1 font-serif text-2xl font-bold tracking-wide">RUET</p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-3" aria-label="Main navigation">
        {mainNavigation.map((item) => item.label === "Result" ? (
          <div key={item.label}>
            <button
              type="button"
              onClick={() => setResultMenuOpen((open) => !open)}
              className={`flex w-full items-center gap-4 rounded-xl px-5 py-2.5 text-left text-sm font-medium transition ${pathname.startsWith("/teacher/result") ? "bg-gradient-to-r from-violet-600 to-indigo-700 text-white shadow-lg shadow-indigo-950/40" : "text-blue-100 hover:bg-white/10"}`}
              aria-label={resultMenuOpen ? "Minimize Result menu" : "Expand Result menu"}
              aria-expanded={resultMenuOpen}
            >
              <FileChartColumn className="h-5 w-5 shrink-0" />
              <span>Result</span>
              <ChevronLeft className={`ml-auto h-4 w-4 transition-transform ${resultMenuOpen ? "-rotate-90" : ""}`} />
            </button>
            <div className={`ml-5 border-l border-white/20 py-1 pl-3 ${resultMenuOpen ? "block" : "hidden"}`}>
              {resultNavigation.map((subItem) => {
                const active = pathname === subItem.href || pathname.startsWith(`${subItem.href}/`);
                return (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg px-3 py-2 text-sm transition ${active ? "bg-white text-[#102555] shadow-sm" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}
                    suppressHydrationWarning
                  >
                    {subItem.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : item.label === "Student" ? (
          <div key={item.label}>
            <button type="button" onClick={() => setStudentMenuOpen((open) => !open)} className={`flex w-full items-center gap-4 rounded-xl px-5 py-2.5 text-left text-sm font-medium transition ${pathname.startsWith("/teacher/students") ? "bg-gradient-to-r from-violet-600 to-indigo-700 text-white shadow-lg shadow-indigo-950/40" : "text-blue-100 hover:bg-white/10"}`} aria-label={studentMenuOpen ? "Minimize Student menu" : "Expand Student menu"} aria-expanded={studentMenuOpen}>
              <UsersRound className="h-5 w-5 shrink-0" /><span>Student</span><ChevronLeft className={`ml-auto h-4 w-4 transition-transform ${studentMenuOpen ? "-rotate-90" : ""}`} />
            </button>
            <div className={`ml-5 border-l border-white/20 py-1 pl-3 ${studentMenuOpen ? "block" : "hidden"}`}>
              {[{ label: "Student List", href: "/teacher/students" }, { label: "Special Student", href: "/teacher/students/special" }, { label: "Promote Students", href: "/teacher/students/promote" }, { label: "Eligibility List", href: "/teacher/students/eligible" }, { label: "Backlog Registration", href: "/teacher/students/backlog-registration" }].map((subItem) => { const active = pathname === subItem.href; return <Link key={subItem.href} href={subItem.href} onClick={onClose} aria-current={active ? "page" : undefined} className={`block rounded-lg px-3 py-2 text-sm transition ${active ? "bg-white text-[#102555] shadow-sm" : "text-blue-100 hover:bg-white/10 hover:text-white"}`} suppressHydrationWarning>{subItem.label}</Link>; })}
            </div>
          </div>
        ) : <SidebarLink key={item.label} item={item} onNavigate={onClose} />)}
      </nav>

      <div className="mt-auto border-t border-white/10 px-4 py-4">
        <Link href="/" className="flex w-full items-center gap-4 rounded-xl px-5 py-3 text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white" suppressHydrationWarning>
          <LogOut className="h-5 w-5" />
          Logout
        </Link>
        <p className="mt-3 border-t border-white/15 pt-3 text-center text-xs leading-snug text-white">
          Developed by Faruque Abdullah
          <br />
          Assistant Professor, Dept. of BECM, RUET
        </p>
      </div>
    </aside>
  );

  return (
    <>
      <div className="sticky top-0 hidden self-start lg:block">{sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-slate-950/55" onClick={onClose} aria-label="Close navigation" />
          <div className="relative h-full overflow-y-auto shadow-2xl">{sidebar}</div>
        </div>
      )}
    </>
  );
}
