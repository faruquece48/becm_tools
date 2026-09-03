import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
const p=new PrismaClient({adapter:new PrismaNeon({connectionString:process.env.DATABASE_URL})});
const row=await p.resultSectionStore.findUnique({where:{section:"student-directory"},select:{data:true}});
const students=Array.isArray(row?.data)?row.data:[];
const target=students.filter(s=>s.year==="4th"&&s.semester==="Odd"&&s.promotionSource?.examYear==="2023"&&s.promotionSource?.academicYear==="3rd"&&s.promotionSource?.semester==="Even"&&s.promotionSource?.promotedAt==="2026-09-02T18:32:53.661Z");
if(target.length!==26)throw Error("Expected the exact 26-student promotion batch; found "+target.length+". No changes made.");
const ids=new Set(target.map(s=>s.id));
const updated=students.map(student=>{
 if(!ids.has(student.id))return student;
 const prior=student.backlogEligibility?.find(item=>item.examYear==="2022"&&item.academicYear==="2nd"&&item.semester==="Even");
 return{...student,year:"3rd",semester:"Even",placementExamYear:"2023",promotionSource:{examYear:"2022",academicYear:"2nd",semester:"Even",promotedAt:prior?.createdAt||student.promotionSource.promotedAt}};
});
await p.resultSectionStore.update({where:{section:"student-directory"},data:{data:updated}});
const verify=updated.filter(s=>ids.has(s.id)&&s.year==="3rd"&&s.semester==="Even"&&s.placementExamYear==="2023");
console.log(JSON.stringify({rolledBack:verify.length,rolls:verify.map(s=>s.rollNo).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))},null,2));
await p.$disconnect();
