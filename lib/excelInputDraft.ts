import { z } from "zod";

const cellSchema = z.object({
  a: z.string(), b: z.string(), ct: z.string(), sessional: z.string(),
  internal: z.string(), external: z.string(), viva: z.string(),
});
const rowSchema = z.object({
  id: z.string(), roll: z.string(), boardViva: z.string(),
  cells: z.record(z.string(), cellSchema), registered: z.record(z.string(), z.boolean()),
  dirty: z.boolean().optional(),
});
type DraftRow = z.infer<typeof rowSchema>;
const draftSchema = z.object({ version: z.literal(1), rows: z.array(rowSchema) });

export function excelDraftKey(examType: string, examYear: string, academicYear: string, semester: string) {
  return `excel-result-draft:v1:${examType}:${examYear}:${academicYear}:${examType === "Backlog" ? "Backlog" : semester}`;
}

export function encodeExcelDraft(rows: DraftRow[]) {
  return JSON.stringify({ version: 1, rows: rows.filter(row => row.dirty).map(row => rowSchema.parse(row)) });
}

export function restoreExcelDraft<T extends DraftRow>(rows: T[], serialized: string | null): T[] {
  if (!serialized) return rows;
  const draft = draftSchema.parse(JSON.parse(serialized));
  return rows.map(row => {
    const saved = draft.rows.find(item => item.id === row.id && item.roll === row.roll);
    if (!saved) return row;
    return {
      ...row, dirty: true, boardViva: saved.boardViva,
      cells: Object.fromEntries(Object.entries(row.cells).map(([key, cell]) => [key, saved.cells[key] ?? cell])),
      registered: Object.fromEntries(Object.entries(row.registered).map(([key, registered]) => [key, saved.registered[key] ?? registered])),
    };
  });
}
