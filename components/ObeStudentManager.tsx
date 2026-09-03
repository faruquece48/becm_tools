"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Save, Search } from "lucide-react";
import {
  academicYears,
  departmentName,
  semesters,
  type ObeBatchPlacement,
  type StudentDirectoryRecord,
} from "@/lib/storage/studentDirectory";

const currentYear = String(new Date().getFullYear());
const field = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500";
const emptyAssignment = { series: "", academicYear: "1st", semester: "Odd", effectiveExamYear: currentYear, reason: "" };

export default function ObeStudentManager() {
  const [records, setRecords] = useState<StudentDirectoryRecord[]>([]);
  const [studentId, setStudentId] = useState("");
  const [assignment, setAssignment] = useState(emptyAssignment);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/students/directory", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setRecords(body.records || []);
      })
      .catch((error) => setMessage(error.message || "Unable to load OBE students"))
      .finally(() => setLoading(false));
  }, []);

  const selectedStudent = records.find((student) => student.id === studentId);
  const matchingStudents = useMemo(() => {
    const search = query.trim().toLowerCase();
    return records
      .filter((student) => !search || (student.name + " " + student.rollNo + " " + student.registrationNo + " " + student.series).toLowerCase().includes(search))
      .sort((left, right) => left.rollNo.localeCompare(right.rollNo, undefined, { numeric: true }));
  }, [query, records]);
  const assignedStudents = useMemo(
    () => records.filter((student) => student.obeBatchPlacements?.length).sort((left, right) => left.rollNo.localeCompare(right.rollNo, undefined, { numeric: true })),
    [records],
  );

  function chooseStudent(id: string) {
    setStudentId(id);
    const student = records.find((item) => item.id === id);
    setAssignment(student ? {
      series: student.series,
      academicYear: student.year,
      semester: student.semester,
      effectiveExamYear: student.placementExamYear || currentYear,
      reason: "",
    } : emptyAssignment);
    setMessage("");
  }

  async function saveAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStudent) {
      setMessage("Select a student first.");
      return;
    }
    if (!/^\d{4}$/.test(assignment.series) || !/^\d{4}$/.test(assignment.effectiveExamYear)) {
      setMessage("Batch series and effective examination year must contain four digits.");
      return;
    }
    const placement: ObeBatchPlacement = {
      id: crypto.randomUUID(),
      series: assignment.series,
      academicYear: assignment.academicYear as ObeBatchPlacement["academicYear"],
      semester: assignment.semester as ObeBatchPlacement["semester"],
      effectiveExamYear: assignment.effectiveExamYear,
      reason: assignment.reason.trim(),
      assignedAt: new Date().toISOString(),
    };
    const updated: StudentDirectoryRecord = {
      ...selectedStudent,
      department: selectedStudent.department || departmentName,
      series: placement.series,
      year: placement.academicYear,
      semester: placement.semester,
      placementExamYear: placement.effectiveExamYear,
      obeBatchPlacements: [...(selectedStudent.obeBatchPlacements || []), placement],
    };
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/students/directory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: [updated] }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setRecords(body.records || []);
      setMessage(updated.name + " is now a regular student of Series " + updated.series + ", " + updated.year + " Year " + updated.semester + " Semester.");
      setAssignment({ ...assignment, reason: "" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to assign the student");
    } finally {
      setSaving(false);
    }
  }

  return <section className="min-h-screen bg-[#f7f9fd] p-4 sm:p-6">
    <header className="border-t border-[#082f57] bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-bold text-[#102555]">OBE Student Batch Placement</h1>
      <p className="mt-1 max-w-4xl text-sm text-slate-600">Assign a dropped or continuing OBE student to any junior batch and semester. The current student directory is updated, so the student is treated as a regular student of the selected series, year and semester. Every reassignment remains in the placement history.</p>
    </header>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(300px,0.8fr)_minmax(520px,1.2fr)]">
      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="font-bold">1. Select Student</h2>
        <label className="relative mt-3 block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, roll, registration or series" className={field + " pl-10"} /></label>
        <div className="mt-3 max-h-[420px] overflow-y-auto rounded border">
          {matchingStudents.map((student) => <button key={student.id} type="button" onClick={() => chooseStudent(student.id)} className={"block w-full border-b p-3 text-left text-sm last:border-0 " + (studentId === student.id ? "bg-blue-50 ring-1 ring-inset ring-blue-400" : "hover:bg-slate-50")}><strong>{student.name}</strong><span className="mt-1 block text-slate-600">{student.rollNo} · Series {student.series} · {student.year} {student.semester}</span></button>)}
          {!loading && !matchingStudents.length && <p className="p-6 text-center text-sm text-slate-500">No student found.</p>}
          {loading && <p className="p-6 text-center text-sm text-slate-500">Loading students...</p>}
        </div>
      </section>

      <form onSubmit={saveAssignment} className="rounded-lg border bg-white shadow-sm">
        <div className="border-b p-5"><h2 className="font-bold">2. Assign Regular Batch and Semester</h2>{selectedStudent && <p className="mt-1 text-sm text-slate-600">Current: Series {selectedStudent.series}, {selectedStudent.year} Year, {selectedStudent.semester} Semester</p>}</div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className="text-sm font-semibold">Target Batch / Series<input required inputMode="numeric" pattern="\d{4}" placeholder="e.g. 2022" value={assignment.series} onChange={(event) => setAssignment({ ...assignment, series: event.target.value })} className={field + " mt-1"} /></label>
          <label className="text-sm font-semibold">Effective Examination Year<input required inputMode="numeric" pattern="\d{4}" value={assignment.effectiveExamYear} onChange={(event) => setAssignment({ ...assignment, effectiveExamYear: event.target.value })} className={field + " mt-1"} /></label>
          <label className="text-sm font-semibold">Academic Year<select value={assignment.academicYear} onChange={(event) => setAssignment({ ...assignment, academicYear: event.target.value })} className={field + " mt-1"}>{academicYears.map((year) => <option key={year}>{year}</option>)}</select></label>
          <label className="text-sm font-semibold">Semester<select value={assignment.semester} onChange={(event) => setAssignment({ ...assignment, semester: event.target.value })} className={field + " mt-1"}>{semesters.map((semester) => <option key={semester}>{semester}</option>)}</select></label>
          <label className="text-sm font-semibold md:col-span-2">Reason / Placement Note<textarea required maxLength={500} rows={3} value={assignment.reason} onChange={(event) => setAssignment({ ...assignment, reason: event.target.value })} placeholder="Example: Dropped to 2022 series from 3rd Year Even; will continue as a regular student from 2nd Year Odd." className="mt-1 w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-blue-500" /></label>
        </div>
        <div className="flex items-center justify-between gap-3 border-t p-5"><p className="text-xs text-slate-500">Roll and registration numbers remain unchanged.</p><button disabled={!selectedStudent || saving} className="rounded bg-green-600 px-5 py-2.5 font-bold text-white disabled:opacity-50"><Save className="mr-1 inline h-4 w-4" />{saving ? "Saving..." : "Save Placement"}</button></div>
      </form>
    </div>

    {message && <p role="status" className={"mt-5 rounded p-3 font-semibold " + (message.includes("now a regular") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>{message}</p>}

    <section className="mt-5 overflow-hidden rounded-lg border bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b p-5"><ArrowRightLeft className="h-5 w-5" /><h2 className="font-bold">OBE Placement History</h2></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-sm"><thead className="bg-[#082f57] text-white"><tr>{["Student","Current Regular Assignment","Previous Placements","Last Reason","Last Assigned"].map((heading) => <th key={heading} className="p-3 text-left">{heading}</th>)}</tr></thead><tbody>{assignedStudents.map((student) => { const history = student.obeBatchPlacements || []; const last = history[history.length - 1]; return <tr key={student.id} className="border-b align-top odd:bg-white even:bg-slate-50"><td className="p-3"><strong>{student.name}</strong><span className="block text-slate-500">{student.rollNo}</span></td><td className="p-3">Series {student.series}, {student.year} {student.semester}<span className="block text-slate-500">Exam {student.placementExamYear || "-"}</span></td><td className="p-3">{history.map((item, index) => <span key={item.id} className="block">{index + 1}. Series {item.series}, {item.academicYear} {item.semester}, Exam {item.effectiveExamYear}</span>)}</td><td className="max-w-sm p-3">{last?.reason || "-"}</td><td className="p-3">{last ? new Date(last.assignedAt).toLocaleString() : "-"}</td></tr>})}{!assignedStudents.length && <tr><td colSpan={5} className="p-10 text-center text-slate-500">No OBE batch placements saved yet.</td></tr>}</tbody></table></div>
    </section>
  </section>;
}