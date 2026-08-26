import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Student email is required" }, { status: 400 });
  const orders = await prisma.rentalOrder.findMany({
    where: {
      studentEmail: email,
      status: "ACTIVE",
      items: { some: { returnedAt: null } },
    },
    include: {
      items: {
        where: { returnedAt: null },
        include: { book: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}
