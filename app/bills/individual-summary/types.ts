import type { ColumnWidths, ExaminationBillData } from "../create/components/types";
import type { IndividualBillLayoutSettings } from "../individual/IndividualLayoutEditor";

export interface IndividualSummaryPage {
  id: string;
  fileName: string;
  bill: ExaminationBillData;
  teacher: string;
  department: string;
  nameBangla: string;
  designationBangla: string;
  addressBangla: string;
  accountNumber: string;
  metaWidths: ColumnWidths;
  tableWidths: ColumnWidths;
  layoutSettings: IndividualBillLayoutSettings;
}
