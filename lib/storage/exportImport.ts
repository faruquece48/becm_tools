import type { ExaminationBillData } from "@/app/bills/create/components/types";

export function exportBillData(data: ExaminationBillData, fileName?: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  const billNumber = data.billInfo.billNo.trim() || "Unnumbered";
  const safeBillNumber = billNumber.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-");
  a.download = fileName || `Bill_No_${safeBillNumber}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importBillData(
  file: File
): Promise<ExaminationBillData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        resolve(data);
      } catch {
        reject(new Error("Invalid JSON file."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}
