export type TabulatorRecord = {
  id: string;
  examType: "Regular" | "Backlog";
  examYear: string;
  academicYear: string;
  semester: "Odd" | "Even" | "";
  chairman: string;
  member1: string;
  member2: string;
  formDate: string;
  reportingDate: string;
};


export const defaultTabulatorRecords: TabulatorRecord[] = [
  { id: "1", examType: "Regular", examYear: "2021", academicYear: "1st", semester: "Odd", chairman: "Dr. Md. Robiul Awall", member1: "Mr. Faruque Abdullah", member2: "Mr. Md. Ashraful Islam", formDate: "2023-03-30", reportingDate: "2023-03-30" },
  { id: "2", examType: "Regular", examYear: "2021", academicYear: "1st", semester: "Even", chairman: "Dr. Md. Robiul Awall", member1: "Mr. Faruque Abdullah", member2: "Mr. Md. Ashraful Islam", formDate: "2023-08-26", reportingDate: "2023-08-26" },
  { id: "3", examType: "Regular", examYear: "2022", academicYear: "1st", semester: "Odd", chairman: "Dr. Md. Robiul Awall", member1: "Mr. Mehedi Hasan", member2: "Mr. Md. Ashraful Islam", formDate: "2023-07-02", reportingDate: "2023-09-17" },
  { id: "4", examType: "Backlog", examYear: "2021", academicYear: "1st", semester: "Odd", chairman: "Dr. Md. Robiul Awall", member1: "Mr. Faruque Abdullah", member2: "Mr. Md. Ashraful Islam", formDate: "2023-06-12", reportingDate: "2023-10-14" },
  { id: "5", examType: "Regular", examYear: "2022", academicYear: "2nd", semester: "Odd", chairman: "Dr. Md. Robiul Awall", member1: "Mr. Faruque Abdullah", member2: "Mr. Md. Ashraful Islam", formDate: "2023-11-20", reportingDate: "2023-11-20" },
  { id: "6", examType: "Regular", examYear: "2022", academicYear: "1st", semester: "Even", chairman: "Dr. Md. Robiul Awall", member1: "Mr. Mehedi Hasan", member2: "Mr. Md. Ashraful Islam", formDate: "2024-01-01", reportingDate: "2024-01-01" },
  { id: "7", examType: "Regular", examYear: "2022", academicYear: "2nd", semester: "Even", chairman: "Dr. Md. Robiul Awall", member1: "Mr. Faruque Abdullah", member2: "Mr. Md. Ashraful Islam", formDate: "2024-02-12", reportingDate: "2024-03-04" },
  { id: "8", examType: "Backlog", examYear: "2022", academicYear: "1st", semester: "Odd", chairman: "Dr. Md. Robiul Awall", member1: "Mr. Mehedi Hasan", member2: "Mr. Md. Ashraful Islam", formDate: "2024-03-24", reportingDate: "2024-03-24" },
  { id: "9", examType: "Regular", examYear: "2023", academicYear: "1st", semester: "Odd", chairman: "Dr. Md. Robiul Awall", member1: "Mr. Md. Ashraful Islam", member2: "Mr. Towfik Hassan", formDate: "2024-03-27", reportingDate: "2024-03-27" },
  { id: "10", examType: "Backlog", examYear: "2022", academicYear: "2nd", semester: "Even", chairman: "Dr. Md. Robiul Awall", member1: "Mr. Faruque Abdullah", member2: "Mr. Md. Ashraful Islam", formDate: "2024-05-05", reportingDate: "2024-07-07" },
  { id: "11", examType: "Regular", examYear: "2023", academicYear: "2nd", semester: "Odd", chairman: "Ashadul Islam", member1: "Mr. Mehedi Hasan", member2: "Mr. Md. Ashraful Islam", formDate: "2024-07-31", reportingDate: "2024-08-27" },
  { id: "12", examType: "Regular", examYear: "2023", academicYear: "3rd", semester: "Odd", chairman: "Ashadul Islam", member1: "Mr. Faruque Abdullah", member2: "Mr. Md. Ashraful Islam", formDate: "2024-09-23", reportingDate: "2024-11-02" },
  { id: "13", examType: "Regular", examYear: "2023", academicYear: "1st", semester: "Even", chairman: "Ashadul Islam", member1: "Mr. Md. Ashraful Islam", member2: "Mr. Towfik Hassan", formDate: "2024-11-04", reportingDate: "2024-11-24" },
  { id: "14", examType: "Regular", examYear: "2023", academicYear: "3rd", semester: "Even", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Faruque Abdullah", member2: "Mr. Md. Ashraful Islam", formDate: "2024-05-06", reportingDate: "2025-03-12" },
  { id: "15", examType: "Regular", examYear: "2023", academicYear: "2nd", semester: "Even", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Mehedi Hasan", member2: "Mr. Md. Ashraful Islam", formDate: "2025-02-10", reportingDate: "2025-03-18" },
  { id: "16", examType: "Backlog", examYear: "2023", academicYear: "1st", semester: "", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Md. Ashraful Islam", member2: "Mr. Towfik Hassan", formDate: "2025-02-12", reportingDate: "2025-04-15" },
  { id: "17", examType: "Regular", examYear: "2024", academicYear: "2nd", semester: "Odd", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Md. Ashraful Islam", member2: "Mr. Towfik Hassan", formDate: "2025-05-20", reportingDate: "2025-04-19" },
  { id: "18", examType: "Regular", examYear: "2024", academicYear: "1st", semester: "Odd", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Faruque Abdullah", member2: "Mr. Nur Alam Riad", formDate: "2025-06-16", reportingDate: "2025-06-28" },
  { id: "19", examType: "Backlog", examYear: "2023", academicYear: "2nd", semester: "", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Mehedi Hasan", member2: "Mr. Md. Ashraful Islam", formDate: "2025-04-08", reportingDate: "2025-06-29" },
  { id: "20", examType: "Regular", examYear: "2024", academicYear: "2nd", semester: "Odd", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Md. Ashraful Islam", member2: "Mr. Towfik Hassan", formDate: "2025-08-09", reportingDate: "2025-08-09" },
  { id: "21", examType: "Backlog", examYear: "2023", academicYear: "3rd", semester: "", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Faruque Abdullah", member2: "Mr. Md. Ashraful Islam", formDate: "2025-08-19", reportingDate: "2025-09-09" },
  { id: "22", examType: "Regular", examYear: "2024", academicYear: "3rd", semester: "Odd", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Mehedi Hasan", member2: "Mr. Md. Ashraful Islam", formDate: "2025-09-02", reportingDate: "2025-09-13" },
  { id: "23", examType: "Regular", examYear: "2024", academicYear: "1st", semester: "Even", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Faruque Abdullah", member2: "Mr. Nur Alam Riad", formDate: "2025-12-01", reportingDate: "2025-12-03" },
  { id: "24", examType: "Regular", examYear: "2024", academicYear: "4th", semester: "Odd", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Faruque Abdullah", member2: "Mr. Md. Ashraful Islam", formDate: "2025-12-11", reportingDate: "2025-12-16" },
  { id: "25", examType: "Regular", examYear: "2025", academicYear: "1st", semester: "Odd", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Aojoy Kumar Shuvo", member2: "Mr. MD. Mehedi Hassan Galib", formDate: "2025-12-17", reportingDate: "2025-12-17" },
  { id: "26", examType: "Regular", examYear: "2024", academicYear: "2nd", semester: "Even", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Md. Ashraful Islam", member2: "Mr. Towfik Hassan", formDate: "2025-11-25", reportingDate: "2026-01-19" },
  { id: "27", examType: "Backlog", examYear: "2024", academicYear: "1st", semester: "", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Faruque Abdullah", member2: "Mr. Nur Alam Riad", formDate: "2026-02-15", reportingDate: "2026-02-15" },
  { id: "28", examType: "Regular", examYear: "2024", academicYear: "3rd", semester: "Even", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Mehedi Hasan", member2: "Mr. Md. Ashraful Islam", formDate: "2026-01-26", reportingDate: "2026-04-18" },
  { id: "29", examType: "Backlog", examYear: "2024", academicYear: "2nd", semester: "", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Md. Ashraful Islam", member2: "Mr. Towfik Hassan", formDate: "2026-04-22", reportingDate: "2026-05-16" },
  { id: "30", examType: "Regular", examYear: "2023", academicYear: "4th", semester: "Even", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Faruque Abdullah", member2: "Mr. Md. Ashraful Islam", formDate: "2026-07-20", reportingDate: "2026-07-04" },
  { id: "31", examType: "Regular", examYear: "2024", academicYear: "4th", semester: "Even", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Faruque Abdullah", member2: "Mr. Md. Ashraful Islam", formDate: "2026-05-11", reportingDate: "2026-07-15" },
  { id: "32", examType: "Regular", examYear: "2025", academicYear: "1st", semester: "Even", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Aojoy Kumar Shuvo", member2: "Mr. MD. Mehedi Hassan Galib", formDate: "2026-07-20", reportingDate: "2026-07-19" },
  { id: "33", examType: "Backlog", examYear: "2024", academicYear: "3rd", semester: "", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Mehedi Hasan", member2: "Mr. Md. Ashraful Islam", formDate: "2026-06-22", reportingDate: "2026-07-21" },
  { id: "34", examType: "Regular", examYear: "2025", academicYear: "2nd", semester: "Odd", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Faruque Abdullah", member2: "Mr. Nur Alam Riad", formDate: "2026-07-27", reportingDate: "2026-07-27" },
  { id: "35", examType: "Regular", examYear: "2025", academicYear: "3rd", semester: "Odd", chairman: "Mrs. Shayla Sharmin", member1: "Mr. Md. Ashraful Islam", member2: "Mr. Towfik Hassan", formDate: "2026-06-22", reportingDate: "2026-08-22" },
];

export async function loadTabulators(): Promise<TabulatorRecord[]> {
  const response = await fetch("/api/tabulators", { cache: "no-store" });
  const payload = await response.json().catch(() => null) as { data?: TabulatorRecord[]; error?: string } | null;
  if (!response.ok || !payload?.data) throw new Error(payload?.error || "Unable to load tabulators");
  return payload.data;
}

export async function saveTabulators(records: TabulatorRecord[]): Promise<TabulatorRecord[]> {
  const response = await fetch("/api/tabulators", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: records }) });
  const payload = await response.json().catch(() => null) as { data?: TabulatorRecord[]; error?: string } | null;
  if (!response.ok || !payload?.data) throw new Error(payload?.error || "Unable to save tabulators");
  return payload.data;
}

export function formatTabulatorDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}