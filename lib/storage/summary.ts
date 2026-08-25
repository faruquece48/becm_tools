import type { ImportedSummaryBill } from "../../app/bills/summary/summaryData";

const SUMMARY_STORAGE_KEY = "examBillSummary:current";

export interface SummarySession {
  bills: ImportedSummaryBill[];
  tableGap: number;
  remunerationListYear: string;
  indexTableWidth: number;
  sidebarWidth: number;
}

export function saveSummarySession(session: SummarySession): void {
  try {
    window.localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage can be unavailable or full; the in-memory session remains usable.
  }
}

export function loadSummarySession(): SummarySession | null {
  try {
    const saved = window.localStorage.getItem(SUMMARY_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<SummarySession>;
    if (!Array.isArray(parsed.bills)) return null;
    return {
      bills: parsed.bills as ImportedSummaryBill[],
      tableGap: typeof parsed.tableGap === "number" ? parsed.tableGap : 10,
      remunerationListYear: typeof parsed.remunerationListYear === "string"
        ? parsed.remunerationListYear
        : "2025-II",
      indexTableWidth: typeof parsed.indexTableWidth === "number"
        ? parsed.indexTableWidth
        : 75,
      sidebarWidth: typeof parsed.sidebarWidth === "number"
        ? parsed.sidebarWidth
        : 500,
    };
  } catch {
    return null;
  }
}

export function clearSummarySession(): void {
  try {
    window.localStorage.removeItem(SUMMARY_STORAGE_KEY);
  } catch {
    // Ignore unavailable storage while still clearing in-memory state.
  }
}
