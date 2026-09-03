"use client";

import { useState } from "react";
import AcademicResultSheet from "@/components/AcademicResultSheet";
import BacklogCumulativeSheet from "@/components/BacklogCumulativeSheet";
import BacklogMarksSheet from "@/components/BacklogMarksSheet";
import MarksSheetSummary from "@/components/MarksSheetSummary";
import TabulationSheet from "@/components/TabulationSheet";

type ExamType = "Regular" | "Backlog";
type SheetKind = "marks" | "tabulation" | "result";

export default function ExamSheet({ kind, initialExamType = "Regular" }: { kind: SheetKind; initialExamType?: ExamType }) {
  const [examType, setExamType] = useState<ExamType>(initialExamType);
  const control = { examType, onExamTypeChange: setExamType };

  if (kind === "marks") return examType === "Regular" ? <MarksSheetSummary {...control} /> : <BacklogMarksSheet {...control} />;
  if (kind === "tabulation") return examType === "Regular" ? <TabulationSheet {...control} /> : <BacklogCumulativeSheet mode="tabulation" {...control} />;
  return examType === "Regular" ? <AcademicResultSheet title="Result Sheet" {...control} /> : <BacklogCumulativeSheet mode="result" {...control} />;
}