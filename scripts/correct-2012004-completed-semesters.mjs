import fs from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
const names = ["student-directory", "marks-sheet", "result-sheet", "result-sheet-backlog", "syllabuses"];
const load = async section => (await prisma.$queryRawUnsafe('SELECT "data" FROM "ResultSectionStore" WHERE "section"=$1', section))[0]?.data || [];
const norm = value => String(value || "").replace(/\s/g, "").toLowerCase();
try {
  const loaded = await Promise.all(names.map(load)), data = Object.fromEntries(names.map((name, index) => [name, loaded[index]])), original = structuredClone(data);
  const student = data["student-directory"].find(row => norm(row.rollNo) === "2012004");
  if (!student) throw Error("Student 2012004 was not found");
  const completed = data["marks-sheet"].filter(archive => archive.academicYear === "1st" && archive.semester === "Odd" && archive.students?.some(row => (row.studentId === student.id || norm(row.rollNo) === "2012004") && !(row.failedSubjects || []).length && !(row.registerAgain || []).length));
  const completedKeys = new Set(completed.map(row => `${row.academicYear}|${row.semester}`));
  const clearedCodes = new Set(data.syllabuses.filter(segment => segment.active !== false && Number(student.series) >= Number(segment.fromSeries) && Number(student.series) <= Number(segment.toSeries)).flatMap(segment => segment.courses || []).filter(course => completedKeys.has(`${course.year}|${course.semester}`)).map(course => norm(course.code)));
  student.obeBatchPlacements = (student.obeBatchPlacements || []).map(placement => ({ ...placement, missedSemesters: (placement.missedSemesters || []).filter(item => !completedKeys.has(`${item.academicYear}|${item.semester}`)) }));
  for (const section of ["result-sheet", "result-sheet-backlog"]) for (const result of data[section]) result.students = (result.students || []).map(row => row.studentId === student.id || norm(row.rollNo) === "2012004" ? { ...row, registerAgain: (row.registerAgain || []).filter(code => !clearedCodes.has(norm(code))), failedSubjects: (row.failedSubjects || []).filter(code => !clearedCodes.has(norm(code))) } : row);
  const changedSections = names.filter(name => !isDeepStrictEqual(original[name], data[name]));
  console.log(JSON.stringify({ rollNo: student.rollNo, completedSemesters: [...completedKeys], clearedCourseCodes: [...clearedCodes], changedSections }, null, 2));
  if (process.argv.includes("--apply") && changedSections.length) {
    fs.writeFileSync("scripts/2012004-completed-semesters-backup.json", JSON.stringify({ createdAt: new Date().toISOString(), sections: Object.fromEntries(changedSections.map(name => [name, original[name]])) }, null, 2));
    const write = section => prisma.$executeRawUnsafe('UPDATE "ResultSectionStore" SET "data"=CAST($1 AS jsonb),"updatedAt"=NOW() WHERE "section"=$2', JSON.stringify(data[section]), section);
    await prisma.$transaction(changedSections.map(write));
    console.log("Updated Neon and saved scripts/2012004-completed-semesters-backup.json");
  }
} finally { await prisma.$disconnect(); }
