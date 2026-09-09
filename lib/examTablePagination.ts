export type WidthGroup = { id: string; width: number };

/** Keep subject subcolumns together; repeat identity columns outside every slice. */
export function paginateExamColumns<T extends WidthGroup>(groups: T[], pageWidth: number, identityWidth: number): T[][] {
  const available = pageWidth - identityWidth;
  if (available <= 0) throw new Error("No space available for examination columns.");
  const pages: T[][] = [];
  let page: T[] = [], used = 0;
  for (const group of groups) {
    if (group.width <= 0 || group.width > available) throw new Error(`Column group ${group.id} does not fit the page.`);
    if (page.length && used + group.width > available + .001) { pages.push(page); page = []; used = 0; }
    page.push(group); used += group.width;
  }
  if (page.length) pages.push(page);
  return pages;
}

export function usesWideExamTable(academicYear: string, examType: string, kind: string) {
  return academicYear === "4th" && (examType === "Backlog" || examType === "Short Semester") && (kind === "marks" || kind === "tabulation");
}
