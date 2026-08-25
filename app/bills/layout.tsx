"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AppSidebar from "@/components/AppSidebar";

const tabs = [
  { href: "/bills/create", label: "Bill" },
  { href: "/bills/preview", label: "Preview" },
  { href: "/bills/individual", label: "Individual Teacher Bill" },
  { href: "/bills/individual-summary", label: "Individual Summary Bill" },
  { href: "/bills/combined", label: "Combined Teacher Bill" },
  { href: "/bills/summary", label: "Summary" },
  { href: "/bills/teachers", label: "Teacher Information" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Deliberately switch client-only navigation state after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Before mount, always render the inactive state so the server-rendered
  // HTML matches the very first client render exactly (no hydration mismatch).
  // After mount, update to reflect the real active tab.
  const active = mounted && (pathname === href || pathname?.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-black text-white"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </Link>
  );
}

export default function BillsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1800px] bg-slate-50">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <nav className="sticky top-0 z-40 border-b bg-white shadow-sm">
          <div className="flex w-full flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2">
              {tabs.map((tab) => (
                <NavLink key={tab.href} href={tab.href} label={tab.label} />
              ))}
            </div>
          </div>
        </nav>
        <main className="bill-route-content [&>main]:!mx-0">{children}</main>
      </div>
    </div>
  );
}
