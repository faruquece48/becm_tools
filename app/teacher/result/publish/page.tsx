"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { academicYears, departmentName, semesters } from "@/lib/storage/studentDirectory";
import type { VivaCohort } from "@/lib/storage/vivaMarks";

const sameResult = (
  result: VivaCohort,
  selection: { examType?: "Regular" | "Backlog"; examYear: string; academicYear: string; semester: string },
) =>
  (result.examType || "Regular") === (selection.examType || "Regular") &&
  result.examYear === selection.examYear &&
  result.academicYear === selection.academicYear &&
  result.semester === selection.semester;

export default function PublishResultPage() {
  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: Math.max(1, currentYear - 2018 + 1) }, (_, index) => String(currentYear - index)),
    [currentYear],
  );
  const [results, setResults] = useState<VivaCohort[]>([]);
  const [selection, setSelection] = useState({
    examType: "Regular" as "Regular" | "Backlog",
    examYear: "2021",
    academicYear: "1st",
    semester: "Odd",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/result-publications", { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "Unable to load publication status");
          setResults(payload.results || []);
        })
        .catch((error) =>
          setMessage(error instanceof Error ? error.message : "Unable to load publication status"),
        )
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedResult = results.find((result) => sameResult(result, selection));
  const locked = Boolean(selectedResult?.submitted || selectedResult?.published);
  const fieldClass =
    "h-11 w-full rounded border border-slate-300 bg-white px-3 text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const requestPublication = async () => {
    if (locked || submitting) return;
    if (!window.confirm(
      "Request publication of the " + selection.academicYear + " Year " +
      (selection.examType === "Backlog" ? "Backlog Examination, " : selection.semester + " Semester Examination, ") + selection.examYear + "?",
    )) return;

    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/result-publications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department: departmentName, ...selection }),
      });
      const payload = (await response.json().catch(() => null)) as {
        result?: VivaCohort;
        error?: string;
      } | null;
      if (!response.ok || !payload?.result) {
        setMessage(payload?.error || "Unable to submit the publication request.");
        return;
      }
      setResults((current) => [
        ...current.filter((item) => !sameResult(item, selection)),
        payload.result!,
      ]);
      setMessage("Publication request submitted successfully for administrator approval.");
    } catch {
      setMessage("Unable to connect to the publication service.");
    } finally {
      setSubmitting(false);
    }
  };

  const status = selectedResult?.published
    ? "Published"
    : selectedResult?.submitted
      ? "Pending administrator approval"
      : selectedResult?.returnedForCorrection
        ? "Sent back for correction - resubmit after updating"
        : "Not yet submitted";

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-7">
      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <header className="border-b border-[#12396d] px-6 py-5">
          <h1 className="text-2xl font-extrabold text-[#102555]">Publish Result</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select the examination result and send a publication request to the administrator.
          </p>
        </header>

        <div className="grid gap-x-10 gap-y-5 border-b border-[#12396d] p-6 md:grid-cols-2">
          <label className="grid items-center gap-2 sm:grid-cols-[150px_1fr]">
            <span className="font-semibold text-slate-700">Department</span>
            <select disabled className={fieldClass}>
              <option>{departmentName}</option>
            </select>
          </label>

          <label className="grid items-center gap-2 sm:grid-cols-[150px_1fr]">
            <span className="font-semibold text-slate-700">Exam Year</span>
            <select
              value={selection.examYear}
              onChange={(event) => setSelection({ ...selection, examYear: event.target.value })}
              className={fieldClass}
            >
              {years.map((year) => <option key={year}>{year}</option>)}
            </select>
          </label>

          <label className="grid items-center gap-2 sm:grid-cols-[150px_1fr]">
            <span className="font-semibold text-slate-700">Exam Type</span>
            <select
              value={selection.examType}
              onChange={(event) => setSelection({ ...selection, examType: event.target.value as "Regular" | "Backlog", semester: event.target.value === "Backlog" ? "" : "Odd" })}
              className={fieldClass}
            >
              <option>Regular</option>
              <option>Backlog</option>
            </select>
          </label>

          <label className="grid items-center gap-2 sm:grid-cols-[150px_1fr]">
            <span className="font-semibold text-slate-700">Academic Year</span>
            <select
              value={selection.academicYear}
              onChange={(event) => setSelection({ ...selection, academicYear: event.target.value })}
              className={fieldClass}
            >
              {academicYears.map((year) => <option key={year}>{year}</option>)}
            </select>
          </label>

          {selection.examType === "Regular" && <label className="grid items-center gap-2 sm:grid-cols-[150px_1fr]">
            <span className="font-semibold text-slate-700">Semester</span>
            <select
              value={selection.semester}
              onChange={(event) => setSelection({ ...selection, semester: event.target.value })}
              className={fieldClass}
            >
              {semesters.filter((semester) => semester !== "Short Semester").map((semester) => (
                <option key={semester}>{semester}</option>
              ))}
            </select>
          </label>}

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 md:col-span-2">
            <span className={"rounded-full px-4 py-2 text-sm font-semibold " +
              (selectedResult?.published
                ? "bg-emerald-100 text-emerald-700"
                : selectedResult?.submitted
                  ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700")}
            >
              {loading ? "Checking result status..." : status}
            </span>
            <button
              type="button"
              disabled={loading || locked || submitting}
              onClick={requestPublication}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {selectedResult?.published ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting
                ? "Submitting Request..."
                : selectedResult?.published
                  ? "Result Published"
                  : selectedResult?.submitted
                    ? "Request Submitted"
                    : "Request to Publish"}
            </button>
          </div>
        </div>

        {message && (
          <p
            role="status"
            className={"m-5 rounded-lg px-4 py-3 text-sm font-semibold " +
              (message.includes("successfully")
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-700")}
          >
            {message}
          </p>
        )}
      </section>
    </div>
  );
}
