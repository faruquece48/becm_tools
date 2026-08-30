"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { academicYears, departmentName, semesters, type StudentDirectoryRecord } from "@/lib/storage/studentDirectory";
import { cohortSeries, type CourseEligibility } from "@/lib/storage/studentEligibility";
import { loadResultSection } from "@/lib/storage/resultSections";
import type { VivaCohort } from "@/lib/storage/vivaMarks";
import SyncedHorizontalScroll from "@/components/SyncedHorizontalScroll";

type PreparedMark = { studentId: string; present: boolean; withheld: boolean; partA: string; partB: string; classTestAttendance: string; sessional?: string; remarks: string };
type PreparedResult = { examYear: string; academicYear: string; semester: string; courseId: string; courseCode: string; courseTitle: string; courseType?: "Theory" | "Sessional" | "Thesis"; students: PreparedMark[]; published?: boolean };
type Course = { id: string; code: string; title: string };
type Props = { title: string };

const numeric = (value: string) => Number(value) || 0;
function resultGrade(mark: PreparedMark | undefined, score: number | null, sessional: boolean) {
  if (!mark || score === null) return "";
  if (mark.withheld) return "Withheld";
  if (!mark.present || (!sessional && numeric(mark.partA) + numeric(mark.partB) < 15)) return "F";
  if (score >= 80) return "A+";
  if (score >= 75) return "A";
  if (score >= 70) return "A-";
  if (score >= 65) return "B+";
  if (score >= 60) return "B";
  if (score >= 55) return "B-";
  if (score >= 50) return "C+";
  if (score >= 45) return "C";
  if (score >= 40) return "D";
  return "F";
}

export default function AcademicResultSheet({ title }: Props) {
  const currentYear = String(new Date().getFullYear());
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [eligibility, setEligibility] = useState<CourseEligibility[]>([]);
  const [prepared, setPrepared] = useState<PreparedResult[]>([]);
  const [vivaCohorts, setVivaCohorts] = useState<VivaCohort[]>([]);
  const [selection, setSelection] = useState({ examYear: currentYear, academicYear: "1st", semester: "Even" });
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("");
  const series = cohortSeries(selection.examYear, selection.academicYear);
  const field = "h-10 w-full rounded border border-slate-300 bg-white px-3";
  const years = Array.from({ length: Math.max(1, Number(currentYear) - 2018 + 1) }, (_, index) => String(Number(currentYear) - index));

  useEffect(() => {
    Promise.all([
      fetch("/api/students/directory", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/student-eligibility", { cache: "no-store" }).then((response) => response.json()),
      loadResultSection<PreparedResult[]>("prepare-result"),
      loadResultSection<VivaCohort[]>("add-viva-marks"),
    ]).then(([studentBody, eligibilityBody, resultRows, vivaRows]) => {
      setStudents(studentBody.records || []);
      setEligibility(eligibilityBody.records || []);
      setPrepared(Array.isArray(resultRows) ? resultRows : []);
      setVivaCohorts(Array.isArray(vivaRows) ? vivaRows : []);
    }).catch(() => setMessage("Unable to load result data from Neon."));
  }, []);

  const courses = useMemo<Course[]>(() => {
    const map = new Map<string, Course>();
    eligibility.filter((row) => row.examYear === selection.examYear && row.academicYear === selection.academicYear && row.semester === selection.semester)
      .forEach((row) => map.set(row.courseId, { id: row.courseId, code: row.courseCode, title: row.courseTitle }));
    prepared.filter((row) => row.examYear === selection.examYear && row.academicYear === selection.academicYear && row.semester === selection.semester)
      .forEach((row) => map.set(row.courseId, { id: row.courseId, code: row.courseCode, title: row.courseTitle }));
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [eligibility, prepared, selection]);

  const cohort = useMemo(() => students.filter((student) => Number(student.series) <= Number(series) && student.year === selection.academicYear && student.semester === selection.semester)
    .sort((a, b) => (a.series === series ? 0 : 1) - (b.series === series ? 0 : 1) || a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })), [students, series, selection]);

  const rows = courses.flatMap((course) => cohort.map((student) => {
    const attendance = eligibility.find((row) => row.examYear === selection.examYear && row.academicYear === selection.academicYear && row.semester === selection.semester && row.courseId === course.id);
    const eligible = attendance?.students.find((item) => item.studentId === student.id)?.eligible ?? true;
    const preparedCourse = prepared.find((row) => row.examYear === selection.examYear && row.academicYear === selection.academicYear && row.semester === selection.semester && row.courseId === course.id);
    const mark = preparedCourse?.students.find((item) => item.studentId === student.id);
    const sessional = preparedCourse?.courseType === "Sessional" || Boolean(mark?.sessional);
    const vivaCohort = vivaCohorts.find((row) => row.examYear === selection.examYear && row.academicYear === selection.academicYear && row.semester === selection.semester);
    const vivaStudent = vivaCohort?.students.find((item) => item.id === student.id);
    const viva = vivaStudent?.present ? numeric(vivaStudent.marks) : 0;
    const total = mark ? Math.round(sessional ? numeric(mark.sessional || "") + viva : (mark.present ? numeric(mark.partA) + numeric(mark.partB) : 0) + numeric(mark.classTestAttendance)) : null;
    return { student, course, eligible, mark, total, sessional };
  }));

  function search() {
    setSearched(true);
    setMessage(courses.length ? "" : "No course or eligibility records found for this examination.");
  }

  return <section className="min-h-screen bg-[#f7f9fd] p-2 sm:p-4">
    <div className="border-t border-[#082f57] bg-white">
      <div className="border-b border-[#082f57] p-4 text-center"><h1 className="text-2xl font-bold">{title}</h1></div>
      <div className="grid gap-4 border-b border-[#082f57] p-5 md:grid-cols-2">
        <label className="grid items-center gap-2 sm:grid-cols-[180px_1fr]">Department<select disabled className={field}><option>{departmentName}</option></select></label>
        <label className="grid items-center gap-2 sm:grid-cols-[180px_1fr]">Exam Year<select value={selection.examYear} onChange={(event) => { setSelection({ ...selection, examYear: event.target.value }); setSearched(false); }} className={field}>{years.map((year) => <option key={year}>{year}</option>)}</select></label>
        <label className="grid items-center gap-2 sm:grid-cols-[180px_1fr]">Academic Year<select value={selection.academicYear} onChange={(event) => { setSelection({ ...selection, academicYear: event.target.value }); setSearched(false); }} className={field}>{academicYears.map((year) => <option key={year}>{year}</option>)}</select></label>
        <label className="grid items-center gap-2 sm:grid-cols-[180px_1fr]">Semester<select value={selection.semester} onChange={(event) => { setSelection({ ...selection, semester: event.target.value }); setSearched(false); }} className={field}>{semesters.map((semester) => <option key={semester}>{semester}</option>)}</select></label>
        <button onClick={search} className="w-fit rounded bg-green-600 px-4 py-2 text-white"><Search className="mr-1 inline h-4 w-4"/>Search Results</button>
      </div>
      {message && <p className="m-4 rounded bg-red-50 p-3 text-red-700">{message}</p>}
      {searched && courses.length > 0 && <div className="p-3">
        <div className="mb-3 rounded bg-amber-50 p-3 text-sm text-amber-900">Students below 50% attendance receive grade <strong>-</strong> and must register for that course again.</div>
        <SyncedHorizontalScroll><table className="w-full border-collapse text-sm">
          <thead className="bg-[#082f57] text-white"><tr>{["Sl.", "Student", "Roll No", "Registration No", "Course", "Total", "Grade", "Status"].map((heading) => <th key={heading} className="border p-3">{heading}</th>)}</tr></thead>
          <tbody>{rows.map(({ student, course, eligible, mark, total, sessional }, index) => <tr key={`${student.id}-${course.id}`} className="even:bg-slate-50">
            <td className="border p-2 text-center">{index + 1}</td><td className="border p-2">{student.name}</td><td className="border p-2">{student.rollNo}</td><td className="border p-2">{student.registrationNo}</td><td className="border p-2"><span className="font-semibold">{course.code}</span><br/><span className="text-slate-600">{course.title}</span></td>
            <td className="border p-2 text-center">{eligible ? (total ?? "") : "-"}</td><td className="border p-2 text-center font-bold">{eligible ? resultGrade(mark, total, sessional) : "-"}</td><td className={`border p-2 ${eligible ? "" : "font-semibold text-red-700"}`}>{eligible ? (mark ? "Result prepared" : "Result not prepared") : "Need to register again for this course"}</td>
          </tr>)}</tbody>
        </table></SyncedHorizontalScroll>
      </div>}
    </div>
  </section>;
}