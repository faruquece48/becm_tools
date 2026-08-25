import type { DutyRecord } from "@/types/duty";

export interface Teacher {
  name: string;
  designation: string;
  department?: string;
}

export function parsePDF(_rawText: string): DutyRecord[] {
  void _rawText;
  const records: DutyRecord[] = [];

  // Parsing logic will be implemented incrementally.

  return records;
}
