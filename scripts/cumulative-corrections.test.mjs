import test from "node:test";
import assert from "node:assert/strict";
import { propagateSemesterCorrections } from "../lib/server/cumulativeCorrections.ts";
import { correctTotals, sections } from "./correct-2112029-cumulative.mjs";

const odd = { examYear: "2022", academicYear: "1st", semester: "Odd" };
const even = { ...odd, semester: "Even" };
const student = { studentId: "old-id", rollNo: "2112029", earnedCredit: 18, gradePoints: 50.25 };
const before = [{ ...odd, students: [student, { ...student }] }];
const after = [{ ...odd, students: [{ ...student, earnedCredit: 21, gradePoints: 57.75 }] }];
const identities = [{ id: "new-id", rollNo: "2112029" }];
const result = { ...even, students: [{ studentId: "new-id", totalEarnedCredit: 35, totalGradePoints: 103.875 }, { studentId: "unrelated", totalEarnedCredit: 41, totalGradePoints: 140 }] };

test("a corrected semester carries its difference forward once across aliases and duplicate archives", () => {
  const corrected = propagateSemesterCorrections(before, after, [result], identities);
  assert.equal(corrected[0].students[0].totalEarnedCredit, 38);
  assert.equal(corrected[0].students[0].totalGradePoints, 111.375);
  assert.equal(corrected[0].students[0].cgpa, "2.93");
  assert.deepEqual(corrected[0].students[1], result.students[1]);
  assert.deepEqual(propagateSemesterCorrections(after, after, corrected, identities), corrected);
});

test("downward corrections propagate without altering earlier results or existing backlog contributions", () => {
  const earlier = { ...odd, examYear: "2021", students: result.students };
  const corrected = propagateSemesterCorrections(after, before, [earlier, result], identities);
  assert.deepEqual(corrected[0], earlier);
  assert.equal(corrected[1].students[0].totalGradePoints, 96.375);
  assert.equal(corrected[1].students[0].totalEarnedCredit, 32);
});

test("backlog correction occurs after regular Even and updates the backlog result", () => {
  assert.deepEqual(propagateSemesterCorrections(before, after, [result], identities, true), [result]);
  const corrected = propagateSemesterCorrections(before, after, [{ ...result, semester: "" }], identities, true, true);
  assert.equal(corrected[0].students[0].totalGradePoints, 111.375);
});

test("targeted repair uses edited raw marks, refreshes archives, and includes unarchived backlog once", () => {
  const data = Object.fromEntries(sections.map(section => [section, []]));
  data["student-directory"] = [{ id: "id", rollNo: "2112029" }];
  data.syllabuses = [{ fromSeries: "2020", toSeries: "2024", courses: [{ id: "chem", code: "Chem 1107", credit: "3", year: "1st", semester: "Odd", type: "Theory" }, { id: "backlog", code: "BECM 1223", credit: "3", year: "1st", semester: "Even", type: "Theory" }] }];
  data["prepare-result"] = [{ ...odd, courseId: "chem", students: [{ studentId: "id", partA: "7", partB: "16", classTestAttendance: "27", present: true, withheld: false }] }];
  const row = { studentId: "id", rollNo: "2112029", earnedCredit: 0, gradePoints: 0, sgpa: "0.00", failedSubjects: ["Chem 1107"], registerAgain: [] };
  data["marks-sheet"] = [{ ...odd, students: [row] }, { ...even, students: [{ ...row, earnedCredit: 17, gradePoints: 53.625 }] }, { examYear: "2023", academicYear: "2nd", semester: "Odd", students: [{ ...row, earnedCredit: 16.5, gradePoints: 50.625 }] }];
  data["result-sheet"] = data["marks-sheet"].map(archive => ({ ...archive, students: [{ studentId: "id", totalEarnedCredit: 0, totalGradePoints: 0 }] }));
  data["prepare-result-backlog"] = [{ ...even, studentId: "id", courseId: "backlog", courseCode: "BECM 1223", marks: "53", result: "Pass" }];
  const corrected = correctTotals(data);
  assert.equal(corrected.data["marks-sheet"][0].students[0].gradePoints, 7.5);
  assert.equal(corrected.data["result-sheet"][1].students[0].totalGradePoints, 61.125);
  assert.equal(corrected.data["result-sheet"][2].students[0].totalGradePoints, 119.25);
  assert.equal(corrected.data["result-sheet"][2].students[0].totalEarnedCredit, 39.5);
  assert.equal(correctTotals(corrected.data).report.changes.length, 0);
});
