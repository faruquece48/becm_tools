import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try {
    const [orders, profiles] = await Promise.all([
      prisma.rentalOrder.findMany({ include: { items: { include: { book: true } }, payment: { select: { transactionId: true, amount: true, status: true } } }, orderBy: { createdAt: "desc" } }),
      prisma.studentProfile.findMany(),
    ]);
    const profilesByEmail = new Map(profiles.map((profile) => [profile.email, profile]));
    return NextResponse.json({ records: orders.map((order) => ({ ...order, profile: profilesByEmail.get(order.studentEmail) || null })) });
  } catch { return NextResponse.json({ error: "Unable to load lending records" }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const body = await request.json().catch(() => null) as { orderId?: string; itemId?: string; action?: "return" | "mark_paid" | "delete_pending" | "reopen"; password?: string } | null;
  const orderAction = body?.action === "mark_paid" || body?.action === "delete_pending";
  if (!body?.action || (orderAction ? !body.orderId : !body.itemId)) return NextResponse.json({ error: "Invalid rental update request" }, { status: 400 });
  if (body.password !== process.env.STAFF_RETURN_PASSWORD) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  }
  try {
    if (body.action === "delete_pending") {
      const order = await prisma.rentalOrder.findUnique({ where: { id: body.orderId! }, select: { status: true, paymentId: true } });
      if (!order) throw new Error("Pending rental record not found");
      if (order.status !== "PENDING_PAYMENT") throw new Error("Only pending payments can be removed");
      await prisma.studentBillPayment.delete({ where: { id: order.paymentId } });
      return NextResponse.json({ deleted: true });
    }
    await prisma.$transaction(async (tx) => {
      const order = body.action === "mark_paid"
        ? await tx.rentalOrder.findUnique({ where: { id: body.orderId! }, include: { items: true, payment: true } })
        : null;
      if (body.action === "mark_paid" && !order) throw new Error("Rental record not found");
      if (body.action === "mark_paid") {
        if (!order) throw new Error("Rental record not found");
        if (order.status !== "PENDING_PAYMENT") return;
        for (const item of order.items) {
          const updated = await tx.rentalBook.updateMany({
            where: { id: item.bookId, quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } },
          });
          if (updated.count !== 1) throw new Error("A selected rental book is no longer available");
        }
        const rentedAt = new Date();
        const dueAt = new Date(rentedAt);
        dueAt.setUTCDate(dueAt.getUTCDate() + 180);
        await tx.studentBillPayment.update({ where: { id: order.paymentId }, data: { status: "PAID", paidAt: order.payment.paidAt || rentedAt } });
        await tx.rentalOrder.update({ where: { id: order.id }, data: { status: "ACTIVE", rentedAt, dueAt } });
        return;
      }
      const item = await tx.rentalOrderItem.findUnique({ where: { id: body.itemId! }, include: { order: true } });
      if (!item) throw new Error("Rental book record not found");
      if (body.action === "reopen") {
        if (!item.returnedAt) throw new Error("This book has not been returned");
        const updated = await tx.rentalBook.updateMany({ where: { id: item.bookId, quantity: { gte: item.quantity } }, data: { quantity: { decrement: item.quantity } } });
        if (updated.count !== 1) throw new Error("This rental book is no longer available");
        await tx.rentalOrderItem.update({ where: { id: item.id }, data: { returnedAt: null } });
        await tx.rentalOrder.update({ where: { id: item.orderId }, data: { status: "ACTIVE", returnedAt: null } });
        return;
      }
      if (item.returnedAt) return;
      if (item.order.status === "PENDING_PAYMENT") throw new Error("Only paid rental books can be returned");
      const returnedAt = new Date();
      await tx.rentalBook.update({ where: { id: item.bookId }, data: { quantity: { increment: item.quantity } } });
      await tx.rentalOrderItem.update({ where: { id: item.id }, data: { returnedAt } });
      const remaining = await tx.rentalOrderItem.count({ where: { orderId: item.orderId, returnedAt: null } });
      await tx.rentalOrder.update({
        where: { id: item.orderId },
        data: remaining === 0
          ? { status: "RETURNED", returnedAt }
          : { status: "ACTIVE", returnedAt: null },
      });
    }, { maxWait: 15_000, timeout: 30_000 });
    return NextResponse.json({ updated: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to return books" }, { status: 409 }); }
}
