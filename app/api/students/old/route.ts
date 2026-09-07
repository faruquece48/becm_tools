import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import type { OldStudentRecord } from "@/lib/storage/studentDirectory";
import { promotionCoursesChanged } from "@/lib/oldStudentPromotions";
import { applySpecialPromotion } from "@/lib/specialPromotion";
import type { SyllabusSegment } from "@/lib/storage/syllabuses";
const SECTION="old-student-directory";
const course=z.object({courseId:z.string().min(1),status:z.enum(["failed","need-register"])});
const promotion=z.object({id:z.string().min(1),examYear:z.string().regex(/^\d{4}$/),academicYear:z.enum(["1st","2nd","3rd","4th"]),semester:z.enum(["Odd","Even","Short Semester","Backlog"]),examType:z.enum(["Regular","Backlog"]),courseIds:z.array(z.string().min(1)).min(1),promotedAt:z.string().datetime()});
const record=z.object({id:z.string().min(1),department:z.string().min(1),series:z.string().regex(/^(?:201[6-9]|202[0-4])$/),section:z.enum(["A","B"]),name:z.string().trim().min(2),rollNo:z.string().trim().min(1),registrationNo:z.string().trim().min(1),fatherName:z.string(),motherName:z.string(),localGuardian:z.string(),gender:z.enum(["Male","Female","Other"]),birthDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),earnedCredit:z.number().min(0).max(250),gradePoints:z.number().min(0).max(1000),degreeCredit:z.number().positive().max(250).optional(),outstandingCourses:z.array(course).max(500),promotions:z.array(promotion),createdAt:z.string().datetime(),updatedAt:z.string().datetime()});
async function access(){const id=(await cookies()).get("becm-portal-account")?.value,p=getPrisma();if(!id||!p)return null;return await p.portalAccount.findFirst({where:{id,role:"teacher",active:true},select:{id:true}})?p:null}
async function load(p:NonNullable<ReturnType<typeof getPrisma>>){await p.$executeRaw(Prisma.sql`INSERT INTO "ResultSectionStore" ("section","data","updatedAt") VALUES (${SECTION},'[]'::jsonb,NOW()) ON CONFLICT ("section") DO NOTHING`);const r=await p.$queryRaw<Array<{data:Prisma.JsonValue}>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section"=${SECTION} LIMIT 1`);return Array.isArray(r[0]?.data)?r[0].data as unknown as OldStudentRecord[]:[]}
async function save(p:NonNullable<ReturnType<typeof getPrisma>>,records:OldStudentRecord[]){await p.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data"=CAST(${JSON.stringify(records)} AS jsonb),"updatedAt"=NOW() WHERE "section"=${SECTION}`)}
export async function GET(){const p=await access();if(!p)return NextResponse.json({error:"Teacher login required"},{status:401});try{return NextResponse.json({records:await load(p)},{headers:{"Cache-Control":"no-store"}})}catch(e){console.error(e);return NextResponse.json({error:"Unable to load Non-OBE students"},{status:503})}}
export async function PUT(request:Request){
 const p=await access();if(!p)return NextResponse.json({error:"Teacher login required"},{status:401});
 const parsed=record.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Invalid old student data"},{status:400});
 const item=parsed.data as OldStudentRecord;
 try{
  const result=await p.$transaction(async tx=>{
   await tx.$executeRaw(Prisma.sql`INSERT INTO "ResultSectionStore" ("section","data","updatedAt") VALUES (${SECTION},'[]'::jsonb,NOW()) ON CONFLICT ("section") DO NOTHING`);
   const rows=await tx.$queryRaw<Array<{section:string;data:Prisma.JsonValue}>>(Prisma.sql`SELECT "section","data" FROM "ResultSectionStore" WHERE "section" IN (${SECTION},'add-viva-marks','old-student-result-updates') ORDER BY "section" FOR UPDATE`);
   const stored=rows.find(row=>row.section===SECTION)?.data;
   const current=Array.isArray(stored)?stored as unknown as OldStudentRecord[]:[];
   const previous=current.find(student=>student.id===item.id);
   if(request.headers.get("If-Match")!==(previous?.updatedAt||"new"))return {error:"This student changed since you opened the page. Refresh the page and reopen the student before saving.",status:409};
   if(current.some(student=>student.id!==item.id&&student.rollNo.trim().toLowerCase()===item.rollNo.trim().toLowerCase()))return {error:"Roll number already exists",status:409};
   const publications=rows.find(row=>row.section==='add-viva-marks')?.data;
   for(const published of (Array.isArray(publications)?publications:[]) as Array<Record<string,unknown>>){
    if(published.published!==true)continue;
    const exam={examYear:String(published.examYear),academicYear:String(published.academicYear),semester:String(published.semester),examType:String(published.examType||"Regular")};
    if(promotionCoursesChanged(previous?.promotions||[],item.promotions,exam))return {error:`Results are published for ${exam.examYear}, ${exam.academicYear} Year ${exam.examType==="Backlog"?"Backlog":exam.semester}. Send that result back before changing its promotion.`,status:409};
   }
   const keys=new Set<string>();
   const statuses=new Map(item.outstandingCourses.map(course=>[course.courseId,course.status]));
   for(const promotion of item.promotions){
    const key=[promotion.examYear,promotion.academicYear,promotion.examType,promotion.examType==="Backlog"?"Backlog":promotion.semester].join('|');
    if(keys.has(key)||new Set(promotion.courseIds).size!==promotion.courseIds.length)return {error:"Duplicate examination promotion or course selection",status:400};keys.add(key);
    const previousPromotion=previous?.promotions.find(saved=>saved.id===promotion.id);
    if(JSON.stringify(previousPromotion)===JSON.stringify(promotion))continue;
    if(promotion.examType==="Backlog"&&promotion.courseIds.some(id=>statuses.get(id)==="need-register"))return {error:"Need-to-register courses cannot be selected for a backlog examination",status:400};
   }
   item.specialPromotions=previous?.specialPromotions;
   item.updatedAt=new Date().toISOString();
   const next=[...current.filter(student=>student.id!==item.id),item];
   await tx.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data"=CAST(${JSON.stringify(next)} AS jsonb),"updatedAt"=NOW() WHERE "section"=${SECTION}`);
   return {records:next,record:item};
  });
  return NextResponse.json(result,{status:'error' in result?result.status:200});
 }catch(error){console.error(error);return NextResponse.json({error:"Unable to save Non-OBE student"},{status:503})}
}
export async function DELETE(request:Request){
 const p=await access();if(!p)return NextResponse.json({error:"Teacher login required"},{status:401});
 const parsed=z.object({id:z.string().min(1)}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Old student ID is required"},{status:400});
 try{const current=await load(p),student=current.find(x=>x.id===parsed.data.id);if(!student)return NextResponse.json({error:"Non-OBE student not found"},{status:404});const next=current.filter(x=>x.id!==parsed.data.id);await save(p,next);return NextResponse.json({records:next,deletedId:student.id})}catch(e){console.error(e);return NextResponse.json({error:"Unable to delete Non-OBE student"},{status:503})}
}

const specialInput=z.object({studentId:z.string().min(1),id:z.string().min(1),examYear:z.string().regex(/^\d{4}$/),academicYear:z.enum(["1st","2nd","3rd","4th"]),semester:z.enum(["Odd","Even","Short Semester","Backlog"]),examType:z.enum(["Regular","Backlog"]),gradePoints:z.number().finite().positive(),courseIds:z.array(z.string().min(1)).min(1)});
export async function PATCH(request:Request){
 const p=await access();if(!p)return NextResponse.json({error:"Teacher login required"},{status:401});
 const parsed=specialInput.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message},{status:400});
 try{const records=await p.$transaction(async tx=>{
  const rows=await tx.$queryRaw<Array<{section:string;data:Prisma.JsonValue}>>(Prisma.sql`SELECT "section","data" FROM "ResultSectionStore" WHERE "section" IN (${SECTION},'syllabuses','old-student-result-updates') ORDER BY "section" FOR UPDATE`);
  const array=(section:string)=>{const value=rows.find(row=>row.section===section)?.data;return Array.isArray(value)?value:[]};
  const students=array(SECTION) as unknown as OldStudentRecord[],student=students.find(item=>item.id===parsed.data.studentId);
  if(!student)throw Error("Student not found.");
  if(request.headers.get('If-Match')!==student.updatedAt)throw Error("Student changed. Refresh the page before recording this examination.");
  const input=parsed.data;
  if((input.examType==='Backlog')!==(input.semester==='Backlog'))throw Error("Select a semester for Regular or Backlog for a backlog exam.");
  const ledger=array('old-student-result-updates') as Array<Record<string,unknown>>;
  if(ledger.some(entry=>entry.applied===true&&entry.examYear===input.examYear&&entry.academicYear===input.academicYear&&entry.examType===input.examType&&(input.examType==='Backlog'||entry.semester===input.semester)&&Array.isArray(entry.students)&&(entry.students as Array<Record<string,unknown>>).some(item=>item.studentId===student.id)))throw Error("This examination has already updated this student's results.");
  const updated=applySpecialPromotion(student,input,(array('syllabuses') as unknown as SyllabusSegment[]).flatMap(item=>item.courses));
  const next=students.map(item=>item.id===student.id?updated:item);
  await tx.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data"=CAST(${JSON.stringify(next)} AS jsonb),"updatedAt"=NOW() WHERE "section"=${SECTION}`);
  return next;
 });return NextResponse.json({records});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to save special promotion"},{status:409})}
}
