import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
const rolls = ["1712020","2012001","2012002","2012003","2012005","2012006","2012007","2012008","2012009","2012011","2012012","2012013","2012014","2012015","2012016","2012017","2012018","2012019","2012020","2012021","2012023","2012024","2012025","2012026","2012027","2012028","2012029","2012030"];
const viva = [16,14,21,16,15,17,16,13,17,18,18,19,16,18,17,21,19,14,21,18,18,22,17,20,15,15,17,21];
const marks = {
  "CE 1125": [[19.5,4.5,10],[23.5,20,35],[14.5,10,32],[24.5,18.5,33],[18,5.5,35],[22.5,6,31],[19.5,14,32],[8.5,0,19],[18,8,28],[20,21.5,37],[17.5,8.5,36],[11,15,35],[21.5,20,36],[21,12.5,34],[23.5,22,34],[14,8.5,36],[14,10,16],[11.5,1,28],[13.5,18,37],[2.5,17,30],[15.5,17,32],[17,10.5,21],[6.5,14,28],[24,13,36],[20,18,36],[16,11,25],[19,10,23],[16.5,11,37]],
  "Chem 1107": [[13,27,3],[17,29,31],[15,18.5,33],[21,30,32],[11,25,30],[12,11.5,31],[21,30,34],[8,5,14],[13,17,35],[21,30,35],[22,27,35],[17,30,34],[23,27,34],[14,30,34],[14,30,34],[15,28,34],[19,26,27],[14,12.5,32],[15,20,34],[16,16,31],[14,29,33],[20,28,28],[14,14.5,29],[22,24,35],[15,27.5,33],[19,16,29],[11,22,24],[15,29.5,33]],
  "Phy 1107": [[17,18,5],[21,27,28],[25.5,11,23],[24,19,25],[26,13,25],[16,18,30],[22,19,29],[10,1,3],[21,15,27],[23,21,32],[21,13,29],[24,18,35],[24,26,33],[25,15,28],[25,28,35],[23,11,31],[21,21,14],[12,9,20],[27,26,29],[22,8.5,30],[23,9,29],[23,22,26],[22,6,13],[21,18,31],[21.5,20,28],[17,8,25],[17,15,19],[25,12,31]],
  "Math 1107": [[0,7,4],[20.5,21,33],[21,10,28],[19,11,32],[19,15,30],[21.5,9,23],[20,2,28],[12,1,17],[19,3,28],[26,16,32],[14,4,28],[21,6,33],[18,14,35],[22,3,31],[25,18,37],[28.5,14,31],[14,14,18],[8,3,25],[25,4,32],[14,9,25],[20,7,30],[15,3,22],[25,3,30],[26,11,32],[20,9,32],[20,9,32],[25,12,30],[18,19,29]],
  "EEE 1147": [[10,6,4],[15,12,29],[19,8.5,28],[18.5,16,23],[5,13,29],[12,10.5,17],[16,15.5,32],[4,1.5,7],[11,13.5,28.5],[18.5,23,34.5],[14,20,36],[6,15.5,33],[22.5,23.5,31],[16,7.5,32],[22.5,23,34],[21,14.5,28],[9,12.5,24],[5,4.5,19],[9,18,31.5],[8,14,27],[10,10.5,19],[14,11.5,17],[8,3,22],[18,17,32],[9,12,28],[9,12,28],[6,5,13],[10,19.5,32]]
};
const section = async (name) => { const rows = await prisma.$queryRawUnsafe(`SELECT "data" FROM "ResultSectionStore" WHERE "section" = $1 LIMIT 1`, name); return Array.isArray(rows[0]?.data) ? rows[0].data : []; };
const store = (name, data) => prisma.$executeRawUnsafe(`INSERT INTO "ResultSectionStore" ("section","data","updatedAt") VALUES ($1,CAST($2 AS jsonb),NOW()) ON CONFLICT ("section") DO UPDATE SET "data"=EXCLUDED."data","updatedAt"=NOW()`, name, JSON.stringify(data));
const directory = await section("student-directory");
const students = rolls.map((roll) => directory.find((student) => student.rollNo === roll));
const missing = rolls.filter((_, index) => !students[index]);
if (missing.length) throw new Error(`Students missing from Neon: ${missing.join(", ")}`);
const syllabuses = await section("syllabuses");
const segment = syllabuses.find((item) => Number(item.fromSeries) <= 2020 && Number(item.toSeries) >= 2020);
if (!segment) throw new Error("No syllabus segment covers series 2020");
const normalized = (value) => String(value).replace(/\s+/g, "").toLowerCase();
const courses = Object.keys(marks).map((code) => { const course = segment.courses.find((item) => normalized(item.code) === normalized(code)); if (!course) throw new Error(`Course ${code} not found in syllabus`); return [code, course]; });
const existingResults = await section("prepare-result");
for (const [code, course] of courses) {
  const index = existingResults.findIndex((row) => row.examYear === "2021" && row.academicYear === "1st" && row.semester === "Odd" && row.courseId === course.id);
  if (index >= 0 && existingResults[index].published) throw new Error(`${code} is already published; import stopped`);
  const record = { examYear:"2021", academicYear:"1st", semester:"Odd", courseId:course.id, courseCode:course.code, courseTitle:course.title, students:students.map((student,i)=>({studentId:student.id,name:student.name,rollNo:student.rollNo,registrationNo:student.registrationNo,registrationType:"Regular",withheld:false,present:true,partA:String(marks[code][i][0]),partB:String(marks[code][i][1]),classTestAttendance:String(marks[code][i][2]),remarks:""})),updatedAt:new Date().toISOString() };
  if (index >= 0) existingResults[index] = record; else existingResults.push(record);
}
const vivaRows = await section("add-viva-marks");
const vivaIndex = vivaRows.findIndex((row) => row.examYear === "2021" && row.academicYear === "1st" && row.semester === "Odd");
if (vivaIndex >= 0 && vivaRows[vivaIndex].published) throw new Error("2021 Viva result is already published; import stopped");
const vivaRecord = { department:"Building Engineering & Construction Management",examYear:"2021",academicYear:"1st",semester:"Odd",students:students.map((student,i)=>({id:student.id,name:student.name,registrationNo:student.registrationNo,rollNo:student.rollNo,registrationType:"Regular",marks:String(viva[i]),present:true})),finalized:false,submitted:false,published:false,updatedAt:new Date().toISOString() };
if (vivaIndex >= 0) vivaRows[vivaIndex] = vivaRecord; else vivaRows.push(vivaRecord);
await prisma.$transaction([store("prepare-result", existingResults), store("add-viva-marks", vivaRows)]);
console.log(`Imported ${students.length} Viva rows and ${courses.length * students.length} theory-course mark rows.`);
await prisma.$disconnect();