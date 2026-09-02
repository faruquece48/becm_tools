import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
const E = { examYear: "2022", academicYear: "2nd", semester: "Even" };
const codes = ["BECM 2203", "BECM 2225", "BECM 2231", "Math 2207", "Hum 2209", "BECM 2226", "BECM 2232", "BECM 2204", "BECM 2202"];
const officialCredits = [3, 3, 2, 3, 3, 1.5, 1.5, 1.5, 1.5];
const officialSummary = new Map([
  ["1712020",[7.5,2.45]],["2012001",[20,3.41]],["2012002",[20,3.01]],["2012003",[20,3.48]],
  ["2012005",[20,3.33]],["2012006",[20,3.37]],["2012007",[20,3.41]],["2012008",[9,2.83]],
  ["2012009",[20,3.12]],["2012011",[20,3.93]],["2012012",[20,3.03]],["2012013",[20,3.31]],
  ["2012014",[20,3.67]],["2012015",[20,3.50]],["2012016",[20,2.97]],["2012017",[20,2.93]],
  ["2012019",[11,2.99]],["2012020",[20,3.01]],["2012021",[20,3.41]],["2012023",[20,3.35]],
  ["2012024",[20,3.14]],["2012025",[12,2.88]],["2012026",[20,3.33]],["2012027",[20,3.51]],
  ["2012028",[20,3.41]],["2012029",[20,2.88]],["2012030",[20,3.23]],["1612016",[5,2.85]],
]);
const rows = [
  ["1712020",[[9,2.5,14],[2,3,32],[7.5,9,11],[5,0,5],[21,18,15]],[18,45,35,33],14],
  ["2012001",[[8.5,23,36],[25.5,21,31],[20.5,12,27],[21,13,35],[17,17,36]],[52,51,49,55],20],
  ["2012002",[[17.5,15.5,31],[17.5,5,26],[6.5,24,25],[14,5,33],[19,15,38]],[37,55,70,56],19],
  ["2012003",[[13.5,13.5,31],[20,17.5,37],[18,21,31],[16,10,37],[18,21,35]],[65,58,65,65],21],
  ["2012005",[[5.5,22,32],[16,12,34],[8,17,28],[15,30,35],[13,17,36]],[56,59,50,59],19],
  ["2012006",[[18,13,37],[22,15.5,33],[22,22.5,29],[5,16,29],[20,21,33]],[52,59,72,46],21],
  ["2012007",[[21,25,31],[17,11,36],[21,25,29],[21,8,30],[16,22,31]],[52,59,50,55],23],
  ["2012008",[[0.5,4,18],[2,0,17],[2.5,4.5,14],[0,0,14],[18,10,32]],[27,48,47,41],17],
  ["2012009",[[13,14,35],[13,3.5,32],[18,18,31],[14,13,25],[19,19,34]],[48,55,50,57],23],
  ["2012011",[[25.5,22,33],[25,27,33],[22.5,24.5,35],[20,27,30],[24,25,36]],[66,58,55,64],20],
  ["2012012",[[10,12,31],[14,14,31],[23,19,26],[5,10,25],[20,19,34]],[52,58,49,54],21],
  ["2012013",[[15,10,31],[13,7,35],[23,20,28],[13,16,31],[20,20,34]],[61,59,50,61],22],
  ["2012014",[[15.5,20,34],[23,21,34],[24,18.5,27],[25,25,35],[16,23,34]],[58,53,50,60],20],
  ["2012015",[[13,15,32],[22.5,5,35],[23,18,30],[18,21,33],[21,24,35]],[57,59,55,57],20],
  ["2012016",[[8,18,23],[17,18,25],[14,15,23],[15,17,24],[11,17,33]],[55,55,48,54],20],
  ["2012017",[[10,14,32],[16,9,29],[22.5,15,25],[14,10,25],[18,14,33]],[54,54,50,49],17],
  ["2012019",[[2.5,7,33],[6,3,37],[5.5,13,23],[7,0,26],[13,13,36]],[50,53,52,43],19],
  ["2012020",[[2,19.5,31],[18,6,34],[6.5,21.5,29],[10,9,29],[20,20,31]],[53,58,50,62],18],
  ["2012021",[[14,19,34],[17.5,17,40],[14.5,21,25],[16,21,25],[17,19,34]],[57,54,55,57],18],
  ["2012023",[[17.5,20,32],[11.5,15,36],[23,19,30],[10,16,31],[19,22,35]],[49,55,50,50],20],
  ["2012024",[[22,18.5,24],[19,6,31],[24,24,24],[17,22,15],[19,23,31]],[48,53,48,49],20],
  ["2012025",[[4,7.5,24],[9.5,10,23],[3.5,5.5,22],[11,0,23],[11,12,33]],[56,55,50,48],18],
  ["2012026",[[10,20,34],[15,10.5,35],[23.5,21.5,27],[12,21,27],[17,20,35]],[56,55,50,58],20],
  ["2012027",[[8,15,33],[22,17.5,33],[16.5,21,29],[20,25,31],[21,23,35]],[61,55,57,53],20],
  ["2012028",[[17,19.5,36],[22,15,33],[17,18,27],[17,17,33],[19,17,34]],[55,55,55,52],20],
  ["2012029",[[18,7.5,31],[16,2,31],[18.5,20,28],[10,10,26],[15,12,35]],[48,54,55,51],20],
  ["2012030",[[22,15.5,32],[14,8,36],[13,19,28],[16,12,23],[20,18,36]],[41,54,65,61],20],
  ["1612016",[null,[10.5,15,32],[23.5,18,22],null,null],[null,null,null,null],null],
];
const normalize = (value) => String(value || "").replace(/\s/g, "").toLowerCase();
const load = async (section) => (await prisma.$queryRawUnsafe('SELECT "data" FROM "ResultSectionStore" WHERE "section"=$1', section))[0]?.data || [];
const write = (section, data) => prisma.$executeRawUnsafe('INSERT INTO "ResultSectionStore"("section","data","updatedAt") VALUES($1,CAST($2 AS jsonb),NOW()) ON CONFLICT("section") DO UPDATE SET "data"=EXCLUDED."data","updatedAt"=NOW()', section, JSON.stringify(data));
const letter = (score, theory, values) => theory && values[0] + values[1] < 15 ? "F" : score >= 80 ? "A+" : score >= 75 ? "A" : score >= 70 ? "A-" : score >= 65 ? "B+" : score >= 60 ? "B" : score >= 55 ? "B-" : score >= 50 ? "C+" : score >= 45 ? "C" : score >= 40 ? "D" : "F";

try {
  const [directory, oldDirectory, syllabuses, eligibility, prepared, vivas, archives] = await Promise.all(["student-directory","old-student-directory","syllabuses","student-eligibility","prepare-result","add-viva-marks","marks-sheet"].map(load));
  const segment = syllabuses.find((item) => item.active !== false && Number(item.fromSeries) <= 2020 && Number(item.toSeries) >= 2020);
  const courses = codes.map((code) => (segment?.courses || []).find((course) => normalize(course.code) === normalize(code) && course.year === "2nd" && course.semester === "Even"));
  if (courses.some((course) => !course)) throw new Error("One or more Second Year Even courses are missing from the syllabus.");
  const targetCodes = new Set(codes.map(normalize));
  for (const records of [prepared, eligibility]) {
    for (let index = records.length - 1; index >= 0; index -= 1) {
      const record = records[index];
      if (record.examYear === E.examYear && record.academicYear === E.academicYear && record.semester === E.semester && targetCodes.has(normalize(record.courseCode))) records.splice(index, 1);
    }
  }
  const identities = new Map();
  for (const [roll] of rows) {
    const source = roll === "1612016" ? oldDirectory : directory;
    const candidates = source.filter((student) => normalize(student.rollNo) === normalize(roll));
    const student = candidates.find((item) => roll === "1712020" ? String(item.series) === "2020" : true);
    if (!student) throw new Error(`Student ${roll} was not found.`);
    identities.set(roll, student);
  }
  const now = new Date().toISOString(), targetIds = new Set([...identities.values()].map((student) => student.id));
  courses.forEach((course, courseIndex) => {
    let record = prepared.find((item) => item.examYear === E.examYear && item.academicYear === E.academicYear && item.semester === E.semester && item.courseId === course.id);
    if (!record) { record = { ...E, courseId: course.id, courseCode: course.code, courseTitle: course.title, courseType: course.type, students: [], updatedAt: now }; prepared.push(record); }
    const incoming = rows.flatMap(([roll, theory, sessionals]) => {
      const values = courseIndex < 5 ? theory[courseIndex] : sessionals[courseIndex - 5];
      if (values == null) return [];
      const student = identities.get(roll), base = { studentId: student.id, name: student.name, rollNo: student.rollNo, registrationNo: student.registrationNo, registrationType: roll === "1612016" ? "Non-OBE" : "Regular", withheld: false, present: true, remarks: "" };
      return [courseIndex < 5 ? { ...base, partA: String(values[0]), partB: String(values[1]), classTestAttendance: String(values[2]), sessional: "" } : { ...base, partA: "", partB: "", classTestAttendance: "", sessional: String(values) }];
    });
    record.students = [...(record.students || []).filter((student) => !targetIds.has(student.studentId) && !rows.some(([roll]) => normalize(roll) === normalize(student.rollNo))), ...incoming];
    record.courseCode = course.code; record.courseTitle = course.title; record.courseType = course.type; record.updatedAt = now;
    let eligibilityRecord = eligibility.find((item) => item.examYear === E.examYear && item.academicYear === E.academicYear && item.semester === E.semester && item.courseId === course.id);
    if (!eligibilityRecord) { eligibilityRecord = { ...E, courseId: course.id, courseCode: course.code, courseTitle: course.title, students: [], updatedAt: now }; eligibility.push(eligibilityRecord); }
    const eligibleIds = new Set(incoming.map((student) => student.studentId));
    eligibilityRecord.students = [...(eligibilityRecord.students || []).filter((student) => !targetIds.has(student.studentId)), ...[...eligibleIds].map((studentId) => ({ studentId, eligible: true }))]; eligibilityRecord.updatedAt = now;
  });
  let viva = vivas.find((item) => item.examYear === E.examYear && item.academicYear === E.academicYear && item.semester === E.semester);
  if (!viva) { viva = { department: "Building Engineering & Construction Management", ...E, students: [], finalized: true, published: false, updatedAt: now }; vivas.push(viva); }
  const vivaStudents = rows.map(([roll,,,vivaMark]) => { const student = identities.get(roll); return { id: student.id, name: student.name, registrationNo: student.registrationNo, rollNo: student.rollNo, registrationType: roll === "1612016" ? "Non-OBE" : "Regular", marks: vivaMark == null ? "" : String(vivaMark), present: vivaMark != null }; });
  viva.students = [...(viva.students || []).filter((student) => !targetIds.has(student.id) && !rows.some(([roll]) => normalize(roll) === normalize(student.rollNo))), ...vivaStudents]; viva.updatedAt = now;
  let archive = archives.find((item) => item.examYear === E.examYear && item.academicYear === E.academicYear && item.semester === E.semester);
  if (!archive) { archive = { ...E, series: "2020", students: [], updatedAt: now }; archives.push(archive); }
  const archiveStudents = rows.map(([roll, theories, sessionals, vivaMark]) => {
    const student = identities.get(roll), results = [];
    theories.forEach((values, index) => { if (!values) return; const score = Math.round(values[0] + values[1] + values[2]); results.push({ course: courses[index], credit: officialCredits[index], grade: letter(score, true, values) }); });
    sessionals.forEach((value, index) => { if (value == null) return; const courseIndex = index + 5, score = Math.round(value + (vivaMark || 0)); results.push({ course: courses[courseIndex], credit: officialCredits[courseIndex], grade: letter(score, false, [0,0]) }); });
    const [earnedCredit, officialSgpa] = officialSummary.get(roll), gradePoints = earnedCredit * officialSgpa;
    return { studentId: student.id, rollNo: student.rollNo, earnedCredit, gradePoints: Number(gradePoints.toFixed(3)), sgpa: officialSgpa.toFixed(2), failedSubjects: results.filter((result) => result.grade === "F").map((result) => result.course.code), registerAgain: [] };
  });
  archive.students = [...(archive.students || []).filter((student) => !targetIds.has(student.studentId) && !rows.some(([roll]) => normalize(roll) === normalize(student.rollNo))), ...archiveStudents]; archive.updatedAt = now;
  await prisma.$transaction([write("student-eligibility", eligibility), write("prepare-result", prepared), write("add-viva-marks", vivas), write("marks-sheet", archives)]);
  console.log(JSON.stringify({ examination: E, students: rows.length, courses: courses.map((course) => course.code), publishedPreserved: Boolean(viva.published), archive: archiveStudents.map((student) => ({ rollNo: student.rollNo, earnedCredit: student.earnedCredit, sgpa: student.sgpa })) }, null, 2));
} finally {
  await prisma.$disconnect();
}
