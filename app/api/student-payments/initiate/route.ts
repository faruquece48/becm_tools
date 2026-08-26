import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { calculateStudentBill, studentPaymentSchema } from "@/lib/studentBillPayment";
import { initiateSslcommerzPayment, sslcommerzIsConfigured, sslcommerzMode } from "@/lib/sslcommerz";

export async function POST(request: Request) {
 try {
  const parsed = studentPaymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payment details" }, { status: 400 });
  }

  const { rentalBooks = [], ...paymentInput } = parsed.data;
  const rentalBookCount = rentalBooks?.reduce((sum, book) => sum + book.quantity, 0) ?? paymentInput.rentalBookCount;
  const normalizedPayment = { ...paymentInput, rentalBookCount };
  const amount = calculateStudentBill(normalizedPayment);
  if (amount < 10) {
    return NextResponse.json({ error: "Select at least one paid item before continuing" }, { status: 400 });
  }

  if (!sslcommerzIsConfigured()) {
    return NextResponse.json({ error: "SSLCOMMERZ Store ID and Store Password are empty in this project's .env file. Save them and restart the server." }, { status: 503 });
  }

  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });

  const selectedBooks = rentalBooks.length ? await prisma.rentalBook.findMany({ where: { id: { in: rentalBooks.map((book) => book.id) }, active: true } }) : [];
  if (selectedBooks.length !== rentalBooks.length || selectedBooks.some((book) => book.quantity < 1)) {
    return NextResponse.json({ error: "One or more selected books are no longer available" }, { status: 409 });
  }
  if (selectedBooks.length) {
    const activeOrders = await prisma.rentalOrder.findMany({ where: { studentEmail: parsed.data.email.toLowerCase(), status: "ACTIVE" }, include: { items: true } });
    const activeItems = activeOrders.flatMap((order) => order.items);
    if (activeItems.length + selectedBooks.length > 5) {
      return NextResponse.json({ error: `You may have at most 5 active rental books. You currently have ${activeItems.length}.` }, { status: 409 });
    }
    const activeBookIds = new Set(activeItems.map((item) => item.bookId));
    if (selectedBooks.some((book) => activeBookIds.has(book.id))) {
      return NextResponse.json({ error: "You already have one of the selected books on rent" }, { status: 409 });
    }
  }

  const transactionId = `BECM-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`.toUpperCase();
  await prisma.studentBillPayment.create({ data: {
    transactionId, ...normalizedPayment, amount, status: "PENDING",
    ...(selectedBooks.length ? { rentalOrder: { create: {
      studentName: parsed.data.studentName,
      studentEmail: parsed.data.email.toLowerCase(),
      studentPhone: parsed.data.phone,
      items: { create: selectedBooks.map((book) => ({ bookId: book.id, quantity: 1, unitPrice: book.price })) },
    } } } : {}),
  } });

  try {
    const paymentUrl = await initiateSslcommerzPayment({
      transactionId,
      amount,
      customerName: parsed.data.studentName,
      customerEmail: parsed.data.email,
      customerPhone: parsed.data.phone,
      origin: new URL(request.url).origin,
    });
    return NextResponse.json({ paymentUrl, transactionId, mode: sslcommerzMode() });
  } catch (error) {
    await prisma.studentBillPayment.update({ where: { transactionId }, data: { status: "INIT_FAILED" } }).catch(() => undefined);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment initialization failed" }, { status: 502 });
  }
 } catch (error) {
   console.error("Student payment initiation failed", error);
   return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create the payment record" }, { status: 500 });
 }
}
