import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor=ws;
const prisma=new PrismaClient({adapter:new PrismaNeon({connectionString:process.env.DATABASE_URL})});
const rolls=["1712020","2012001","2012002","2012003","2012005","2012006","2012007","2012008","2012009","2012011","2012012","2012013","2012014","2012015","2012016","2012017","2012018","2012019","2012020","2012021","2012023","2012024","2012025","2012026","2012027","2012028","2012029","2012030"];
const sessionals={
 "BECM 1100":[27,53,51,40,32,63,50,37,53,61,53,55,51,60,47,58,37,58,52,59,54,53,50,57,56,58,51,58],
 "BECM 1102":[40,53,60,62,53,55,59,51,53,57,63,64,56,57,52,65,54,50,43,61,59,53,60,64,49,53,54,54],
 "Phy 1108":[15,60,60,62,45,59,61,43,56,66,57,64,52,56,55,65,48,46,50,53,58,64,60,61,60,60,55,64],
 "EEE 1148":[0,62,63,60,61,58,61,55,59,67,55,61,61,61,54,60,60,54,63,54,59,58,53,65,66,59,60,63]
};
const section=async(name)=>{const rows=await prisma.$queryRawUnsafe(`SELECT "data" FROM "ResultSectionStore" WHERE "section"=$1 LIMIT 1`,name);return Array.isArray(rows[0]?.data)?rows[0].data:[]};
const directory=await section("student-directory"),students=rolls.map(roll=>directory.find(student=>student.rollNo===roll));
const missing=rolls.filter((_,index)=>!students[index]);if(missing.length)throw new Error(`Students missing: ${missing.join(", ")}`);
const syllabuses=await section("syllabuses"),segment=syllabuses.find(item=>Number(item.fromSeries)<=2020&&Number(item.toSeries)>=2020);if(!segment)throw new Error("No syllabus for series 2020");
const normalized=value=>String(value).replace(/\s+/g,"").toLowerCase();
const results=await section("prepare-result");
for(const [code,values] of Object.entries(sessionals)){const course=segment.courses.find(item=>normalized(item.code)===normalized(code));if(!course)throw new Error(`${code} not found`);const index=results.findIndex(row=>row.examYear==="2021"&&row.academicYear==="1st"&&row.semester==="Odd"&&row.courseId===course.id);if(index>=0&&results[index].published)throw new Error(`${code} is published`);const record={examYear:"2021",academicYear:"1st",semester:"Odd",courseId:course.id,courseCode:course.code,courseTitle:course.title,courseType:"Sessional",students:students.map((student,i)=>({studentId:student.id,name:student.name,rollNo:student.rollNo,registrationNo:student.registrationNo,registrationType:"Regular",withheld:false,present:true,partA:"",partB:"",classTestAttendance:"",sessional:String(values[i]),remarks:""})),updatedAt:new Date().toISOString()};if(index>=0)results[index]=record;else results.push(record)}
await prisma.$executeRawUnsafe(`UPDATE "ResultSectionStore" SET "data"=CAST($1 AS jsonb),"updatedAt"=NOW() WHERE "section"='prepare-result'`,JSON.stringify(results));
console.log(`Imported ${rolls.length*Object.keys(sessionals).length} sessional mark rows.`);await prisma.$disconnect();