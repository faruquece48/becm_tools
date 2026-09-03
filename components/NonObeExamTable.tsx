"use client";

import { useEffect, useMemo, useState } from "react";
import SyncedHorizontalScroll from "@/components/SyncedHorizontalScroll";
import { oldStudentPromotionForExam, type OldStudentRecord } from "@/lib/storage/studentDirectory";
import { type SyllabusCourse, type SyllabusSegment } from "@/lib/storage/syllabuses";
import { loadResultSection } from "@/lib/storage/resultSections";
import { compareResultStudentRolls } from "@/lib/resultStudentOrder";

type Selection = { examYear: string; academicYear: string; semester: string };
type Mark = { studentId: string; present: boolean; withheld: boolean; partA: string; partB: string; classTestAttendance: string; sessional?: string; internal?: string; external?: string; thesisViva?: string };
type Prepared = { examYear: string; academicYear: string; semester: string; courseId: string; students: Mark[] };
type Eligibility = { examYear: string; academicYear: string; semester: string; courseId: string; students: Array<{ studentId: string; eligible: boolean }> };
type Viva = { examYear: string; academicYear: string; semester: string; students: Array<{ id: string; marks: string; present: boolean }> };

const numberValue = (value?: string) => Number(value) || 0;
const points: Record<string, number> = { "A+": 4, A: 3.75, "A-": 3.5, "B+": 3.25, B: 3, "B-": 2.75, "C+": 2.5, C: 2.25, D: 2, F: 0 };
function grade(score: number, mark: Mark | undefined, theory: boolean) {
  if (!mark) return "";
  if (mark.withheld) return "Withheld";
  if (!mark.present || (theory && numberValue(mark.partA) + numberValue(mark.partB) < 15)) return "F";
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

export default function NonObeExamTable({ selection }: { selection: Selection; title: string }) {
  const [students, setStudents] = useState<OldStudentRecord[]>([]);
  const [syllabuses, setSyllabuses] = useState<SyllabusSegment[]>([]);
  const [prepared, setPrepared] = useState<Prepared[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility[]>([]);
  const [vivas, setVivas] = useState<Viva[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/students/old", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/syllabuses", { cache: "no-store" }).then((response) => response.json()),
      loadResultSection<Prepared[]>("prepare-result"),
      fetch("/api/student-eligibility", { cache: "no-store" }).then((response) => response.json()),
      loadResultSection<Viva[]>("add-viva-marks"),
    ]).then(([studentBody, syllabusBody, preparedRows, eligibilityBody, vivaRows]) => {
      setStudents(studentBody.records || []);
      setSyllabuses(syllabusBody.syllabuses || []);
      setPrepared(preparedRows || []);
      setEligibility(eligibilityBody.records || []);
      setVivas(vivaRows || []);
    });
  }, []);

  const cohort = useMemo(() => students
    .filter((student) => Boolean(oldStudentPromotionForExam(student, selection.examYear, selection.academicYear, selection.semester, "Regular")))
    .sort((left, right) => compareResultStudentRolls(left.rollNo, right.rollNo, selection.examYear, selection.academicYear)), [students, selection]);
  const courseIds = new Set(cohort.flatMap((student) => oldStudentPromotionForExam(student, selection.examYear, selection.academicYear, selection.semester, "Regular")?.courseIds || []));
  const courses = syllabuses.flatMap((syllabus) => syllabus.courses).filter((course, index, all) => courseIds.has(course.id) && all.findIndex((candidate) => candidate.id === course.id) === index);
  const vivaCohort = vivas.find((row) => row.examYear === selection.examYear && row.academicYear === selection.academicYear && row.semester === selection.semester);
  const isFinalSemester = selection.academicYear === "4th" && selection.semester === "Even";

  function result(student: OldStudentRecord, course: SyllabusCourse) {
    const registered = Boolean(oldStudentPromotionForExam(student, selection.examYear, selection.academicYear, selection.semester, "Regular")?.courseIds.includes(course.id));
    const eligible = registered ? (eligibility.find((row) => row.examYear === selection.examYear && row.academicYear === selection.academicYear && row.semester === selection.semester && row.courseId === course.id)?.students.find((item) => item.studentId === student.id)?.eligible ?? true) : true;
    const mark = prepared.find((row) => row.examYear === selection.examYear && row.academicYear === selection.academicYear && row.semester === selection.semester && row.courseId === course.id)?.students.find((item) => item.studentId === student.id);
    const vivaStudent = vivaCohort?.students.find((item) => item.id === student.id);
    const viva = vivaStudent?.present ? numberValue(vivaStudent.marks) : 0;
    const theory = course.type === "Theory";
    const thesis = course.type === "Thesis";
    const total = mark ? Math.round(theory ? (mark.present ? numberValue(mark.partA) + numberValue(mark.partB) : 0) + numberValue(mark.classTestAttendance) : thesis ? numberValue(mark.internal) + numberValue(mark.external) + numberValue(mark.thesisViva) : numberValue(mark.sessional) + viva) : 0;
    const baseLetter = registered && eligible ? grade(total, mark, theory) : eligible ? "" : "-";
    const letter = course.type === "Sessional" && baseLetter && baseLetter !== "Withheld" && viva <= 0 ? "F" : baseLetter;
    const credit = registered && eligible && letter && letter !== "F" && letter !== "Withheld" ? numberValue(course.credit) : 0;
    return { registered, eligible, mark, total, letter, credit, quality: credit * (points[letter] || 0) };
  }

  if (!cohort.length) return null;
  return <div className="mt-10 pt-2">
    <div className="mb-2 text-left text-base font-bold">Non-OBE:</div>
    <SyncedHorizontalScroll><table className="min-w-max border-collapse text-sm">
      <thead className="bg-[#082f57] text-white"><tr><th rowSpan={2} className="border p-3">Roll No.</th>{courses.map((course) => <th key={course.id} colSpan={course.type === "Theory" ? 5 : 3} className="border p-3">{course.code}<br/>{course.credit}</th>)}<th rowSpan={2} className="border p-3">Viva</th><th rowSpan={2} className="border p-3">Earned<br/>Credit</th><th rowSpan={2} className="border p-3">SGPA</th><th colSpan={2} className="border p-3">Remarks</th></tr>
      <tr>{courses.flatMap((course) => (course.type === "Theory" ? ["A", "B", "CT", "T.", "Gr."] : ["Ses", "T.", "Gr."]).map((label) => <th key={`${course.id}-${label}`} className="border p-3">{label}</th>))}<th className="border p-3">{isFinalSemester ? "Status" : "Failed Subjects"}</th><th className="border p-3">Need to Register Again</th></tr></thead>
      <tbody>{cohort.map((student) => { const rows = courses.map((course) => ({ course, ...result(student, course) })); const earned = rows.reduce((sum, row) => sum + row.credit, 0); const quality = rows.reduce((sum, row) => sum + row.quality, 0); const failed = rows.filter((row) => row.registered && row.eligible && row.letter === "F").map((row) => row.course.code); const register = rows.filter((row) => !row.eligible).map((row) => row.course.code); const vivaStudent = vivaCohort?.students.find((item) => item.id === student.id); const viva = vivaStudent?.present ? vivaStudent.marks : ""; return <tr key={student.id} className="even:bg-slate-50"><td className="border p-2">{student.rollNo}</td>{rows.flatMap(({ course, registered, eligible, mark, total, letter }) => { const blank = !registered; return course.type === "Theory" ? [<td key={`${course.id}-a`} className="whitespace-nowrap border p-2 text-center">{blank ? "" : eligible ? mark?.partA || "" : "-"}</td>, <td key={`${course.id}-b`} className="whitespace-nowrap border p-2 text-center">{blank ? "" : eligible ? mark?.partB || "" : "-"}</td>, <td key={`${course.id}-ct`} className="whitespace-nowrap border p-2 text-center">{blank ? "" : eligible ? mark?.classTestAttendance || "" : "-"}</td>, <td key={`${course.id}-t`} className="whitespace-nowrap border p-2 text-center">{blank ? "" : eligible && mark ? total : "-"}</td>, <td key={`${course.id}-g`} className={`whitespace-nowrap border p-2 text-center ${letter === "F" ? "text-red-600" : ""}`}>{blank ? "" : letter}</td>] : [<td key={`${course.id}-s`} className="whitespace-nowrap border p-2 text-center">{blank ? "" : eligible ? mark?.sessional || "" : "-"}</td>, <td key={`${course.id}-t`} className="whitespace-nowrap border p-2 text-center">{blank ? "" : eligible && mark ? total : "-"}</td>, <td key={`${course.id}-g`} className={`whitespace-nowrap border p-2 text-center ${letter === "F" ? "text-red-600" : ""}`}>{blank ? "" : letter}</td>]; })}<td className="whitespace-nowrap border p-2 text-center">{viva}</td><td className="whitespace-nowrap border p-2 text-center">{earned.toFixed(2)}</td><td className="whitespace-nowrap border p-2 text-center">{earned ? (quality / earned).toFixed(2) : "0.00"}</td><td className="max-w-40 border p-2 text-left">{failed.join(", ")}</td><td className="max-w-40 border p-2 text-left font-semibold text-red-700">{register.join(", ")}</td></tr>; })}</tbody>
    </table></SyncedHorizontalScroll>
  </div>;
}
