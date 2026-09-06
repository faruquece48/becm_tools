import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { mkdir, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { sections } from "./correct-2112029-cumulative.mjs";

const apply = process.argv.includes("--apply");
const norm = value => String(value || "").replace(/\s/g, "").toLowerCase();
const order = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 };
const rank = row => Number(row.examYear) * 100 + (order[row.academicYear] || 0) * 3 + (row.semester === "Odd" ? 0 : row.semester === "Even" ? 1 : 2);
const rounded = value => Number(value.toFixed(3));
const cgpa = (gp, credit) => (Math.round(((credit ? gp / credit : 0) + Number.EPSILON) * 100) / 100).toFixed(2);
const point = score => score >= 80 ? 4 : score >= 75 ? 3.75 : score >= 70 ? 3.5 : score >= 65 ? 3.25 : score >= 60 ? 3 : score >= 55 ? 2.75 : score >= 50 ? 2.5 : score >= 45 ? 2.25 : score >= 40 ? 2 : 0;
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

try {
  const rows = await prisma.$queryRawUnsafe('SELECT "section", "data" FROM "ResultSectionStore" WHERE "section"=ANY($1::text[])', sections);
  const original = Object.fromEntries(rows.map(row => [row.section, row.data]));
  for (const section of sections) if (!Array.isArray(original[section])) throw Error("Missing source section: " + section);

  const directoryById = new Map(original["student-directory"].map(student => [student.id, student]));
  const published = original["result-sheet"].filter(result => result.examYear === "2023" && result.academicYear === "2nd" && ["Odd", "Even"].includes(result.semester));
  if (published.length !== 2) throw Error(`Expected two published 2023/2nd results; found ${published.length}.`);
  const publishedIds = new Set(published.flatMap(result => result.students.map(student => student.studentId)));
  const is2021Series = student => String(student?.rollNo || "").replace(/\D/g, "").startsWith("21");
  const rolls = [...new Set([...publishedIds].map(id => directoryById.get(id)).filter(is2021Series).map(student => norm(student.rollNo)))].sort();
  if (!rolls.length) throw Error("No published 2021-series students found for 2023/2nd.");

  const data = structuredClone(original);
  const reports = [];
  const allCourses = data.syllabuses.flatMap(segment => segment.courses || []);
  const backlogPublication = data["result-sheet-backlog"].find(row => row.examYear === "2023" && row.academicYear === "2nd");
  if (!backlogPublication) throw Error("Published 2023/2nd backlog result is missing.");
  const backlogRows = data["prepare-result-backlog"].filter(row => row.examYear === "2023" && row.academicYear === "2nd");
  const backlogStudents = backlogPublication.students.flatMap(student => {
    const directory = directoryById.get(student.studentId);
    if (!is2021Series(directory)) return [];
    const matches = backlogRows.filter(row => row.studentId === student.studentId || norm(row.rollNo) === norm(directory.rollNo));
    const passed = matches.filter(row => row.result !== "Fail" && Number(row.marks) >= 40).map(row => {
      const course = allCourses.find(course => course.id === row.courseId) || allCourses.find(course => norm(course.code) === norm(row.courseCode) && course.semester === row.semester);
      if (!course) throw Error(`Missing syllabus course ${row.courseCode} for ${directory.rollNo}.`);
      return { credit: Number(course.credit || 0), gp: Number(course.credit || 0) * point(Number(row.marks)) };
    });
    const earnedCredit = rounded(passed.reduce((sum, row) => sum + row.credit, 0));
    const gradePoints = rounded(passed.reduce((sum, row) => sum + row.gp, 0));
    return [{ studentId: student.studentId, rollNo: directory.rollNo, earnedCredit, gradePoints, sgpa: cgpa(gradePoints, earnedCredit), failedSubjects: [...new Set(matches.filter(row => row.result === "Fail" || Number(row.marks) < 40).map(row => row.courseCode))], registerAgain: [] }];
  });
  const backlogArchive = data["marks-sheet-backlog"].find(row => row.examYear === "2023" && row.academicYear === "2nd");
  if (backlogArchive) {
    const targetIds = new Set(backlogStudents.map(row => row.studentId));
    backlogArchive.students = [...backlogArchive.students.filter(row => !targetIds.has(row.studentId) && !backlogStudents.some(target => norm(target.rollNo) === norm(row.rollNo))), ...backlogStudents];
    backlogArchive.updatedAt = new Date().toISOString();
  } else data["marks-sheet-backlog"].push({ examYear: "2023", academicYear: "2nd", semester: "", series: "2021", students: backlogStudents, updatedAt: new Date().toISOString() });
  const archives = [...data["marks-sheet"], ...data["marks-sheet-backlog"].map(row => ({ ...row, semester: "" }))];
  for (const result of data["result-sheet"].filter(row => row.examYear === "2023" && row.academicYear === "2nd" && ["Odd", "Even"].includes(row.semester))) {
    for (const student of result.students) {
      const directory = directoryById.get(student.studentId);
      if (!is2021Series(directory)) continue;
      const roll = norm(directory.rollNo), events = new Map();
      for (const archive of archives.filter(row => rank(row) <= rank(result))) {
        const matches = archive.students.filter(row => row.studentId === student.studentId || norm(row.rollNo) === roll);
        if (!matches.length) continue;
        const value = { credit: Number(matches[0].earnedCredit || 0), gp: Number(matches[0].gradePoints || 0) };
        if (matches.some(row => Number(row.earnedCredit || 0) !== value.credit || Number(row.gradePoints || 0) !== value.gp)) throw Error(`Conflicting archive rows for ${directory.rollNo}.`);
        const existing = events.get(rank(archive));
        if (existing && !isDeepStrictEqual(existing, value)) throw Error(`Conflicting examination archives for ${directory.rollNo}.`);
        events.set(rank(archive), value);
      }
      const unarchivedBacklog = new Map();
      for (const mark of data["prepare-result-backlog"].filter(row => (row.studentId === student.studentId || norm(row.rollNo) === roll) && rank({ ...row, semester: "" }) <= rank(result) && !events.has(rank({ ...row, semester: "" })) && row.result !== "Fail" && Number(row.marks) >= 40)) {
        const course = allCourses.find(course => course.id === mark.courseId) || allCourses.find(course => norm(course.code) === norm(mark.courseCode) && course.semester === mark.semester);
        if (!course) throw Error(`Missing syllabus course ${mark.courseCode} for ${directory.rollNo}.`);
        unarchivedBacklog.set(`${rank({ ...mark, semester: "" })}|${norm(mark.courseCode)}`, { credit: Number(course.credit || 0), gp: Number(course.credit || 0) * point(Number(mark.marks)) });
      }
      const cumulativeEvents = [...events.values(), ...unarchivedBacklog.values()];
      const credit = rounded(cumulativeEvents.reduce((sum, row) => sum + row.credit, 0));
      const gp = rounded(cumulativeEvents.reduce((sum, row) => sum + row.gp, 0));
      if (gp < 0 || credit < 0 || gp > credit * 4) throw Error(`Invalid cumulative totals for ${directory.rollNo}.`);
      const before = { totalEarnedCredit: student.totalEarnedCredit, totalGradePoints: student.totalGradePoints, cgpa: student.cgpa };
      const after = { totalEarnedCredit: credit, totalGradePoints: gp, cgpa: cgpa(gp, credit) };
      if (!isDeepStrictEqual(before, after)) { Object.assign(student, after); result.updatedAt = new Date().toISOString(); reports.push({ roll: directory.rollNo, semester: result.semester, before, after }); }
    }
  }
  const evenResult = data["result-sheet"].find(row => row.examYear === "2023" && row.academicYear === "2nd" && row.semester === "Even");
  for (const student of backlogPublication.students) {
    const directory = directoryById.get(student.studentId);
    if (!is2021Series(directory)) continue;
    const baseline = evenResult?.students.find(row => row.studentId === student.studentId);
    const backlog = backlogStudents.find(row => row.studentId === student.studentId);
    if (!baseline || !backlog) throw Error(`Missing Even or backlog totals for ${directory.rollNo}.`);
    const after = { totalEarnedCredit: rounded(Number(baseline.totalEarnedCredit || 0) + backlog.earnedCredit), totalGradePoints: rounded(Number(baseline.totalGradePoints || 0) + backlog.gradePoints) };
    const values = { ...after, cgpa: cgpa(after.totalGradePoints, after.totalEarnedCredit) };
    const before = { totalEarnedCredit: student.totalEarnedCredit, totalGradePoints: student.totalGradePoints, cgpa: student.cgpa };
    if (!isDeepStrictEqual(before, values)) { Object.assign(student, values); backlogPublication.updatedAt = new Date().toISOString(); reports.push({ roll: directory.rollNo, semester: "Backlog", before, after: values }); }
  }

  const changedSections = ["marks-sheet", "marks-sheet-backlog", "result-sheet", "result-sheet-backlog"].filter(section => !isDeepStrictEqual(original[section], data[section]));
  const changes = reports;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = `.next/2021-series-2023-second-year-correction/${stamp}`;
  await mkdir(backup, { recursive: true });
  await writeFile(`${backup}/backup.json`, JSON.stringify(original));
  await writeFile(`${backup}/report.json`, JSON.stringify({ rolls, changedSections, changes, reports }, null, 2));

  if (apply && changedSections.length) {
    await prisma.$transaction(async tx => {
      const locked = await tx.$queryRawUnsafe('SELECT "section", "data" FROM "ResultSectionStore" WHERE "section"=ANY($1::text[]) ORDER BY "section" FOR UPDATE', sections);
      for (const row of locked) if (!isDeepStrictEqual(row.data, original[row.section])) throw Error("Neon data changed during audit; rerun correction.");
      for (const section of changedSections) await tx.$executeRawUnsafe('UPDATE "ResultSectionStore" SET "data"=CAST($1 AS jsonb), "updatedAt"=NOW() WHERE "section"=$2', JSON.stringify(data[section]), section);
    }, { timeout: 30000 });
  }

  const savedRows = await prisma.$queryRawUnsafe('SELECT "section", "data" FROM "ResultSectionStore" WHERE "section"=ANY($1::text[])', sections);
  const saved = Object.fromEntries(savedRows.map(row => [row.section, row.data]));
  const expected = apply ? data : original;
  for (const section of sections) if (!isDeepStrictEqual(saved[section], expected[section])) throw Error("Read-back verification failed: " + section);

  const totals = published.map(result => ({
    semester: result.semester,
    students: data["result-sheet"].find(row => row.examYear === "2023" && row.academicYear === "2nd" && row.semester === result.semester).students
      .filter(student => rolls.includes(norm(directoryById.get(student.studentId)?.rollNo)))
      .map(student => ({ roll: directoryById.get(student.studentId)?.rollNo, credit: student.totalEarnedCredit, gp: student.totalGradePoints, cgpa: student.cgpa })),
  }));
  totals.push({ semester: "Backlog", students: backlogPublication.students.filter(student => is2021Series(directoryById.get(student.studentId))).map(student => ({ roll: directoryById.get(student.studentId)?.rollNo, credit: student.totalEarnedCredit, gp: student.totalGradePoints, cgpa: student.cgpa })) });
  console.log(JSON.stringify({ mode: apply ? "saved-and-verified" : "preview", rolls: rolls.length, backlogPublishedStudents: backlogPublication.students.length, reconstructedBacklogStudents: backlogStudents.length, changes: changes.length, changedSections, totals, backup }, null, 2));
} finally {
  await prisma.$disconnect();
}
