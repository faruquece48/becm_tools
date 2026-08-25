"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpenText,
  CalendarDays,
  ClipboardList,
  FileText,
  Grid2X2,
  Megaphone,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import logoImage from "@/app/images/image_03.png";
import SiteVisitorPanel from "@/components/SiteVisitorPanel";

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
  { label: "Dashboard", icon: Grid2X2, href: "/" },
  {
    label: "Remuneration Bill",
    icon: FileText,
    href: "/bills/create",
    activeFor: (pathname) =>
      pathname.startsWith("/bills") && !pathname.startsWith("/bills/summary"),
  },
  { label: "OBE", icon: BookOpenText },
  { label: "File", icon: Megaphone, href: "/files" },
  { label: "Exam Notice", icon: Bell },
  { label: "General Notice", icon: ClipboardList },
  { label: "Paper Setters", icon: SlidersHorizontal },
  { label: "Academic Calendar", icon: CalendarDays },
];

function SidebarLink({ item, onNavigate }: { item: NavigationItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = item.activeFor
    ? item.activeFor(pathname)
    : item.href === pathname || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
  const Icon = item.icon;
  const classes = `flex w-full items-center gap-4 rounded-xl px-5 py-3.5 text-left text-sm font-medium transition ${
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
    <Link href={item.href} className={classes} onClick={onNavigate} aria-current={active ? "page" : undefined}>
      <Icon className="h-5 w-5 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export default function AppSidebar({ mobileOpen = false, onClose }: AppSidebarProps) {
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
        <p className="mt-1 text-sm font-medium text-blue-100">Bill Generator System</p>
      </div>

      <nav className="space-y-0 px-4 py-3" aria-label="Main navigation">
        {mainNavigation.map((item) => <SidebarLink key={item.label} item={item} onNavigate={onClose} />)}
      </nav>

      <div className="mt-auto border-t border-white/10 px-4 py-5">
        <SiteVisitorPanel />
        <p className="mt-4 whitespace-nowrap border-t border-white/15 pt-4 text-center text-xs text-blue-200">© 2026 BECM, All rights reserved.</p>
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
