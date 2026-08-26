import { NextResponse } from "next/server";
import { validateSslcommerzPayment } from "@/lib/sslcommerz";

export async function POST(request: Request) {
  const form = await request.formData();
  const validationId = form.get("val_id")?.toString();
  const transactionId = form.get("tran_id")?.toString();
  const origin = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "");

  if (!validationId || !transactionId) {
    return NextResponse.redirect(`${origin}/student/bill-payment/status?result=failed`, 303);
  }

  try {
    await validateSslcommerzPayment(validationId, transactionId);
    return NextResponse.redirect(`${origin}/student/bill-payment/status?result=success&transactionId=${encodeURIComponent(transactionId)}`, 303);
  } catch {
    return NextResponse.redirect(`${origin}/student/bill-payment/status?result=failed&transactionId=${encodeURIComponent(transactionId)}`, 303);
  }
}
