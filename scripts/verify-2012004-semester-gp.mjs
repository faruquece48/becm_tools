// Recalculate three semesters from course marks, previewing by default.
// node --env-file=.env.local scripts/verify-2012004-semester-gp.mjs --apply
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { mkdir, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { correctTotals, sections } from "./correct-2112029-cumulative.mjs";

const selections = [
  { roll: "2012004", examYear: "2022", academicYear: "1st", semester: "Odd", expected: "67.50" },
  { roll: "2012004", examYear: "2022", academicYear: "1st", semester: "Even", expected: "67.13" },
  { roll: "2012004", examYear: "2023", academicYear: "2nd", semester: "Odd", expected: "58.13" },
];
const roundTwo = value => (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
const p = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
try {
  const rows = await p.$queryRawUnsafe('SELECT "section", "data" FROM "ResultSectionStore" WHERE "section"=ANY($1::text[])', sections);
  const original = Object.fromEntries(rows.map(row => [row.section, row.data]));
  let data = original;
  const semesters = [], changes = [];
  for (const selection of selections) {
    const correction = correctTotals(data, selection);
    data = correction.data;
    const { sourceExam, courseResults, semesterTotals } = correction.report;
    const displayedGp = roundTwo(semesterTotals.gradePoints);
    semesters.push({ exam: sourceExam, courseResults: courseResults.map(row => ({ ...row, earnedGp: row.credit * row.gp })), ...semesterTotals, displayedGp, expected: selection.expected, matchesExpected: displayedGp === selection.expected });
    changes.push(...correction.report.changes);
  }
  const exactTotalGp = semesters.reduce((sum, row) => sum + row.gradePoints, 0);
  const sumOfDisplayedGp = Number(semesters.reduce((sum, row) => sum + Number(row.displayedGp), 0).toFixed(2));
  const totals = correctTotals(data, selections[0]).report.totals;
  const report = { roll: "2012004", semesters, exactTotalGp, displayedCumulativeGp: roundTwo(exactTotalGp), sumOfDisplayedGp, totals, changes };
  const backup = ".next/2012004-semester-verification/" + new Date().toISOString().replace(/[:.]/g, "-");
  await mkdir(backup, { recursive: true });
  await writeFile(backup + "/backup.json", JSON.stringify(original));
  const apply = process.argv.includes("--apply");
  if (apply) {
    await p.$transaction(async tx => {
      const locked = await tx.$queryRawUnsafe('SELECT "section", "data" FROM "ResultSectionStore" WHERE "section"=ANY($1::text[]) ORDER BY "section" FOR UPDATE', sections);
      for (const row of locked) if (!isDeepStrictEqual(row.data, original[row.section])) throw Error("Source changed; rerun verification.");
      for (const section of ["marks-sheet", "result-sheet", "result-sheet-backlog"]) if (!isDeepStrictEqual(original[section], data[section])) {
        await tx.$executeRawUnsafe('UPDATE "ResultSectionStore" SET "data"=CAST($1 AS jsonb),"updatedAt"=NOW() WHERE "section"=$2', JSON.stringify(data[section]), section);
      }
    }, { timeout: 30000 });
    const saved = await p.$queryRawUnsafe('SELECT "section", "data" FROM "ResultSectionStore" WHERE "section"=ANY($1::text[])', sections);
    const verified = Object.fromEntries(saved.map(row => [row.section, row.data]));
    for (const section of sections) if (!isDeepStrictEqual(verified[section], data[section])) throw Error("Read-back mismatch: " + section);
    for (const selection of selections) if (correctTotals(verified, selection).report.changes.length) throw Error("Repeated correction would change totals.");
  }
  await writeFile("scripts/2012004-semester-gp-verification.json", JSON.stringify({ ...report, verifiedInNeon: apply, checkedAt: new Date().toISOString() }, null, 2));
  console.log(JSON.stringify({ ...report, verifiedInNeon: apply, backup }, null, 2));
} finally { await p.$disconnect(); }
