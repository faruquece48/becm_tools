import type { Section } from "./section";
import type { Teacher } from "./teacher";
import type { DutyRecord } from "./duty";
import type { SectionBlock } from "./block";

export interface DocumentMetadata {
  examination: string;
  semester: string;
  session: string;
  year: string;
  university: string;
}

export interface BillDocument {

  // Original extracted text
  rawText: string;

  // Cleaned text
  cleanedText: string;

  // Basic document information
  metadata: DocumentMetadata;

  // Logical document blocks
  blocks: SectionBlock[];

  // Optional (for debugging)
  sections: Section[];

  // Parsed duty records
  duties: DutyRecord[];

  // Final grouped teachers
  teachers: Teacher[];

}