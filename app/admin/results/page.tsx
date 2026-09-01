"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, RotateCcw } from "lucide-react";
import type { VivaCohort } from "@/lib/storage/vivaMarks";

const same = (left: VivaCohort, right: VivaCohort) =>
  left.examYear === right.examYear &&
  left.academicYear === right.academicYear &&
  left.semester === right.semester;

export default function AdminResultApprovalPage() {
  const [results, setResults] = useState<VivaCohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/admin/result-approvals", { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "Unable to load result approvals");
          setResults(payload.results || []);
        })
        .catch((error) =>
          setMessage(error instanceof Error ? error.message : "Unable to load result approvals"),
        )
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const updateResult = async (result: VivaCohort, action: "accept" | "send-back") => {
    const description = result.examYear + " " + result.academicYear + " Year " +
      result.semester + " Semester result";
    const confirmation = action === "accept"
      ? "Accept and publish the " + description + "? All marks will be locked."
      : "Send the " + description + " back to the tabulator for correction? Its marks will be unlocked until it is resubmitted.";
    if (!window.confirm(confirmation)) return;

    const password = window.prompt("Enter admin password to continue:");
    if (password === null) return;

    const key = result.examYear + "|" + result.academicYear + "|" + result.semester;
    setBusyKey(key);
    setMessage("");
    try {
      const response = await fetch("/api/admin/result-approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department: result.department,
          examYear: result.examYear,
          academicYear: result.academicYear,
          semester: result.semester,
          action,
          password,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        result?: VivaCohort;
        error?: string;
      } | null;
      if (!response.ok || !payload?.result) {
        setMessage(payload?.error || "Unable to update this result.");
        return;
      }
      setResults((current) =>
        current.map((item) => same(item, result) ? payload.result! : item),
      );
      setMessage(
        action === "accept"
          ? "Result accepted, published, and locked successfully."
          : "Result sent back to the tabulator. Marks are unlocked for correction.",
      );
    } catch {
      setMessage("Unable to connect to the result approval service.");
    } finally {
      setBusyKey("");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
          <ClipboardCheck className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Academic results
          </p>
          <h1 className="text-3xl font-extrabold">Result Approval</h1>
        </div>
      </div>
      <p className="mt-3 text-slate-500">
        Accept submitted results or send them back to the tabulator for a correction and resubmission.
      </p>

      {message && (
        <p
          role="status"
          className={"mt-5 rounded-xl p-4 text-sm font-semibold " +
            (message.includes("successfully") || message.includes("unlocked")
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700")}
        >
          {message}
        </p>
      )}

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] border-collapse text-sm">
            <thead className="bg-[#082f57] text-white">
              <tr>
                {["Result Type", "Exam Year", "Academic Year", "Semester", "Students", "Submitted By", "Status", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const key = result.examYear + "|" + result.academicYear + "|" + result.semester;
                const busy = busyKey === key;
                return (
                  <tr key={key} className="border-b odd:bg-white even:bg-slate-50">
                    <td className="px-4 py-4 font-semibold">Final Result</td>
                    <td className="px-4 py-4">{result.examYear}</td>
                    <td className="px-4 py-4">{result.academicYear}</td>
                    <td className="px-4 py-4">{result.semester}</td>
                    <td className="px-4 py-4">{result.students.length}</td>
                    <td className="px-4 py-4">{result.submittedBy || "Teacher"}</td>
                    <td className="px-4 py-4">
                      {result.returnedForCorrection ? (
                        <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-700">
                          Sent Back for Correction
                        </span>
                      ) : result.published ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" /> Published
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700">
                          Pending Approval
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || !result.submitted || result.published}
                          onClick={() => void updateResult(result, "accept")}
                          className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {result.published ? "Accepted" : "Accept Result"}
                        </button>
                        <button
                          type="button"
                          disabled={busy || result.returnedForCorrection}
                          onClick={() => void updateResult(result, "send-back")}
                          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Send Back
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {loading && (
                <tr><td colSpan={8} className="p-12 text-center text-slate-500">Loading result submissions...</td></tr>
              )}
              {!loading && !results.length && (
                <tr><td colSpan={8} className="p-12 text-center text-slate-500">No results have been submitted for approval.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
