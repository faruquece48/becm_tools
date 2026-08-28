import { createHmac, randomInt } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { sendAccountEmail } from "@/lib/gmail";

const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");
export function hashRentalActivationCode(code: string) {
  const secret = process.env.ADMIN_PASSWORD || process.env.STAFF_RETURN_PASSWORD || "becm-rental";
  return createHmac("sha256", secret).update(normalizeCode(code)).digest("hex");
}
export async function sendRentalActivationForTransaction(transactionId: string) {
  const prisma = getPrisma(); if (!prisma) throw new Error("Database is not configured");
  const rows = await prisma.$queryRaw<Array<{ orderId:string; email:string; status:string; sentAt:Date|null }>>`SELECT ro."id" AS "orderId", p."email", ro."status", ro."activationCodeSentAt" AS "sentAt" FROM "StudentBillPayment" p JOIN "RentalOrder" ro ON ro."paymentId"=p."id" WHERE p."transactionId"=${transactionId} LIMIT 1`;
  const order=rows[0]; if(!order||order.status!=="AWAITING_ACTIVATION"||order.sentAt)return false;
  const items=await prisma.rentalOrderItem.findMany({where:{orderId:order.orderId},include:{book:true}});
  const code=randomInt(100000,1000000).toString(); const codeHash=hashRentalActivationCode(code);
  const claimed=await prisma.$executeRaw`UPDATE "RentalOrder" SET "activationCodeHash"=${codeHash}, "activationCodeSentAt"=NOW(), "updatedAt"=NOW() WHERE "id"=${order.orderId} AND "status"='AWAITING_ACTIVATION' AND "activationCodeSentAt" IS NULL`;
  if(claimed!==1)return false;
  try { const titles=items.map(item=>item.book.title).join(", "); await sendAccountEmail(order.email,"BECM rental book activation code",`Your paid rental book activation code is: ${code}\n\nBooks: ${titles}\n\nGive this code to the BECM office. Your 180-day rental validity will begin when staff activates the code.`); return true; }
  catch(error){await prisma.$executeRaw`UPDATE "RentalOrder" SET "activationCodeHash"=NULL, "activationCodeSentAt"=NULL WHERE "id"=${order.orderId} AND "activationCodeHash"=${codeHash}`;throw error;}
}
