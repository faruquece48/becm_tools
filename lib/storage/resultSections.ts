export type ResultSection = "add-viva-marks" | "prepare-result" | "prepare-result-backlog" | "marks-sheet" | "marks-sheet-backlog" | "grade-sheet" | "result-sheet" | "result-sheet-backlog" | "tabulation-sheet" | "tabulation-sheet-backlog";

export async function loadResultSection<T>(section: ResultSection): Promise<T> {
  const response = await fetch(`/api/result-sections/${section}`, { cache: "no-store" });
  const payload = await response.json().catch(() => null) as { data?: T; error?: string } | null;
  if (!response.ok || payload?.data === undefined) throw new Error(payload?.error || "Unable to load result data");
  return payload.data;
}

export async function saveResultSection<T>(section: ResultSection, data: T): Promise<T> {
  const response = await fetch(`/api/result-sections/${section}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
  const payload = await response.json().catch(() => null) as { data?: T; error?: string } | null;
  if (!response.ok || payload?.data === undefined) throw new Error(payload?.error || "Unable to save result data");
  return payload.data;
}