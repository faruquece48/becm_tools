"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UsersRound } from "lucide-react";
import { academicYears, departmentName, semesters, type StudentDirectoryRecord } from "@/lib/storage/studentDirectory";
import type { CourseEligibility } from "@/lib/storage/studentEligibility";
import { loadResultSection } from "@/lib/storage/resultSections";

const yearNumber: Record<string, number> = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 };
const currentExamYear = new Date().getFullYear();
const examYears = Array.from({ length: Math.max(1, currentExamYear - 2018 + 1) }, (_, index) => String(currentExamYear - index));
const examYearOf = (student: StudentDirectoryRecord) => String(Number(student.series) + (yearNumber[student.year] || 1));
type ResultCohort = { examYear: string; academicYear: string; semester: string; students: Array<{ studentId: string }> };
const nextPromotion = (source: { examYear: string; year: string; semester: string }) => {
  if (source.semester === "Odd") {
    return { examYear: source.examYear, year: source.year, semester: "Even" };
  }
  if (source.semester === "Even" && source.year !== "4th") {
    const nextYear = academicYears[Math.min(academicYears.length - 1, academicYears.indexOf(source.year) + 1)];
    return { examYear: String(Number(source.examYear) + 1), year: nextYear, semester: "Odd" };
  }
  return { examYear: source.examYear, year: source.year, semester: "Short Semester" };
};

export default function PromoteStudents() {
  const [records, setRecords] = useState<StudentDirectoryRecord[]>([]);
  const [resultCohorts, setResultCohorts] = useState<ResultCohort[]>([]);
  const [eligibility, setEligibility] = useState<CourseEligibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState({ examYear: String(currentExamYear), year: "1st", semester: "Odd" });
  const [target, setTarget] = useState({ examYear: String(currentExamYear), year: "1st", semester: "Odd" });
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sections, setSections] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/students/directory").then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        return body.records || [];
      }),
      loadResultSection<ResultCohort[]>("marks-sheet"),
      loadResultSection<ResultCohort[]>("prepare-result"),
      fetch("/api/student-eligibility", { cache: "no-store" }).then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        return body.records || [];
      }),
    ])
      .then(([directory, marksSheets, preparedResults, eligibilityRecords]) => {
        setRecords(directory.map((student: StudentDirectoryRecord) => ({
          ...student,
          section: student.section || "A",
        })));
        setResultCohorts([
          ...(Array.isArray(marksSheets) ? marksSheets : []),
          ...(Array.isArray(preparedResults) ? preparedResults : []),
        ]);
        setEligibility(Array.isArray(eligibilityRecords) ? eligibilityRecords : []);
      })
      .catch((error) => setMessage(error.message || "Unable to load students and results"))
      .finally(() => setLoading(false));
  }, []);
  const field = "h-9 w-full rounded-sm border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-500";
  const availableExamYears = useMemo(() => [...new Set([...examYears, ...records.map(examYearOf)])].sort().reverse(), [records]);

  function showStudents() {
    const completedStudentIds = new Set(
      resultCohorts
        .filter((result) =>
          result.examYear === source.examYear &&
          result.academicYear === source.year &&
          result.semester === source.semester,
        )
        .flatMap((result) => result.students || [])
        .map((student) => student.studentId),
    );
    const selectedEligibility = eligibility.filter((record) =>
      record.examYear === source.examYear &&
      record.academicYear === source.year &&
      record.semester === source.semester,
    );
    const fullyIneligibleStudentIds = new Set(
      (selectedEligibility[0]?.students || [])
        .filter((student) => student.eligible === false && selectedEligibility.every((record) =>
          record.students.find((candidate) => candidate.studentId === student.studentId)?.eligible === false,
        ))
        .map((student) => student.studentId),
    );
    const matching = records
      .filter((student) =>
        student.department === departmentName &&
        student.year === source.year &&
        student.semester === source.semester &&
        (examYearOf(student) === source.examYear || completedStudentIds.has(student.id) || fullyIneligibleStudentIds.has(student.id)),
      )
      .sort((left, right) => {
        const currentSeries = String(Number(source.examYear) - (yearNumber[source.year] || 1));
        const leftGroup = left.series === currentSeries ? 0 : 1;
        const rightGroup = right.series === currentSeries ? 0 : 1;
        return leftGroup - rightGroup ||
          left.rollNo.localeCompare(right.rollNo, undefined, { numeric: true });
      });
    setStudents(matching);
    setSelected(new Set(matching.map((student) => student.id)));
    setSections(Object.fromEntries(matching.map((student) => [student.id, student.section || "A"])));
    setTarget(nextPromotion(source));
    setMessage(matching.length ? "" : "No students found for the selected cohort.");
  }

  function toggle(id: string) {
    setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  async function promote() {
    const chosen = students.filter((student) => selected.has(student.id));
    if (!chosen.length) { setMessage("Select at least one student to promote."); return; }
    const expectedTarget = nextPromotion(source);
    if (
      target.examYear !== expectedTarget.examYear ||
      target.year !== expectedTarget.year ||
      target.semester !== expectedTarget.semester
    ) {
      setMessage(
        `The next destination for this examination is ${expectedTarget.year} Year ${expectedTarget.semester} Semester (Exam Year ${expectedTarget.examYear}).`,
      );
      return;
    }    setSaving(true); setMessage("");
    const qualifiesForBacklog = source.semester === "Even" && target.semester === "Odd" && yearNumber[target.year] === yearNumber[source.year] + 1 && Number(target.examYear) === Number(source.examYear) + 1;
    const promotedAt = new Date().toISOString();
    const promoted = chosen.map((student) => {
      const existingEligibility = student.backlogEligibility || [];
      const addedEligibility = qualifiesForBacklog ? (["Odd", "Even"] as const).filter((semester) => !existingEligibility.some((item) => item.examYear === source.examYear && item.academicYear === source.year && item.semester === semester)).map((semester) => ({ examYear: source.examYear, academicYear: source.year, semester, createdAt: promotedAt })) : [];
      return { ...student, year: target.year, semester: target.semester, section: sections[student.id] || "A", backlogEligibility: [...existingEligibility, ...addedEligibility] };
    });
    try {
      const response = await fetch("/api/students/directory", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records: promoted }), signal: AbortSignal.timeout(30000) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to promote students");
      const savedRecords = (body.records || []).map((student: StudentDirectoryRecord) => ({ ...student, section: student.section || "A" }));
      const promotionSaved = chosen.every((student) => savedRecords.some((record: StudentDirectoryRecord) => record.id === student.id && record.year === target.year && record.semester === target.semester));
      if (!promotionSaved) throw new Error("Neon did not confirm every selected promotion. Please try again.");
      setRecords(savedRecords);
      setStudents([]); setSelected(new Set());
      setMessage(`${chosen.length} student${chosen.length === 1 ? "" : "s"} promoted successfully.`);
    } catch (error) { setMessage(error instanceof DOMException && error.name === "TimeoutError" ? "Promotion timed out before Neon confirmed the update. Nothing was confirmed; please try again." : error instanceof Error ? error.message : "Unable to promote students"); }
    finally { setSaving(false); }
  }

  const allSelected = students.length > 0 && students.every((student) => selected.has(student.id));
  return <section className="min-h-screen bg-[#f7f9fd] p-2 sm:p-5">
    <div className="border-t border-[#0a315b] bg-white shadow-sm">
      <div className="border-b border-[#0a315b] px-5 py-4 text-center"><h1 className="text-xl font-bold text-[#151515]">Student Promotion Form (Bulk)</h1></div>
      <div className="grid gap-x-12 gap-y-3 border-b border-[#0a315b] p-5 md:grid-cols-2">
        <label className="grid items-center gap-3 text-sm font-semibold sm:grid-cols-[250px_1fr]">Department<select disabled value={departmentName} className={field}><option>{departmentName}</option></select></label>
        <label className="grid items-center gap-3 text-sm font-semibold sm:grid-cols-[250px_1fr]">Exam Year<select value={source.examYear} onChange={(e) => setSource({ ...source, examYear: e.target.value })} className={field}>{availableExamYears.map((year) => <option key={year}>{year}</option>)}</select></label>
        <label className="grid items-center gap-3 text-sm font-semibold sm:grid-cols-[250px_1fr]">Academic Year<select value={source.year} onChange={(e) => setSource({ ...source, year: e.target.value })} className={field}>{academicYears.map((year) => <option key={year}>{year}</option>)}</select></label>
        <label className="grid items-center gap-3 text-sm font-semibold sm:grid-cols-[250px_1fr]">Semester<select value={source.semester} onChange={(e) => setSource({ ...source, semester: e.target.value })} className={field}>{semesters.map((semester) => <option key={semester}>{semester}</option>)}</select></label>
      </div>
      <div className="border-b border-[#0a315b] p-5"><button type="button" disabled={loading} onClick={showStudents} className="rounded bg-[#082f57] px-4 py-2 text-sm font-bold text-white"><Search className="mr-1 inline h-4 w-4" />Student Details</button></div>
      {message && <p role="status" className={`mx-5 mt-4 rounded p-3 text-sm font-semibold ${message.includes("successfully") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message}</p>}
      {students.length > 0 && <div className="p-5">
        <div className="grid gap-x-12 gap-y-3 md:grid-cols-2">
          <label className="grid items-center gap-3 text-sm font-semibold sm:grid-cols-[250px_1fr]">Exam Year<select value={target.examYear} onChange={(e) => setTarget({ ...target, examYear: e.target.value })} className={field}>{availableExamYears.map((year) => <option key={year}>{year}</option>)}</select></label>
          <label className="grid items-center gap-3 text-sm font-semibold sm:grid-cols-[250px_1fr]">Academic Year<select value={target.year} onChange={(e) => setTarget({ ...target, year: e.target.value })} className={field}>{academicYears.map((year) => <option key={year}>{year}</option>)}</select></label>
          <label className="grid items-center gap-3 text-sm font-semibold sm:grid-cols-[250px_1fr]">Semester<select value={target.semester} onChange={(e) => setTarget({ ...target, semester: e.target.value })} className={field}>{semesters.map((semester) => <option key={semester}>{semester}</option>)}</select></label>
        </div>
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p className="font-bold">Promotion destination: {target.year} Year {target.semester} Semester, Exam Year {target.examYear}</p>
          <p className="mt-1">Selected students will move to this year and semester. Their original series and session will remain unchanged. Teachers can then prepare results for them under this destination semester.</p>
          <p className="mt-1">After promotion, they will no longer appear in the previous semester on Student List. Search using their original session together with {target.year} Year and {target.semester} Semester.</p>
        </div>
        <h2 className="mt-3 flex items-center gap-2 text-xl font-bold"><UsersRound className="h-5 w-5" />Student List:</h2>
        <div className="mt-2 overflow-hidden border border-slate-300"><table className="w-full table-fixed border-collapse text-sm"><thead className="bg-[#082f57] text-white"><tr><th className="w-16 border-r p-2"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(students.map((student) => student.id)))} aria-label="Select all students" /></th><th className="w-20 border-r p-2">Sl.</th><th className="border-r p-2">Student Name</th><th className="w-[18%] border-r p-2">Roll No</th><th className="w-[20%] border-r p-2">Registration No</th><th className="w-[20%] p-2">Section</th></tr></thead><tbody>{students.map((student, index) => <tr key={student.id} className="odd:bg-white even:bg-slate-50"><td className="border p-2 text-center"><input type="checkbox" checked={selected.has(student.id)} onChange={() => toggle(student.id)} aria-label={`Select ${student.name}`} /></td><td className="border p-2">{index + 1}.</td><td className="border p-2">{student.name}</td><td className="border p-2">{student.rollNo}</td><td className="border p-2">{student.registrationNo}</td><td className="border p-2"><select disabled={!selected.has(student.id)} value={sections[student.id] || "A"} onChange={(e) => setSections({ ...sections, [student.id]: e.target.value })} className="h-8 w-full rounded-sm border border-slate-300 px-2"><option>A</option><option>B</option></select></td></tr>)}</tbody></table></div>
        <div className="mt-8 text-center"><button type="button" disabled={saving || !selected.size} onClick={() => void promote()} className="rounded bg-green-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? "Promoting..." : "Promote"}</button></div>
      </div>}
    </div>
  </section>;
}
