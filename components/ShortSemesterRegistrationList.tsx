"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Search } from "lucide-react";

type Course = { courseCode: string; courseTitle: string; semester: "Odd" | "Even" };
type Candidate = { studentId: string; studentName: string; rollNo: string; registrationNo: string; examYear: string; courses: Course[] };
type Registration = Candidate & { confirmedAt: string };

const currentYear = String(new Date().getFullYear());
const courseKey = (studentId: string, courseCode: string) => `${studentId}|${courseCode.replace(/\s/g, "").toLowerCase()}`;

export default function ShortSemesterRegistrationList() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [examYear, setExamYear] = useState(currentYear);
  const [shown, setShown] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/short-semester-registrations", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load short semester registrations");
        setCandidates(body.candidates || []);
        setRegistrations(body.registrations || []);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Unable to load short semester registrations");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const years = useMemo(() => [...new Set([
    ...Array.from({ length: Math.max(1, Number(currentYear) - 2019 + 1) }, (_, index) => String(Number(currentYear) - index)),
    ...candidates.map((candidate) => candidate.examYear),
    ...registrations.map((registration) => registration.examYear),
  ])].sort((left, right) => Number(right) - Number(left)), [candidates, registrations]);

  const showStudents = () => {
    const list = candidates.filter((candidate) => candidate.examYear === examYear);
    const saved = registrations.filter((registration) => registration.examYear === examYear);
    setShown(list);
    setSelected(new Set(saved.flatMap((registration) => registration.courses.map((course) => courseKey(registration.studentId, course.courseCode)))));
    setMessage(list.length ? "" : "No eligible students were found. A published 4th Year Backlog result with failed subjects is required.");
  };

  const toggle = (studentId: string, courseCode: string) => {
    const key = courseKey(studentId, courseCode);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const confirm = async () => {
    setSaving(true);
    setMessage("");
    try {
      const selections = shown.map((student) => ({
        studentId: student.studentId,
        courseCodes: student.courses
          .filter((course) => selected.has(courseKey(student.studentId, course.courseCode)))
          .map((course) => course.courseCode),
      }));
      const response = await fetch("/api/short-semester-registrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examYear, selections }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to confirm short semester registration");
      setRegistrations(body.registrations || []);
      setMessage("Short semester registrations confirmed successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to confirm short semester registration");
    } finally {
      setSaving(false);
    }
  };

  const field = "h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm";

  return (
    <section className="min-h-screen bg-[#f7f9fd] p-4">
      <div className="border-t border-[#082f57] bg-white shadow-sm">
        <header className="border-b border-[#082f57] p-4 text-center">
          <h1 className="text-2xl font-bold">Short Semester Registration</h1>
          <p className="mt-1 text-sm text-slate-500">Register failed courses after the published 4th Year Backlog result.</p>
        </header>
        <div className="border-b border-[#082f57] p-5">
          <label className="mx-auto grid max-w-xl gap-2 font-semibold">
            Exam Year
            <select className={field} value={examYear} onChange={(event) => { setExamYear(event.target.value); setShown([]); }}>
              {years.map((year) => <option key={year}>{year}</option>)}
            </select>
          </label>
          <button disabled={loading} onClick={showStudents} className="mx-auto mt-4 block rounded bg-green-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
            <Search className="mr-2 inline h-4 w-4" />{loading ? "Loading..." : "Show Eligible Students"}
          </button>
        </div>
        {message && <p className={`m-5 rounded p-3 font-semibold ${message.includes("successfully") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message}</p>}
        {shown.length > 0 && (
          <div className="p-5">
            <div className="space-y-4">
              {shown.map((student, index) => (
                <article key={student.studentId} className="overflow-hidden rounded border">
                  <div className="flex flex-wrap gap-x-8 gap-y-1 bg-[#082f57] p-3 text-white">
                    <strong>{index + 1}. {student.studentName}</strong>
                    <span>Roll: {student.rollNo}</span>
                    <span>Registration: {student.registrationNo}</span>
                  </div>
                  <div className="grid gap-2 p-4 md:grid-cols-2">
                    {student.courses.map((course) => (
                      <label key={courseKey(student.studentId, course.courseCode)} className="flex items-start gap-3 rounded border p-3">
                        <input type="checkbox" checked={selected.has(courseKey(student.studentId, course.courseCode))} onChange={() => toggle(student.studentId, course.courseCode)} className="mt-1 h-4 w-4" />
                        <span><strong>{course.courseCode}</strong> - {course.courseTitle}<small className="ml-2 rounded bg-slate-100 px-2 py-0.5">{course.semester}</small></span>
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-5 text-center">
              <button disabled={saving} onClick={() => void confirm()} className="rounded bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">
                <CheckCircle2 className="mr-2 inline h-4 w-4" />{saving ? "Confirming..." : "Confirm Selected Courses"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
