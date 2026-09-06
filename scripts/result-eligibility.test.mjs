import test from "node:test";
import assert from "node:assert/strict";
import { fullyIneligibleForExam, backlogFailedSubjects, belongsToRegularExam, countsAsSemesterBacklogged, countsAsSemesterUncleared, isObeRoll } from "../lib/resultEligibility.ts";

const exam = { examYear: "2023", academicYear: "2nd", semester: "Odd" };
const student = { id: "current", rollNo: "2012004" };
const directory = [student, { id: "historical", rollNo: "2012 004" }];
const record = (courseId, eligible, studentId = "historical") => ({ ...exam, courseId, students: [{ studentId, eligible }] });

test("roll cohort determines OBE classification even when stored series was reassigned", () => {
  assert.equal(isObeRoll("1612027"), false);
  assert.equal(isObeRoll("2012004"), true);
  assert.equal(isObeRoll("20 12004"), true);
});

test("semester backlog count ignores students who only need to register", () => {
  assert.equal(countsAsSemesterBacklogged({ currentFailed: ["BECM 2201"] }), true);
  assert.equal(countsAsSemesterBacklogged({ currentFailed: [] }), false);
});

test("semester cleared count excludes the union of failed and need-to-register students", () => {
  assert.equal(countsAsSemesterUncleared({ currentFailed: ["BECM 2201"], currentRegister: [] }), true);
  assert.equal(countsAsSemesterUncleared({ currentFailed: [], currentRegister: ["BECM 2203"] }), true);
  assert.equal(countsAsSemesterUncleared({ currentFailed: ["BECM 2201"], currentRegister: ["BECM 2203"] }), true);
  assert.equal(countsAsSemesterUncleared({ currentFailed: [], currentRegister: [] }), false);
});

test("fully ineligible students are excluded across historical identities", () => {
  assert.equal(fullyIneligibleForExam(student, directory, ["A", "B"], [record("A", false), record("B", false)], exam), true);
});
test("partially eligible students and missing eligibility remain visible", () => {
  assert.equal(fullyIneligibleForExam(student, directory, ["A", "B"], [record("A", false), record("B", true)], exam), false);
  assert.equal(fullyIneligibleForExam(student, directory, ["A", "B"], [record("A", false)], exam), false);
  assert.equal(fullyIneligibleForExam(student, directory, [], [], exam), false);
});
test("other semesters and conflicting eligible identities do not hide students", () => {
  assert.equal(fullyIneligibleForExam(student, directory, ["A"], [{ ...record("A", false), semester: "Even" }], exam), false);
  assert.equal(fullyIneligibleForExam(student, directory, ["A"], [record("A", false), record("A", true, "current")], exam), false);
});
test("backlog includes unique failed subjects and excludes need-to-register subjects", () => {
  assert.deepEqual(backlogFailedSubjects({ failedSubjects: ["BECM 2101", "becm2101", "Math 2107"], registerAgain: ["MATH2107", "Hum 2109"] }), ["becm2101"]);
  assert.deepEqual(backlogFailedSubjects({ registerAgain: ["Math 2107"] }), []);
  assert.deepEqual(backlogFailedSubjects(), []);
});

test("regular sheets use the batch corresponding to the selected exam", () => {
  assert.equal(belongsToRegularExam({ ...student, series: "2021" }, directory, ["A"], [], exam), true);
  assert.equal(belongsToRegularExam({ ...student, series: "2020" }, directory, ["A"], [], exam), false);
  assert.equal(belongsToRegularExam({ ...student, series: "2022" }, directory, ["A"], [], exam), false);
});

test("blank imported rows cannot bring other batches back into the sheets", () => {
  const oldStudent = { ...student, series: "2020" };
  const blank = { ...exam, courseId: "A", students: [{ studentId: "historical", present: true, partA: "", partB: " ", sessional: "" }] };
  assert.equal(belongsToRegularExam(oldStudent, directory, ["A"], [blank], exam), false);
  const marked = { ...blank, students: [{ studentId: "historical", present: true, partA: "16" }] };
  assert.equal(belongsToRegularExam(oldStudent, directory, ["A"], [marked], exam), true);
  assert.equal(belongsToRegularExam(oldStudent, directory, ["A"], [{ ...marked, semester: "Even" }], exam), false);
  assert.equal(belongsToRegularExam(oldStudent, directory, ["A"], [{ ...marked, examYear: "2022" }], exam), false);
  assert.equal(belongsToRegularExam(oldStudent, directory, ["B"], [marked], exam), false);
});

test("recorded zero marks or absence retain a genuine examination participant", () => {
  const oldStudent = { ...student, series: "2020" };
  for (const mark of [{ studentId: student.id, partA: "0" }, { studentId: student.id, present: false }]) {
    assert.equal(belongsToRegularExam(oldStudent, directory, ["A"], [{ ...exam, courseId: "A", students: [mark] }], exam), true);
  }
});
