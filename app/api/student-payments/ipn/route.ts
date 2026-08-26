import { NextResponse } from "next/server";
import { validateSslcommerzPayment } from "@/lib/sslcommerz";

export async function POST(request: Request) {
  const form = await request.formData();
  const validationId = form.get("val_id")?.toString();
  const transactionId = form.get("tran_id")?.toString();
  if (!validationId || !transactionId) return NextResponse.json({ error: "Missing validation data" }, { status: 400 });

  try {
    await validateSslcommerzPayment(validationId, transactionId);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Payment validation failed" }, { status: 400 });
  }
}
