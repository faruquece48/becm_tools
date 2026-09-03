import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
const p=new PrismaClient({adapter:new PrismaNeon({connectionString:process.env.DATABASE_URL})});
const studentId="f90c3989-0260-44d7-ad9d-368a780c3d0f",roll="2012028";
const load=async section=>(await p.$queryRawUnsafe('SELECT "data" FROM "ResultSectionStore" WHERE "section"=$1',section))[0]?.data||[];
const write=(section,data)=>p.$executeRawUnsafe('UPDATE "ResultSectionStore" SET "data"=CAST($1 AS jsonb),"updatedAt"=NOW() WHERE "section"=$2',JSON.stringify(data),section);
const archives=await load("marks-sheet"),results=await load("result-sheet");
const same=s=>s.studentId===studentId||String(s.rollNo||"").replace(/\s/g,"")===roll;
const oddArchive=archives.find(x=>x.examYear==="2023"&&x.academicYear==="3rd"&&x.semester==="Odd"),oddStudent=oddArchive?.students?.find(same);
if(!oddStudent)throw Error("2023 3rd Year Odd archive row for 2012028 was not found.");
oddStudent.earnedCredit=19.5;oddStudent.gradePoints=70.875;oddStudent.sgpa="3.63";oddArchive.updatedAt=new Date().toISOString();
const oddResult=results.find(x=>x.examYear==="2023"&&x.academicYear==="3rd"&&x.semester==="Odd")?.students?.find(s=>s.studentId===studentId);
if(oddResult){oddResult.totalEarnedCredit=100;oddResult.totalGradePoints=329.375;oddResult.cgpa="3.29"}
const evenResult=results.find(x=>x.examYear==="2023"&&x.academicYear==="3rd"&&x.semester==="Even")?.students?.find(s=>s.studentId===studentId);
if(!evenResult)throw Error("2023 3rd Year Even result row for 2012028 was not found.");
evenResult.totalEarnedCredit=121;evenResult.totalGradePoints=395;evenResult.cgpa="3.26";
await write("marks-sheet",archives);await write("result-sheet",results);
console.log(JSON.stringify({roll,currentGP:65.625,currentCredit:21,currentGPA:"3.13",previousGP:329.375,previousCredit:100,totalGP:395,totalCredit:121,cgpa:"3.26"},null,2));
await p.$disconnect();
