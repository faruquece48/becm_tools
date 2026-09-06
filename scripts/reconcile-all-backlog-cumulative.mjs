import fs from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
const sections = ["student-directory", "marks-sheet", "marks-sheet-backlog", "prepare-result-backlog", "result-sheet", "result-sheet-backlog"];
const load = async section => (await prisma.$queryRawUnsafe('SELECT "data" FROM "ResultSectionStore" WHERE "section"=$1', section))[0]?.data || [];
const norm = value => String(value || "").replace(/\s/g, "").toLowerCase();
const order = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 };
const rank = row => Number(row.examYear) * 100 + (order[row.academicYear] || 0) * 3 + (row.semester === "Odd" ? 0 : row.semester === "Even" ? 1 : 2);
const fixed = value => Number(Number(value || 0).toFixed(3));
const cgpa = (gp, credit) => (Math.round((((credit ? gp / credit : 0) + Number.EPSILON) * 100)) / 100).toFixed(2);

try {
  const values = await Promise.all(sections.map(load)), data = Object.fromEntries(sections.map((section, index) => [section, values[index]])), original = structuredClone(data);
  const rollById = new Map(data["student-directory"].map(student => [student.id, norm(student.rollNo)]));
  for (const archive of [...data["marks-sheet"], ...data["marks-sheet-backlog"]]) for (const student of archive.students || []) if (student.rollNo) rollById.set(student.studentId, norm(student.rollNo));
  const identity = student => rollById.get(student.studentId) || norm(student.rollNo) || `id:${student.studentId}`;
  const passedBacklogs = data["prepare-result-backlog"].filter(mark => mark.result !== "Fail" && Number(mark.marks) >= 40);
  const affected = new Set(passedBacklogs.map(identity));
  const archives = [...data["marks-sheet"], ...data["marks-sheet-backlog"]];
  const changes = [];
  for (const section of ["result-sheet", "result-sheet-backlog"]) for (const result of data[section]) {
    const resultRank = rank(result);
    result.students = (result.students || []).map(student => {
      const key = identity(student);
      if (!affected.has(key)) return student;
      const rows = archives.filter(archive => rank(archive) <= resultRank).flatMap(archive => {
        const match = (archive.students || []).find(candidate => identity(candidate) === key);
        return match ? [match] : [];
      });
      const archivedCredit = fixed(rows.reduce((sum, row) => sum + Number(row.earnedCredit || 0), 0));
      const archivedGp = fixed(rows.reduce((sum, row) => sum + Number(row.gradePoints || 0), 0));
      // Preserve earlier manual corrections; this reconciliation only fills totals
      // that are demonstrably missing from the complete approved archive sequence.
      const totalEarnedCredit = Math.max(Number(student.totalEarnedCredit || 0), archivedCredit);
      const totalGradePoints = Math.max(Number(student.totalGradePoints || 0), archivedGp);
      const cleared = new Set(passedBacklogs.filter(mark => identity(mark) === key && rank({ ...mark, semester: "" }) <= resultRank).map(mark => norm(mark.courseCode)));
      const updated = { ...student, totalEarnedCredit, totalGradePoints, cgpa: cgpa(totalGradePoints, totalEarnedCredit), failedSubjects: (student.failedSubjects || []).filter(code => !cleared.has(norm(code))), registerAgain: (student.registerAgain || []).filter(code => !cleared.has(norm(code))) };
      if (!isDeepStrictEqual(student, updated)) changes.push({ section, exam: `${result.examYear} ${result.academicYear} ${result.semester || "Backlog"}`, studentId: student.studentId, rollNo: rollById.get(student.studentId) || student.rollNo || "", before: { credit: student.totalEarnedCredit, gp: student.totalGradePoints, cgpa: student.cgpa }, after: { credit: updated.totalEarnedCredit, gp: updated.totalGradePoints, cgpa: updated.cgpa } });
      return updated;
    });
  }
  console.log(JSON.stringify({ affectedBacklogStudents: affected.size, changes }, null, 2));
  if (process.argv.includes("--apply") && changes.length) {
    fs.writeFileSync("scripts/backlog-cumulative-backup.json", JSON.stringify({ createdAt: new Date().toISOString(), resultSheet: original["result-sheet"], backlogResultSheet: original["result-sheet-backlog"] }, null, 2));
    const write = section => prisma.$executeRawUnsafe('INSERT INTO "ResultSectionStore"("section","data","updatedAt") VALUES($1,CAST($2 AS jsonb),NOW()) ON CONFLICT("section") DO UPDATE SET "data"=EXCLUDED."data","updatedAt"=NOW()', section, JSON.stringify(data[section]));
    await prisma.$transaction([write("result-sheet"), write("result-sheet-backlog")]);
    console.log("Updated cumulative result archives and saved scripts/backlog-cumulative-backup.json");
  }
} finally {
  await prisma.$disconnect();
}
