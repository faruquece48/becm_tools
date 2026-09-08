import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getPrisma } from "@/lib/prisma";
import { promotionRegistrationReason, type PromotionAudit } from "@/lib/studentPromotionAudit";
import type { StudentDirectoryRecord } from "@/lib/storage/studentDirectory";
const sections = ['student-directory','student-promotion-history','student-eligibility','prepare-result','add-viva-marks','marks-sheet','result-sheet'];
type Store = { section: string; data: Prisma.JsonValue };
function array<T>(rows: Store[], section: string): T[] { const value=rows.find(row=>row.section===section)?.data;return Array.isArray(value)?value as unknown as T[]:[]; }
function reason(entry: PromotionAudit, students: StudentDirectoryRecord[], rows: Store[]) {
  if(entry.cancelledAt)return 'Cancelled';
  const student=students.find(item=>item.id===entry.studentId);
  if(!student)return 'Student no longer in active directory';
  if(student.year!==entry.after.year||student.semester!==entry.after.semester||student.placementExamYear!==entry.after.placementExamYear)return 'Student has since moved to another semester';
  return promotionRegistrationReason(student,rows);
}
export async function GET(){
 if(!await isAdminAuthenticated())return NextResponse.json({error:'Admin login required'},{status:401});
 const p=getPrisma();if(!p)return NextResponse.json({error:'Database unavailable'},{status:503});
 const rows=await p.$queryRaw<Store[]>(Prisma.sql`SELECT "section","data" FROM "ResultSectionStore" WHERE "section" IN (${Prisma.join(sections)})`);
 const students=array<StudentDirectoryRecord>(rows,'student-directory'),history=array<PromotionAudit>(rows,'student-promotion-history');
 const records=history.map(entry=>({...entry,blockedReason:reason(entry,students,rows)}));
 const legacy=students.filter(student=>student.promotionSource&&!history.some(entry=>entry.studentId===student.id)).map(student=>({id:'legacy-'+student.id,studentId:student.id,name:student.name,rollNo:student.rollNo,series:student.series,promotedAt:student.promotionSource!.promotedAt,before:{year:student.promotionSource!.academicYear,semester:student.promotionSource!.semester,placementExamYear:student.promotionSource!.examYear},after:student,blockedReason:'Historical promotion: original placement snapshot is unavailable; cancellation is disabled.'}));
 return NextResponse.json({records:[...records,...legacy]},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 if(!await isAdminAuthenticated())return NextResponse.json({error:'Admin login required'},{status:401});
 const p=getPrisma();if(!p)return NextResponse.json({error:'Database unavailable'},{status:503});
 const body=await request.json().catch(()=>null);if(typeof body?.id!=='string')return NextResponse.json({error:'Promotion required'},{status:400});
 try{await p.$transaction(async tx=>{
  const rows=await tx.$queryRaw<Store[]>(Prisma.sql`SELECT "section","data" FROM "ResultSectionStore" WHERE "section" IN (${Prisma.join(sections)}) ORDER BY "section" FOR UPDATE`);
  const students=array<StudentDirectoryRecord>(rows,'student-directory'),history=array<PromotionAudit>(rows,'student-promotion-history'),entry=history.find(item=>item.id===body.id);
  if(!entry)throw Error('Promotion not found');const blocked=reason(entry,students,rows);if(blocked)throw Error(blocked);
  const index=students.findIndex(item=>item.id===entry.studentId),current=students[index];
  if(JSON.stringify(current.backlogEligibility)!==JSON.stringify(entry.after.backlogEligibility)||JSON.stringify(current.promotionSource)!==JSON.stringify(entry.after.promotionSource)||JSON.stringify(current.obeBatchPlacements)!==JSON.stringify(entry.after.obeBatchPlacements))throw Error('Student placement has changed since promotion. Cancellation requires review.');
  students[index]={...current,year:entry.before.year,semester:entry.before.semester,placementExamYear:entry.before.placementExamYear,section:entry.before.section,backlogEligibility:entry.before.backlogEligibility,promotionSource:entry.before.promotionSource};
  entry.cancelledAt=new Date().toISOString();
  for(const [section,data] of [['student-directory',students],['student-promotion-history',history]] as const)await tx.$executeRaw(Prisma.sql`UPDATE "ResultSectionStore" SET "data"=CAST(${JSON.stringify(data)} AS jsonb),"updatedAt"=NOW() WHERE "section"=${section}`);
 });return NextResponse.json({success:true});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Cancellation failed'},{status:409})}
}
