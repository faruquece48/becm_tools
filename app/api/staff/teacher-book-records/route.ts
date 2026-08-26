import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try {
    const [teachers, books, records] = await Promise.all([
      prisma.portalAccount.findMany({ where: { role: { equals: "teacher", mode: "insensitive" }, active: true }, select: { name: true, email: true }, orderBy: { name: "asc" } }),
      prisma.rentalBook.findMany({ where: { active: true }, orderBy: { title: "asc" } }),
      prisma.teacherRentalRecord.findMany({ include: { items: { include: { book: true } } }, orderBy: { createdAt: "desc" } }),
    ]);
    return NextResponse.json({ teachers, books, records });
  } catch {
    return NextResponse.json({ error: "Unable to load teacher book records" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const body = await request.json().catch(() => null) as { teacherName?: string; teacherEmail?: string; bookIds?: string[]; issuedAt?: string } | null;
  const teacherName = body?.teacherName?.trim();
  const bookIds = Array.from(new Set(body?.bookIds || []));
  if (!teacherName || bookIds.length < 1) return NextResponse.json({ error: "Teacher name and at least one book are required" }, { status: 400 });
  if (bookIds.length > 5) return NextResponse.json({ error: "A maximum of 5 books can be entered at once" }, { status: 400 });
  try {
    const record = await prisma.$transaction(async (tx) => {
      const books = await tx.rentalBook.findMany({ where: { id: { in: bookIds }, active: true } });
      if (books.length !== bookIds.length || books.some((book) => book.quantity < 1)) throw new Error("One or more selected books are unavailable");
      for (const book of books) {
        const updated = await tx.rentalBook.updateMany({ where: { id: book.id, quantity: { gte: 1 } }, data: { quantity: { decrement: 1 } } });
        if (updated.count !== 1) throw new Error(`${book.title} is no longer available`);
      }
      const issuedAt = body?.issuedAt ? new Date(`${body.issuedAt}T00:00:00.000Z`) : new Date();
      return tx.teacherRentalRecord.create({
        data: {
          teacherName,
          teacherEmail: body?.teacherEmail?.trim().toLowerCase() || null,
          issuedAt: !Number.isNaN(issuedAt.getTime()) ? issuedAt : new Date(),
          items: { create: books.map((book) => ({ bookId: book.id })) },
        },
      });
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save teacher book record" }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const body = await request.json().catch(() => null) as { itemId?: string; action?: "return" | "reopen"; password?: string } | null;
  if (!body?.itemId || !body.action) return NextResponse.json({ error: "Invalid teacher rental update" }, { status: 400 });
  if (body.password !== process.env.STAFF_RETURN_PASSWORD) return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.teacherRentalItem.findUnique({ where: { id: body.itemId } });
      if (!item) throw new Error("Teacher rental book not found");
      if (body.action === "return") {
        if (item.returnedAt) return;
        const returnedAt = new Date();
        await tx.rentalBook.update({ where: { id: item.bookId }, data: { quantity: { increment: item.quantity } } });
        await tx.teacherRentalItem.update({ where: { id: item.id }, data: { returnedAt } });
        const remaining = await tx.teacherRentalItem.count({ where: { recordId: item.recordId, returnedAt: null } });
        await tx.teacherRentalRecord.update({ where: { id: item.recordId }, data: remaining === 0 ? { status: "RETURNED", returnedAt } : { status: "ACTIVE", returnedAt: null } });
      } else {
        if (!item.returnedAt) return;
        const updated = await tx.rentalBook.updateMany({ where: { id: item.bookId, quantity: { gte: item.quantity } }, data: { quantity: { decrement: item.quantity } } });
        if (updated.count !== 1) throw new Error("This book is no longer available");
        await tx.teacherRentalItem.update({ where: { id: item.id }, data: { returnedAt: null } });
        await tx.teacherRentalRecord.update({ where: { id: item.recordId }, data: { status: "ACTIVE", returnedAt: null } });
      }
    });
    return NextResponse.json({ updated: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update teacher rental" }, { status: 409 });
  }
}
