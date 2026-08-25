"use client";

import { useEffect, useState } from "react";
import { Eye, Globe2, Sun } from "lucide-react";

const emptyCounts = { live: 0, today: 0, total: 0, available: true };
const sessionKey = "ruet-visitor-session";
const visitKey = "ruet-visitor-visit";

type VisitorWindow = Window & {
  __ruetVisitorIds?: { sessionId: string; visitId: string };
};

type VisitorCounts = {
  live: number;
  today: number;
  total: number;
  available: boolean;
};

export default function SiteVisitorPanel({ variant = "sidebar" }: { variant?: "sidebar" | "compact" }) {
  const [counts, setCounts] = useState<VisitorCounts>(emptyCounts);

  useEffect(() => {
    const visitorWindow = window as VisitorWindow;
    let ids = visitorWindow.__ruetVisitorIds;
    if (!ids) {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const isRefresh = navigation?.type === "reload";
      const savedSessionId = sessionStorage.getItem(sessionKey);
      const savedVisitId = sessionStorage.getItem(visitKey);
      ids = {
        sessionId: isRefresh && savedSessionId ? savedSessionId : crypto.randomUUID(),
        visitId: isRefresh && savedVisitId ? savedVisitId : crypto.randomUUID(),
      };
      visitorWindow.__ruetVisitorIds = ids;
      const { sessionId, visitId } = ids;
      sessionStorage.setItem(sessionKey, sessionId);
      sessionStorage.setItem(visitKey, visitId);
    }
    const { sessionId, visitId } = ids;
    const update = async (action: "visit" | "heartbeat" = "heartbeat", visitId?: string) => {
      try {
        const response = await fetch("/api/visitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, visitId, action }), cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setCounts({
            live: data.live ?? 0,
            today: data.today ?? 0,
            total: data.total ?? 0,
            available: data.available ?? true,
          });
        }
      } catch { /* Keep the last successful counts while temporarily offline. */ }
    };
    void update("visit", visitId);
    const leave = () => navigator.sendBeacon("/api/visitors", new Blob([JSON.stringify({ sessionId, action: "leave" })], { type: "application/json" }));
    window.addEventListener("pagehide", leave);
    const timer = window.setInterval(update, 15_000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", leave);
    };
  }, []);

  if (variant === "compact") {
    const value = (count: number) => counts.available ? count.toLocaleString() : "—";
    return <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2.5 rounded-tl-xl border border-white bg-white/90 px-3 py-1 text-sm text-slate-600 shadow-[0_6px_18px_rgba(15,64,93,0.15)] backdrop-blur-md" aria-label="Site visitor counts">
      <span className="flex shrink-0 items-center gap-2 font-bold uppercase tracking-wide text-[#102555]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-[#07878d]"><Eye className="h-4 w-4" /></span> Site Visitors</span>
      <span className="hidden h-4 w-px bg-slate-200 sm:block" />
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.7)]" /><span>Live</span><strong className="text-[15px] text-emerald-700">{value(counts.live)}</strong></span>
      <span className="h-5 w-px bg-slate-200" />
      <span className="flex items-center gap-1.5"><Sun className="h-4 w-4 text-amber-500" /><span>Today</span><strong className="text-[15px] text-amber-700">{value(counts.today)}</strong></span>
      <span className="h-5 w-px bg-slate-200" />
      <span className="flex items-center gap-1.5"><Globe2 className="h-4 w-4 text-blue-500" /><span>Total</span><strong className="text-[15px] text-blue-700">{value(counts.total)}</strong></span>
    </div>;
  }

  return <div className="overflow-hidden rounded-2xl border border-cyan-300/25 bg-transparent p-3">
    <div className="flex items-center justify-between gap-2 text-white">
      <h2 className="flex items-center gap-2 text-xs font-bold tracking-wide"><Eye className="h-4 w-4 text-lime-300" />SITE VISITORS</h2>
      {!counts.available && <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-200">Unavailable</span>}
    </div>
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between rounded-full border border-cyan-100/90 bg-slate-950/35 px-4 py-2 text-sm"><span className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Live Now</span><strong className="text-emerald-300">{counts.available ? counts.live.toLocaleString() : "—"}</strong></div>
      <div className="flex items-center justify-between rounded-full border border-cyan-100/90 bg-slate-950/35 px-4 py-2 text-sm"><span className="flex items-center gap-3"><Sun className="h-3.5 w-3.5 text-yellow-300" />Today</span><strong className="text-yellow-300">{counts.available ? counts.today.toLocaleString() : "—"}</strong></div>
      <div className="flex items-center justify-between rounded-full border border-cyan-100/90 bg-slate-950/35 px-4 py-2 text-sm"><span className="flex items-center gap-3"><Globe2 className="h-3.5 w-3.5 text-cyan-200" />Total</span><strong className="text-cyan-200">{counts.available ? counts.total.toLocaleString() : "—"}</strong></div>
    </div>
    {!counts.available && <p className="mt-3 text-xs text-slate-300">Visitor statistics are temporarily unavailable because the database is not connected.</p>}
  </div>;
}
