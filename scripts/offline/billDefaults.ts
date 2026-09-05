import type { ExaminationBillData } from "../../app/bills/create/components/types";

type OfflineBill = ExaminationBillData & {
  offlinePageBreakDefaultsVersion?: number;
  offlineFooterDefaultsVersion?: number;
};

// Migrate older autosaves, drafts, and imports once. Subsequent manual choices
// are retained when switching pages, reopening the file, or exporting a bill.
export function applyOfflineBillDefaults(bill: OfflineBill): OfflineBill {
  let updated = bill;
  if (updated.offlinePageBreakDefaultsVersion !== 1) {
    updated = { ...updated, pageBreakAfter: {}, offlinePageBreakDefaultsVersion: 1 };
  }
  if (updated.offlineFooterDefaultsVersion !== 1) {
    updated = {
      ...updated,
      layoutSpacing: { ...updated.layoutSpacing, footerArea: 20 },
      offlineFooterDefaultsVersion: 1,
    };
  }
  return updated;
}
