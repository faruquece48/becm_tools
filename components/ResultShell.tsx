"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";

export default function ResultShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1800px] bg-white text-[#102555]">
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="min-w-0 flex-1 bg-white">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="m-4 rounded-lg p-2 text-[#17315e] transition hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-6 w-6" />
        </button>
        {children}
      </main>
    </div>
  );
}