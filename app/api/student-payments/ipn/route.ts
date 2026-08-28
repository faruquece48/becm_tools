import { NextResponse } from "next/server";
import { validateSslcommerzPayment } from "@/lib/sslcommerz";
import { sendRentalActivationForTransaction } from "@/lib/rentalActivation";
import { sendStudentServiceVerificationCodes } from "@/lib/studentServiceVerification";

export async function POST(request: Request) {
  const form = await request.formData();
  const validationId = form.get("val_id")?.toString();
  const transactionId = form.get("tran_id")?.toString();
  if (!validationId || !transactionId) return NextResponse.json({ error: "Missing validation data" }, { status: 400 });

  try {
    await validateSslcommerzPayment(validationId, transactionId);
    await sendRentalActivationForTransaction(transactionId).catch((error) => console.error("Unable to email rental activation code", error));
    await sendStudentServiceVerificationCodes(transactionId).catch((error) => console.error("Unable to email service verification codes", error));
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Payment validation failed" }, { status: 400 });
  }
}
