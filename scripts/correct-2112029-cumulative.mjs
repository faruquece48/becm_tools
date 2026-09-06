// Preview: node --env-file=.env.local scripts/correct-2112029-cumulative.mjs
// Save:    node --env-file=.env.local scripts/correct-2112029-cumulative.mjs --apply
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { mkdir, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";

export const sections = ["student-directory", "syllabuses", "student-eligibility", "prepare-result", "add-viva-marks", "marks-sheet", "marks-sheet-backlog", "prepare-result-backlog", "result-sheet", "result-sheet-backlog"];
const norm = value => String(value || "").replace(/\s/g, "").toLowerCase();
const rank = row => Number(row.examYear) * 100 + ({ "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 }[row.academicYear] || 0) * 3 + (row.semester === "Odd" ? 0 : row.semester === "Even" ? 1 : 2);
const exam = row => [row.examYear, row.academicYear, row.semester || "Backlog"].join("/");
const fixed = value => Number(value.toFixed(3));
const gpa = (gp, credit) => (Math.round(((credit ? gp / credit : 0) + Number.EPSILON) * 100) / 100).toFixed(2);
const points = score => score >= 80 ? 4 : score >= 75 ? 3.75 : score >= 70 ? 3.5 : score >= 65 ? 3.25 : score >= 60 ? 3 : score >= 55 ? 2.75 : score >= 50 ? 2.5 : score >= 45 ? 2.25 : score >= 40 ? 2 : 0;

export function correctTotals(original, { roll = "2112029", examYear = "2022", academicYear = "1st", semester = "Odd" } = {}) {
  if (!/^\d{7}$/.test(roll) || !/^\d{4}$/.test(examYear)) throw Error("Invalid roll or exam year.");
  for (const section of sections) if (!Array.isArray(original[section])) throw Error("Missing source section: " + section);
  const data = structuredClone(original);
  const ids = new Set(data["student-directory"].filter(row => norm(row.rollNo) === roll).map(row => row.id));
  for (const archive of [...data["marks-sheet"], ...data["marks-sheet-backlog"]]) for (const row of archive.students) if (norm(row.rollNo) === roll) ids.add(row.studentId);
  if (!ids.size) throw Error("Roll " + roll + " not found.");
  const same = row => ids.has(row.studentId || row.id) || norm(row.rollNo) === roll;
  const selection = { examYear, academicYear, semester };
  const sameExam = row => exam(row) === exam(selection);
  const sourceArchives = data["marks-sheet"].filter(sameExam);
  if (sourceArchives.length !== 1 || !sourceArchives[0].students.some(same)) throw Error("Expected one " + exam(selection) + " archive for " + roll);
  const series = Number(examYear) - ({ "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 }[academicYear] || 1);
  const syllabus = data.syllabuses.filter(row => row.active !== false && Number(row.fromSeries) <= series && Number(row.toSeries) >= series);
  const courses = [...new Map(syllabus.flatMap(row => row.courses).filter(row => row.year === academicYear && row.semester === semester).map(row => [row.id, row])).values()];
  if (!courses.length) throw Error("Syllabus missing for " + exam(selection));
  if (courses.some(course => course.type === "Thesis")) throw Error("This correction supports theory and sessional courses only.");
  const viva = data["add-viva-marks"].find(row => sameExam(row) && (row.examType || "Regular") === "Regular")?.students.find(same);
  const courseResults = courses.map(course => {
    const eligible = data["student-eligibility"].filter(row => sameExam(row) && row.courseId === course.id).flatMap(row => row.students).filter(same);
    if (eligible.some(row => row.eligible === false) && eligible.some(row => row.eligible === true)) throw Error("Conflicting eligibility: " + course.code);
    if (eligible.some(row => row.eligible === false)) return { course: course.code, credit: Number(course.credit), gp: 0, status: "register" };
    const marks = data["prepare-result"].filter(row => sameExam(row) && row.courseId === course.id).flatMap(row => row.students).filter(same);
    if (!marks.length) throw Error("Missing marks: " + course.code);
    const mark = marks[0], fields = ["partA", "partB", "classTestAttendance", "sessional", "present", "withheld"];
    if (marks.some(row => fields.some(field => row[field] !== mark[field]))) throw Error("Conflicting marks: " + course.code);
    if (mark.withheld) throw Error("Cannot recalculate withheld course: " + course.code);
    const n = value => { if (value === "" || value == null || !Number.isFinite(Number(value))) throw Error("Missing or invalid mark: " + course.code); return Number(value); };
    const theory = course.type === "Theory", vivaScore = viva?.present ? n(viva.marks) : 0;
    const total = Math.round(theory ? (mark.present ? n(mark.partA) + n(mark.partB) : 0) + n(mark.classTestAttendance) : n(mark.sessional) + vivaScore);
    const gp = !mark.present || (theory && n(mark.partA) + n(mark.partB) < 15) || (!theory && vivaScore <= 0) ? 0 : points(total);
    return { course: course.code, credit: Number(course.credit), total, gp, status: gp ? "passed" : "failed" };
  });
  const earnedCredit = fixed(courseResults.filter(row => row.status === "passed").reduce((sum, row) => sum + row.credit, 0));
  const gradePoints = fixed(courseResults.reduce((sum, row) => sum + row.credit * row.gp, 0));
  const semesterTotals = { earnedCredit, gradePoints, sgpa: gpa(gradePoints, earnedCredit), failedSubjects: courseResults.filter(row => row.status === "failed").map(row => row.course), registerAgain: courseResults.filter(row => row.status === "register").map(row => row.course) };
  const changes = [], timestamp = new Date().toISOString();
  function update(section, record, student, values) {
    const before = Object.fromEntries(Object.keys(values).map(key => [key, student[key]]));
    if (isDeepStrictEqual(before, values)) return;
    changes.push({ section, exam: exam(record), before, after: values });
    Object.assign(student, values); record.updatedAt = timestamp;
  }
  for (const student of sourceArchives[0].students.filter(same)) update("marks-sheet", sourceArchives[0], student, semesterTotals);
  const archives = [...data["marks-sheet"], ...data["marks-sheet-backlog"].map(row => ({ ...row, semester: "" }))];
  const allCourses = data.syllabuses.flatMap(row => row.courses);
  function cumulative(selection) {
    const events = new Map();
    for (const archive of archives.filter(row => rank(row) <= rank(selection))) {
      for (const student of archive.students.filter(same)) {
        const value = { credit: Number(student.earnedCredit), gp: Number(student.gradePoints) };
        if (events.has(rank(archive)) && !isDeepStrictEqual(events.get(rank(archive)), value)) throw Error("Conflicting duplicate archive: " + exam(archive));
        events.set(rank(archive), value);
      }
    }
    const backlog = new Map();
    for (const mark of data["prepare-result-backlog"].filter(same)) {
      const event = { ...mark, semester: "" };
      if (rank(event) > rank(selection) || events.has(rank(event)) || mark.result === "Fail" || Number(mark.marks) < 40) continue;
      const course = allCourses.find(row => row.id === mark.courseId) || allCourses.find(row => norm(row.code) === norm(mark.courseCode) && row.semester === mark.semester);
      if (!course) throw Error("Missing backlog course: " + mark.courseCode);
      const value = { credit: Number(course.credit), gp: Number(course.credit) * points(Number(mark.marks)) }, key = rank(event) + "|" + norm(mark.courseCode);
      if (backlog.has(key) && !isDeepStrictEqual(backlog.get(key), value)) throw Error("Conflicting duplicate backlog marks.");
      backlog.set(key, value);
    }
    const values = [...events.values(), ...backlog.values()];
    const totalEarnedCredit = fixed(values.reduce((sum, row) => sum + row.credit, 0)), totalGradePoints = fixed(values.reduce((sum, row) => sum + row.gp, 0));
    if (!Number.isFinite(totalGradePoints) || !Number.isFinite(totalEarnedCredit) || totalGradePoints < 0 || totalGradePoints > totalEarnedCredit * 4) throw Error("Invalid cumulative totals.");
    return { totalEarnedCredit, totalGradePoints, cgpa: gpa(totalGradePoints, totalEarnedCredit) };
  }
  for (const section of ["result-sheet", "result-sheet-backlog"]) for (const result of data[section]) {
    const event = { ...result, semester: section.endsWith("backlog") ? "" : result.semester };
    if (rank(event) < rank(selection) || !result.students.some(same)) continue;
    if (!archives.some(archive => rank(archive) === rank(event) && archive.students.some(same))) throw Error("Missing archive for saved result: " + exam(event));
    for (const student of result.students.filter(same)) update(section, result, student, cumulative(event));
  }
  const totals = archives.filter(row => row.students.some(same) && rank(row) >= rank(selection)).sort((a, b) => rank(a) - rank(b)).map(row => ({ exam: exam(row), ...cumulative(row), savedResultExists: [...data["result-sheet"], ...data["result-sheet-backlog"]].some(result => rank(result) === rank(row) && result.students.some(same)) }));
  return { data, report: { roll, sourceExam: exam(selection), courseResults, semesterTotals, totals, changes } };
}

async function main() {
  const options = { roll: process.argv.find(value => value.startsWith("--roll="))?.slice(7) || "2112029", examYear: process.argv.find(value => value.startsWith("--exam-year="))?.slice(12) || "2022" };
  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
  try {
    const rows = await prisma.$queryRawUnsafe('SELECT "section", "data" FROM "ResultSectionStore" WHERE "section"=ANY($1::text[])', sections);
    const original = Object.fromEntries(rows.map(row => [row.section, row.data]));
    if (process.argv.includes("--inspect")) {
      const directory = original["student-directory"].filter(row => norm(row.rollNo) === options.roll);
      const ids = new Set(directory.map(row => row.id));
      const same = row => ids.has(row.studentId || row.id) || norm(row.rollNo) === options.roll;
      console.log(JSON.stringify({ directory: directory.map(row => ({ id: row.id, rollNo: row.rollNo, series: row.series })), records: Object.fromEntries(["marks-sheet", "marks-sheet-backlog", "result-sheet", "result-sheet-backlog", "prepare-result"].map(section => [section, original[section].map(row => ({ exam: exam(row), series: row.series, course: row.courseCode, students: row.students.filter(same) })).filter(row => row.students.length)])), sourceArchives: original["marks-sheet"].filter(row => row.academicYear === "1st" && row.semester === "Odd").map(row => ({ exam: exam(row), series: row.series, count: row.students.length })) }, null, 2));
      return;
    }
    const { data, report } = correctTotals(original, options);
    const backup = ".next/" + options.roll + "-correction/" + new Date().toISOString().replace(/[:.]/g, "-");
    await mkdir(backup, { recursive: true });
    await writeFile(backup + "/backup.json", JSON.stringify(original));
    const apply = process.argv.includes("--apply");
    if (apply) {
      await prisma.$transaction(async tx => {
        const locked = await tx.$queryRawUnsafe('SELECT "section", "data" FROM "ResultSectionStore" WHERE "section"=ANY($1::text[]) ORDER BY "section" FOR UPDATE', sections);
        for (const row of locked) if (!isDeepStrictEqual(row.data, original[row.section])) throw Error("Source changed; rerun correction.");
        for (const section of ["marks-sheet", "result-sheet", "result-sheet-backlog"]) if (!isDeepStrictEqual(original[section], data[section])) {
          await tx.$executeRawUnsafe('UPDATE "ResultSectionStore" SET "data"=CAST($1 AS jsonb), "updatedAt"=NOW() WHERE "section"=$2', JSON.stringify(data[section]), section);
        }
      }, { timeout: 30000 });
      const saved = await prisma.$queryRawUnsafe('SELECT "section", "data" FROM "ResultSectionStore" WHERE "section"=ANY($1::text[])', sections);
      const verified = Object.fromEntries(saved.map(row => [row.section, row.data]));
      for (const section of sections) if (!isDeepStrictEqual(verified[section], data[section])) throw Error("Read-back differs: " + section);
      if (correctTotals(verified, options).report.changes.length) throw Error("Correction is not idempotent.");
    }
    await writeFile(backup + "/report.json", JSON.stringify(report, null, 2));
    await writeFile("scripts/" + options.roll + "-latest-correction.json", JSON.stringify({ ...report, verifiedInNeon: apply, checkedAt: new Date().toISOString() }, null, 2));
    console.log(JSON.stringify({ mode: apply ? "saved-and-verified" : "preview", ...report, backup }, null, 2));
  } finally { await prisma.$disconnect(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
