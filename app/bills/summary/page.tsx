"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, FilePlus2, Trash2 } from "lucide-react";
import CombinedBillPdfPreview from "../combined/CombinedBillPdfPreview";
import type { ExaminationBillData } from "../create/components/types";
import type { StaffRemunerationData } from "@/lib/storage/staffRemuneration";
import { defaultTeacherRankData, normalizeTeacherRankData, type TeacherRankData } from "@/lib/storage/teacherRank";
import { loadCurrentWork } from "@/lib/storage/draft";
import { applySummaryBillLayout, buildSummaryCustomization, type SummaryCustomization, type TeacherCustomizations } from "@/lib/storage/teacherCustomizations";
import { withStaffRemunerationData } from "@/lib/staffRemunerationMatching";
import type { TableLayoutSettings } from "../create/components/types";
import ColumnWidthEditor from "../preview/components/ColumnWidthEditor";
import SectionPanel from "../preview/components/SectionPanel";
import SummaryPdfDocument from "./SummaryPdfDocument";
import { summaryCustomizationSections } from "./customizationSections";
import {
  clearSummarySession,
  loadSummarySession,
  saveSummarySession,
  type SummarySession,
} from "@/lib/storage/summary";
import {
  examinationSummaryTitle,
  normalizeImportedBill,
  teachersForBill,
  type ImportedSummaryBill,
} from "./summaryData";

const fileNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const words = (value: string) =>
  value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());

const columnLabel = (value: string) =>
  value === "sl" || value === "serial" ? "Sl. No." : words(value);

function ImportedBillCustomization({
  item,
  staffData,
  onBottomMinimize,
  onChange,
}: {
  item: ImportedSummaryBill;
  staffData: StaffRemunerationData | null;
  onBottomMinimize?: () => void;
  onChange: (bill: ExaminationBillData) => void;
}) {
  const customizationBill = withStaffRemunerationData(item.bill, staffData);
  const customizationSections = summaryCustomizationSections(customizationBill);
  const updateLayout = (key: keyof TableLayoutSettings, widths: TableLayoutSettings[keyof TableLayoutSettings]) =>
    onChange({
      ...item.bill,
      layoutSettings: { ...item.bill.layoutSettings, [key]: widths },
    });
  const moveSection = (key: string, targetKey: string | undefined) => {
    if (!targetKey || key === "committee" || targetKey === "committee") return;
    const sectionOrder = [...item.bill.sectionOrder];
    const index = sectionOrder.indexOf(key);
    const target = sectionOrder.indexOf(targetKey);
    if (index < 0 || target < 0) return;
    [sectionOrder[index], sectionOrder[target]] = [sectionOrder[target], sectionOrder[index]];
    onChange({ ...item.bill, sectionOrder });
  };

  return (
    <div className="mt-3">
      <SectionPanel title="Customize imported bill preview" showMinimizeControls onBottomMinimize={onBottomMinimize}>
        <label className="block space-y-1 text-xs text-slate-600">
          <span>Space before Chairman signature (pt)</span>
          <input
            type="number"
            min="0"
            max="200"
            value={item.bill.layoutSpacing.footerArea ?? 24}
            onChange={(event) => onChange({
              ...item.bill,
              layoutSpacing: {
                ...item.bill.layoutSpacing,
                footerArea: Math.max(0, Number(event.target.value) || 0),
              },
            })}
            className="w-full rounded-md border bg-white px-3 py-2 text-sm"
          />
        </label>
        <SectionPanel title="PDF table order">
          <div className="space-y-1">
            {customizationSections.filter((section) => !section.suffix || section.suffix === ".1").map((section, index, sections) => (
              <div key={section.orderKey} className="flex items-center gap-2 rounded border bg-white px-2 py-1.5 text-xs">
                <span className="min-w-0 flex-1 truncate">{section.title.replace(/\.1 /, ". ")}</span>
                <button type="button" onClick={() => moveSection(section.orderKey, sections[index - 1]?.orderKey)} disabled={index === 0 || sections[index - 1]?.orderKey === "committee"} className="rounded border p-1 disabled:opacity-30" aria-label={`Move ${section.title} up`}><ArrowUp className="h-3 w-3" /></button>
                <button type="button" onClick={() => moveSection(section.orderKey, sections[index + 1]?.orderKey)} disabled={section.orderKey === "committee" || index === sections.length - 1} className="rounded border p-1 disabled:opacity-30" aria-label={`Move ${section.title} down`}><ArrowDown className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </SectionPanel>
        {customizationSections.map((section) => (
          <SectionPanel
            key={section.layoutKey}
            title={section.title}
            pageBreakAfter={Boolean(item.bill.pageBreakAfter[section.breakKey])}
            onPageBreakAfterChange={(checked) => onChange({
              ...item.bill,
              pageBreakAfter: { ...item.bill.pageBreakAfter, [section.breakKey]: checked },
            })}
            tableSpacing={item.bill.tableSpacing[section.breakKey] ?? item.bill.layoutSpacing.sectionGap}
            onTableSpacingChange={(value) => onChange({
              ...item.bill,
              tableSpacing: { ...item.bill.tableSpacing, [section.breakKey]: value },
            })}
          >
            <ColumnWidthEditor
              widths={item.bill.layoutSettings[section.layoutKey]}
              setWidths={(widths) => updateLayout(section.layoutKey, widths)}
              labels={Object.fromEntries(
                Object.keys(item.bill.layoutSettings[section.layoutKey]).map((column) => [column, columnLabel(column)])
              )}
            />
          </SectionPanel>
        ))}
      </SectionPanel>
    </div>
  );
}

export default function SummaryPage() {
  const [bills, setBills] = useState<ImportedSummaryBill[]>([]);
  const [staffData, setStaffData] = useState<StaffRemunerationData | null>(null);
  const [rankData, setRankData] = useState<TeacherRankData>(defaultTeacherRankData);
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [tableGap, setTableGap] = useState(10);
  const [remunerationListYear, setRemunerationListYear] = useState("2025-II");
  const [indexTableWidth, setIndexTableWidth] = useState(75);
  const [sidebarWidth, setSidebarWidth] = useState(500);
  const [deletedPageIndexes, setDeletedPageIndexes] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const billCardRefs = useRef(new Map<string, HTMLDivElement>());
  const neonCustomizationReady = useRef(false);
  const summaryCustomizationRef = useRef<SummaryCustomization | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const applySession = (saved: SummarySession) => {
        const currentWork = loadCurrentWork();
        setBills(saved.bills.map((item) => {
          const bill = normalizeImportedBill(item.bill);
          const sameCurrentBill = currentWork &&
            bill.billInfo.billNo === currentWork.billInfo.billNo &&
            bill.billInfo.examination === currentWork.billInfo.examination &&
            bill.billInfo.year === currentWork.billInfo.year &&
            bill.billInfo.semester === currentWork.billInfo.semester &&
            bill.billInfo.examType === currentWork.billInfo.examType &&
            bill.billInfo.examYear === currentWork.billInfo.examYear &&
            bill.billInfo.series === currentWork.billInfo.series;
          return {
            ...item,
            bill: sameCurrentBill && currentWork.practicalSurveyingCourseFileTeacher?.name.trim()
              ? {
                  ...bill,
                  practicalSurveyingCourseFileTeacher: currentWork.practicalSurveyingCourseFileTeacher,
                }
              : bill,
          };
        }));
        setTableGap(saved.tableGap);
        setRemunerationListYear(saved.remunerationListYear);
        setIndexTableWidth(saved.indexTableWidth);
        setSidebarWidth(saved.sidebarWidth);
        setDeletedPageIndexes(Array.isArray(saved.deletedPageIndexes) ? saved.deletedPageIndexes : []);
    };
    const restore = async () => {
      const localSession = loadSummarySession();
      if (localSession) applySession(localSession);
      try {
        const response = await fetch("/api/summary-workspace", { cache: "no-store", signal: controller.signal });
        const body = await response.json() as { workspace?: SummarySession | null };
        if (response.ok && body.workspace) {
          applySession(body.workspace);
          setMessage("Saved Summary workspace restored from Neon.");
        }
      } catch {
        // Local storage remains the fallback when the database is unavailable.
      } finally {
        if (!controller.signal.aborted) setHydrated(true);
      }
    };
    void restore();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/staff/remuneration", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { data?: StaffRemunerationData };
        if (response.ok && body.data) setStaffData(body.data);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let controller: AbortController | null = null;
    const loadRanks = () => {
      controller?.abort();
      controller = new AbortController();
      void fetch(`/api/teacher-rank?refresh=${Date.now()}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          const body = await response.json() as { data?: TeacherRankData };
          if (response.ok && body.data) setRankData(normalizeTeacherRankData(body.data));
        })
        .catch((error) => {
          if (!controller?.signal.aborted) {
            setMessage(error instanceof Error ? `Unable to refresh teacher ranks: ${error.message}` : "Unable to refresh teacher ranks.");
          }
        });
    };
    loadRanks();
    window.addEventListener("focus", loadRanks);
    return () => {
      controller?.abort();
      window.removeEventListener("focus", loadRanks);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/teacher-customizations", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body = await response.json() as { customization?: TeacherCustomizations };
        const saved = body.customization?.summary;
        if (saved) {
          summaryCustomizationRef.current = saved;
          setTableGap(saved.tableGap);
          setRemunerationListYear(saved.remunerationListYear);
          setIndexTableWidth(saved.indexTableWidth);
          setSidebarWidth(saved.sidebarWidth);
          setBills((current) => current.map((item) => ({ ...item, bill: applySummaryBillLayout(item.bill, saved) })));
        }
        neonCustomizationReady.current = true;
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSummarySession({ bills, tableGap, remunerationListYear, indexTableWidth, sidebarWidth, deletedPageIndexes });
  }, [bills, deletedPageIndexes, hydrated, indexTableWidth, remunerationListYear, sidebarWidth, tableGap]);

  useEffect(() => {
    if (!hydrated || !neonCustomizationReady.current) return;
    const summary = buildSummaryCustomization(bills, { tableGap, remunerationListYear, indexTableWidth, sidebarWidth }, summaryCustomizationRef.current);
    summaryCustomizationRef.current = summary;
    const timer = window.setTimeout(() => {
      void fetch("/api/teacher-customizations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary }) });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [bills, hydrated, indexTableWidth, remunerationListYear, sidebarWidth, tableGap]);

  const billsWithStaff = useMemo(() => bills.map((item) => ({ ...item, bill: withStaffRemunerationData(item.bill, staffData) })), [bills, staffData]);
  const downloadFileBase = `Remuneration Bill_${(remunerationListYear.trim() || "Unspecified").replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")}`;
  const document = useMemo(
    () => <SummaryPdfDocument bills={billsWithStaff} tableGap={tableGap} remunerationListYear={remunerationListYear} indexTableWidth={indexTableWidth} rankData={rankData} />,
    [billsWithStaff, tableGap, remunerationListYear, indexTableWidth, rankData]
  );

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const imported: ImportedSummaryBill[] = [];
    const rejected: string[] = [];

    await Promise.all(Array.from(files).map(async (file, index) => {
      try {
        const parsed = JSON.parse(await file.text()) as Partial<ExaminationBillData>;
        if (!parsed.billInfo || typeof parsed.billInfo !== "object") {
          throw new Error("Missing bill information");
        }
        imported[index] = {
          id: `${Date.now()}-${index}-${file.name}`,
          fileName: file.name,
          bill: applySummaryBillLayout(
            { ...normalizeImportedBill(parsed), pageBreakAfter: {} },
            summaryCustomizationRef.current,
          ),
        };
      } catch {
        rejected.push(file.name);
      }
    }));

    const valid = imported.filter(Boolean);
    if (valid.length) {
      setBills((current) =>
        [...current, ...valid].sort((left, right) =>
          fileNameCollator.compare(left.fileName, right.fileName)
        )
      );
    }
    setMessage(
      rejected.length
        ? `${valid.length} file(s) added. Could not read: ${rejected.join(", ")}`
        : `${valid.length} bill file(s) added.`
    );
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeBill = (id: string) => {
    setBills((current) => current.filter((item) => item.id !== id));
  };

  const clearFiles = () => {
    if (!bills.length || !window.confirm("Clear all loaded bill files from this page?")) return;
    setBills([]);
    setDeletedPageIndexes([]);
    clearSummarySession();
    setMessage("Loaded files cleared from this browser view. Refresh to restore the last workspace saved to Neon.");
  };

  const updateBill = (id: string, bill: ExaminationBillData) => {
    setBills((current) => current.map((item) => item.id === id ? { ...item, bill } : item));
  };

  const moveBill = (index: number, direction: -1 | 1) => {
    setBills((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const download = async () => {
    if (!bills.length) return;
    setDownloading(true);
    try {
      const workspace: SummarySession = { bills, tableGap, remunerationListYear, indexTableWidth, sidebarWidth, deletedPageIndexes };
      const saveResponse = await fetch("/api/summary-workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workspace),
      });
      const saveBody = await saveResponse.json().catch(() => null) as { error?: string } | null;
      if (!saveResponse.ok) throw new Error(saveBody?.error || "Could not save the Summary workspace to Neon");
      const blob = previewPdfBlob ?? await pdf(document).toBlob();
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${downloadFileBase}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("PDF downloaded and the complete Summary workspace was saved to Neon.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the Summary workspace.");
    } finally {
      setDownloading(false);
    }
  };

  const downloadWord = async () => {
    if (!bills.length) return;
    setIsGeneratingWord(true);
    try {
      const { generateEditableSummaryWordDocument } = await import("./generateEditableSummaryWordDocument");
      const wordBlob = await generateEditableSummaryWordDocument(
        billsWithStaff,
        remunerationListYear,
        indexTableWidth,
        rankData,
      );
      const url = URL.createObjectURL(wordBlob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${downloadFileBase}.docx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to generate Word file: " + (error as Error).message);
    } finally {
      setIsGeneratingWord(false);
    }
  };

  return <main className="mx-auto max-w-[1600px] p-6">
    <input
      ref={inputRef}
      type="file"
      accept="application/json,.json"
      multiple
      className="hidden"
      onChange={(event) => void importFiles(event.target.files)}
    />

    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">Summary</h1>
        <p className="text-sm text-slate-500">
          Import exported bill files to create one teacher list per bill and a consolidated final summary.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/bills/individual-summary"
          aria-disabled={!bills.length}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white ${
            bills.length ? "bg-emerald-700 hover:bg-emerald-800" : "pointer-events-none bg-slate-400"
          }`}
        >
          Generate Individual Bills
          <ArrowRight className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => void downloadWord()}
          disabled={!bills.length || isGeneratingWord}
          className="hidden rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
        >
          {isGeneratingWord ? "Generating Word…" : "Download Summary Word"}
        </button>
        <button
          type="button"
          onClick={() => void download()}
          disabled={!bills.length || downloading || !previewPdfBlob}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
        >
          {downloading ? "Generating…" : "Download Summary PDF"}
        </button>
      </div>
    </div>

    <div
      className="grid items-start gap-5 lg:grid-cols-[var(--summary-sidebar-width)_minmax(0,1fr)]"
      style={{ "--summary-sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
    >
      <aside className="rounded-xl border bg-white p-4 shadow-sm lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <div className="mb-3">
          <h2 className="font-semibold">Imported bill files</h2>
          <p className="text-xs text-slate-500">{bills.length} file(s) selected</p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white"
        >
          <FilePlus2 className="h-4 w-4" />
          Add bill files
        </button>
        <button
          type="button"
          onClick={clearFiles}
          disabled={!bills.length}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
          Clear loaded files
        </button>
        <label className="mt-4 block border-t pt-4 text-sm font-medium">
          <span>Left panel width ({sidebarWidth}px)</span>
          <input
            type="range"
            min="260"
            max="520"
            step="10"
            value={sidebarWidth}
            onChange={(event) => setSidebarWidth(Number(event.target.value))}
            className="mt-2 w-full accent-blue-600"
            aria-label="Left panel width"
          />
        </label>

        <div className="space-y-2 pr-1">
          {bills.map((item, index) => <div
            key={item.id}
            ref={(element) => {
              if (element) billCardRefs.current.set(item.id, element);
              else billCardRefs.current.delete(item.id);
            }}
            className="scroll-mt-4 rounded-lg border bg-slate-50 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {index + 1}. Bill No. {item.bill.billInfo.billNo || "—"}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{item.fileName}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {teachersForBill(item.bill).length} engaged teacher(s)
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeBill(item.id)}
                className="rounded p-1.5 text-red-600 hover:bg-red-50"
                aria-label={`Remove ${item.fileName}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-500">
              {examinationSummaryTitle(item.bill)}
            </p>
            <div className="mt-2 flex gap-1">
              <button
                type="button"
                onClick={() => moveBill(index, -1)}
                disabled={index === 0}
                className="rounded border bg-white p-1.5 disabled:opacity-35"
                aria-label="Move bill up"
              ><ArrowUp className="h-3.5 w-3.5" /></button>
              <button
                type="button"
                onClick={() => moveBill(index, 1)}
                disabled={index === bills.length - 1}
                className="rounded border bg-white p-1.5 disabled:opacity-35"
                aria-label="Move bill down"
              ><ArrowDown className="h-3.5 w-3.5" /></button>
            </div>
            <ImportedBillCustomization
              item={item}
              staffData={staffData}
              onBottomMinimize={() => {
                const nextBill = bills[index + 1];
                if (!nextBill) return;
                window.setTimeout(() => {
                  billCardRefs.current.get(nextBill.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 0);
              }}
              onChange={(bill) => updateBill(item.id, bill)}
            />
          </div>)}
        </div>

        <label className="mt-4 block border-t pt-4 text-sm font-medium">
          <span>Remuneration list year</span>
          <input
            type="text"
            placeholder="e.g. 2025-II"
            value={remunerationListYear}
            onChange={(event) => setRemunerationListYear(event.target.value)}
            className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          <span>First-page table width (%)</span>
          <input
            type="number"
            min="40"
            max="100"
            step="1"
            value={indexTableWidth}
            onChange={(event) =>
              setIndexTableWidth(Math.min(100, Math.max(40, Number(event.target.value) || 40)))
            }
            className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          <span>Gap before table (pt)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={tableGap}
            onChange={(event) =>
              setTableGap(Math.min(100, Math.max(0, Number(event.target.value) || 0)))
            }
            className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
      </aside>

      <section className="min-w-0 rounded-xl bg-slate-300 p-5">
        {bills.length
          ? <CombinedBillPdfPreview
              document={document}
              deletable
              deletedPageIndexes={deletedPageIndexes}
              onDeletedPagesChange={setDeletedPageIndexes}
              onPdfChange={setPreviewPdfBlob}
            />
          : <div className="rounded-xl bg-white p-12 text-center text-slate-500">
              Add one or more exported bill JSON files to generate the summary preview.
            </div>}
      </section>
    </div>
  </main>;
}
