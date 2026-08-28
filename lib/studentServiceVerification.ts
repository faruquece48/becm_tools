import { createHmac, randomInt, randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { sendAccountEmail } from "@/lib/gmail";
export type StudentService = "lab-report" | "association-fee" | "letter-attestation" | "equivalent-certificate";
export const serviceLabels: Record<StudentService,string> = { "lab-report":"Lab Report", "association-fee":"BECM Association Fee", "letter-attestation":"Letter of Attestation", "equivalent-certificate":"Equivalent Certificate" };
const secret=()=>process.env.ADMIN_PASSWORD||process.env.STAFF_RETURN_PASSWORD||"becm-service";
export const hashStudentServiceCode=(service:StudentService,code:string)=>createHmac("sha256",secret()).update(`${service}:${code.trim()}`).digest("hex");
export async function sendStudentServiceVerificationCodes(transactionId:string){
 const prisma=getPrisma(); if(!prisma)throw new Error("Database is not configured");
 const rows=await prisma.$queryRaw<Array<{id:string;email:string;labReportOption:string;associationYear:number;letterOfAttestation:boolean;equivalentCertificate:boolean}>>`SELECT "id","email","labReportOption","associationYear","letterOfAttestation","equivalentCertificate" FROM "StudentBillPayment" WHERE "transactionId"=${transactionId} AND "status"='PAID' LIMIT 1`;
 const payment=rows[0]; if(!payment)return [];
 const services:StudentService[]=[]; if(payment.labReportOption!=="none")services.push("lab-report"); if(payment.associationYear>0)services.push("association-fee"); if(payment.letterOfAttestation)services.push("letter-attestation"); if(payment.equivalentCertificate)services.push("equivalent-certificate");
 const sent:string[]=[];
 for(const service of services){const exists=await prisma.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "StudentServiceVerification" WHERE "paymentId"=${payment.id} AND "service"=${service} LIMIT 1`;if(exists.length)continue;const code=randomInt(100000,1000000).toString();const codeHash=hashStudentServiceCode(service,code);const id=randomUUID();try{await prisma.$executeRaw`INSERT INTO "StudentServiceVerification" ("id","paymentId","service","codeHash","sentAt","createdAt","updatedAt") VALUES (${id},${payment.id},${service},${codeHash},NOW(),NOW(),NOW())`;}catch{continue;}try{await sendAccountEmail(payment.email,`${serviceLabels[service]} verification code`,`Your six-digit ${serviceLabels[service]} verification code is: ${code}\n\nTransaction: ${transactionId}\n\nGive this code to the BECM office. It can be verified only once.`);sent.push(service);}catch(error){await prisma.$executeRaw`DELETE FROM "StudentServiceVerification" WHERE "id"=${id}`;throw error;}}
 return sent;
}