import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
const examYear = "2022", academicYear = "2nd", now = new Date().toISOString();
const input = [
  ["1712020", [["Hum 2109",19,16,5],["BECM 2225",3.5,3,32],["BECM 2231",16.5,22,11]]],
  ["2012008", [["Hum 2109",5,14,21],["BECM 2225",4,1,17],["BECM 2231",1,7,14]]],
  ["2012019", [["BECM 2225",9,1,37],["BECM 2203",1,10,33],["Math 2207",19,0,26]]],
  ["2012024", [["Hum 2109",17,15,26]]],
  ["2012025", [["BECM 2231",8,17,22],["BECM 2203",5,11,24],["Math 2207",17,12,23]]],
];
const normalize = (value) => String(value || "").replace(/\s/g, "").toLowerCase();
const load = async (section) => (await prisma.$queryRawUnsafe('SELECT "data" FROM "ResultSectionStore" WHERE "section"=$1', section))[0]?.data || [];
const write = (section, data) => prisma.$executeRawUnsafe('INSERT INTO "ResultSectionStore"("section","data","updatedAt") VALUES($1,CAST($2 AS jsonb),NOW()) ON CONFLICT("section") DO UPDATE SET "data"=EXCLUDED."data","updatedAt"=NOW()', section, JSON.stringify(data));

try {
  const [directory, syllabuses, savedMarks, registrations] = await Promise.all(["student-directory", "syllabuses", "prepare-result-backlog", "backlog-registrations"].map(load));
  const segment = syllabuses.find((item) => item.active !== false && Number(item.fromSeries) <= 2020 && Number(item.toSeries) >= 2020);
  const requestedCodes = [...new Set(input.flatMap(([, marks]) => marks.map(([code]) => code)))];
  const courses = new Map(requestedCodes.map((code) => [normalize(code), (segment?.courses || []).find((course) => normalize(course.code) === normalize(code) && course.year === academicYear)]));
  const missingCodes = requestedCodes.filter((code) => !courses.get(normalize(code)));
  if (missingCodes.length) throw new Error(`Backlog courses missing from the active syllabus: ${missingCodes.join(", ")}.`);
  const students = new Map(input.map(([roll]) => {
    const candidates = directory.filter((student) => normalize(student.rollNo) === normalize(roll));
    const student = candidates.find((item) => roll === "1712020" ? String(item.series) === "2020" : true);
    if (!student) throw new Error(`Student ${roll} was not found.`);
    return [roll, student];
  }));
  const incoming = input.flatMap(([roll, marks]) => marks.map(([code, partA, partB, classTestAttendance]) => {
    const student = students.get(roll), course = courses.get(normalize(code)), total = Math.round(partA + partB + classTestAttendance), failed = partA + partB < 15 || total < 40;
    return { id: crypto.randomUUID(), studentId: student.id, studentName: student.name, rollNo: student.rollNo, registrationNo: student.registrationNo, examYear, academicYear, courseId: course.id, courseCode: course.code, courseTitle: course.title, semester: course.semester, present: true, partA: String(partA), partB: String(partB), classTestAttendance: String(classTestAttendance), marks: String(total), result: failed ? "Fail" : "Pass", remarks: "", updatedAt: now };
  }));
  const keys = new Set(incoming.map((row) => `${row.studentId}|${row.courseId}`));
  const existing = savedMarks.filter((row) => row.examYear === examYear && row.academicYear === academicYear && keys.has(`${row.studentId}|${row.courseId}`));
  const published = existing.filter((row) => row.published);
  console.log(JSON.stringify({ examination: { examYear, academicYear, examType: "Backlog" }, students: input.length, marks: incoming.length, existing: existing.length, published: published.length, rows: incoming.map((row) => ({ rollNo: row.rollNo, courseCode: row.courseCode, marks: row.marks, result: row.result })) }, null, 2));
  if (!process.argv.includes("--apply")) process.exitCode = published.length ? 2 : 0;
  else {
    if (published.length && !process.argv.includes("--overwrite-published")) throw new Error("Published backlog marks exist; explicit --overwrite-published is required.");
    const nextMarks = [...savedMarks.filter((row) => !(row.examYear === examYear && row.academicYear === academicYear && keys.has(`${row.studentId}|${row.courseId}`))), ...incoming.map((row) => ({ ...row, published: existing.find((old) => old.studentId === row.studentId && old.courseId === row.courseId)?.published }))];
    const nextRegistrations = [...registrations];
    input.forEach(([roll, marks]) => {
      const student = students.get(roll), registeredCourses = marks.map(([code]) => courses.get(normalize(code))).map((course) => ({ courseId: course.id, courseCode: course.code, courseTitle: course.title, semester: course.semester })), index = nextRegistrations.findIndex((record) => record.studentId === student.id && record.examYear === examYear && record.academicYear === academicYear);
      const record = { studentId: student.id, studentName: student.name, rollNo: student.rollNo, registrationNo: student.registrationNo, examYear, academicYear, courses: registeredCourses, confirmedAt: now };
      if (index < 0) nextRegistrations.push(record); else nextRegistrations[index] = record;
    });
    await prisma.$transaction([write("prepare-result-backlog", nextMarks), write("backlog-registrations", nextRegistrations)]);
    console.log("Applied backlog marks and registrations.");
  }
} finally {
  await prisma.$disconnect();
}
