import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

async function handle(request: Request, transactionId?: string) {
  if (transactionId) await getPrisma()?.studentBillPayment.updateMany({ where: { transactionId, status: "PENDING" }, data: { status: "CANCELLED" } });
  const origin = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  return NextResponse.redirect(`${origin}/student/bill-payment/status?result=cancelled${transactionId ? `&transactionId=${encodeURIComponent(transactionId)}` : ""}`, 303);
}

export async function POST(request: Request) {
  const form = await request.formData();
  return handle(request, form.get("tran_id")?.toString());
}

export async function GET(request: Request) {
  return handle(request, new URL(request.url).searchParams.get("tran_id") || undefined);
}
