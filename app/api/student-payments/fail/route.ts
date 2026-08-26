import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const form = await request.formData();
  const transactionId = form.get("tran_id")?.toString();
  if (transactionId) await getPrisma()?.studentBillPayment.updateMany({ where: { transactionId, status: "PENDING" }, data: { status: "FAILED" } });
  const origin = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  return NextResponse.redirect(`${origin}/student/bill-payment/status?result=failed${transactionId ? `&transactionId=${encodeURIComponent(transactionId)}` : ""}`, 303);
}
