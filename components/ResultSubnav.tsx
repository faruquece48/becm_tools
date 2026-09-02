"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { resultNavigation } from "@/lib/resultNavigation";

export default function ResultSubnav() {
  const pathname = usePathname();
  return (
    <nav className="border-b bg-white px-4 py-3" aria-label="Result navigation">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {resultNavigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded px-4 py-2 text-sm font-bold transition ${active ? "bg-[#082f57] text-white" : "bg-slate-100 text-[#102555] hover:bg-slate-200"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}