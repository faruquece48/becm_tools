"use client";

import { useState } from "react";
import StaffLendingRecords from "@/components/StaffLendingRecords";
import TeacherBookRecords from "@/components/TeacherBookRecords";

export default function BookRecordWorkspace() {
  const [view, setView] = useState<"student" | "teacher">("student");
  return <div>
    <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm" role="tablist" aria-label="Book record type">
      <button type="button" role="tab" aria-selected={view === "student"} onClick={() => setView("student")} className={`rounded-lg px-5 py-2.5 text-sm font-bold ${view === "student" ? "bg-blue-600 text-white" : "text-slate-600"}`}>Student Record</button>
      <button type="button" role="tab" aria-selected={view === "teacher"} onClick={() => setView("teacher")} className={`rounded-lg px-5 py-2.5 text-sm font-bold ${view === "teacher" ? "bg-blue-600 text-white" : "text-slate-600"}`}>Teacher Record</button>
    </div>
    {view === "student" ? <StaffLendingRecords /> : <TeacherBookRecords />}
  </div>;
}
