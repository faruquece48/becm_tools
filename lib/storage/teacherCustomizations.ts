import type { ExaminationBillData } from "@/app/bills/create/components/types";

export type BillLayoutCustomization = Pick<ExaminationBillData, "layoutSettings" | "layoutSpacing" | "pageBreakAfter" | "tableSpacing" | "sectionOrder">;
export type SummaryCustomization = {
  tableGap: number;
  remunerationListYear: string;
  indexTableWidth: number;
  sidebarWidth: number;
  billLayouts: Array<{ key: string; layout: BillLayoutCustomization }>;
};
export type TeacherCustomizations = { preview: BillLayoutCustomization | null; summary: SummaryCustomization | null };

export const extractBillLayout = (bill: ExaminationBillData): BillLayoutCustomization => ({
  layoutSettings: bill.layoutSettings,
  layoutSpacing: bill.layoutSpacing,
  pageBreakAfter: bill.pageBreakAfter,
  tableSpacing: bill.tableSpacing,
  sectionOrder: bill.sectionOrder,
});

export const applyBillLayout = (bill: ExaminationBillData, layout?: BillLayoutCustomization | null): ExaminationBillData => layout ? ({
  ...bill,
  layoutSettings: { ...bill.layoutSettings, ...layout.layoutSettings },
  layoutSpacing: { ...bill.layoutSpacing, ...layout.layoutSpacing },
  pageBreakAfter: layout.pageBreakAfter ?? bill.pageBreakAfter,
  tableSpacing: layout.tableSpacing ?? bill.tableSpacing,
  sectionOrder: layout.sectionOrder ?? bill.sectionOrder,
}) : bill;

export const summaryBillKey = (bill: ExaminationBillData) => [bill.billInfo.examination, bill.billInfo.year, bill.billInfo.examType, bill.billInfo.semester].join("|").toLocaleLowerCase();

export function buildSummaryCustomization(bills: Array<{ bill: ExaminationBillData }>, globals: Omit<SummaryCustomization, "billLayouts">, previous?: SummaryCustomization | null): SummaryCustomization {
  const layouts = new Map<string, BillLayoutCustomization>(previous?.billLayouts.map((entry) => [entry.key, entry.layout]) ?? []);
  bills.forEach(({ bill }) => layouts.set(summaryBillKey(bill), extractBillLayout(bill)));
  return { ...globals, billLayouts: Array.from(layouts, ([key, layout]) => ({ key, layout })) };
}

export function applySummaryBillLayout(bill: ExaminationBillData, customization?: SummaryCustomization | null) {
  return applyBillLayout(bill, customization?.billLayouts.find((entry) => entry.key === summaryBillKey(bill))?.layout);
}