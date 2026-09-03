"use client";

import { useState } from "react";
import PrepareBacklogResult from "@/components/PrepareBacklogResult";
import PrepareResult from "@/components/PrepareResult";

type ExamType = "Regular" | "Backlog";

export default function ExamPreparation({ initialExamType = "Regular" }: { initialExamType?: ExamType }) {
  const [examType, setExamType] = useState<ExamType>(initialExamType);
  const control = { examType, onExamTypeChange: setExamType };
  return examType === "Regular" ? <PrepareResult {...control} /> : <PrepareBacklogResult {...control} />;
}