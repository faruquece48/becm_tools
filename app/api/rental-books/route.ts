import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { normalizeBookImageUrl } from "@/lib/bookImage";

const bookSchema = z.object({
  id: z.string().min(1).optional(), title: z.string().trim().min(2).max(200),
  author: z.string().trim().min(2).max(150), imageUrl: z.string().trim().min(1).max(1000),
  edition: z.string().trim().max(100).optional().transform((value) => value || undefined),
  publication: z.string().trim().max(200).optional().transform((value) => value || undefined),
  quantity: z.number().int().min(0).max(10000), active: z.boolean().default(true),
});

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try {
    return NextResponse.json({ books: await prisma.rentalBook.findMany({ where: { active: true }, orderBy: { title: "asc" } }) });
  } catch (error) {
    console.error("Unable to load rental books", error);
    return NextResponse.json({ error: "Unable to connect to the rental library database" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const parsed = bookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid book" }, { status: 400 });
  const data = { ...parsed.data };
  delete data.id;
  data.imageUrl = normalizeBookImageUrl(data.imageUrl);
  try {
    const duplicate = await prisma.rentalBook.findFirst({ where: {
      active: true,
      title: { equals: data.title, mode: "insensitive" },
      author: { equals: data.author, mode: "insensitive" },
      edition: data.edition ? { equals: data.edition, mode: "insensitive" } : null,
      publication: data.publication ? { equals: data.publication, mode: "insensitive" } : null,
    } });
    if (duplicate) return NextResponse.json({ error: "This book is already registered. Edit its existing quantity instead." }, { status: 409 });
    return NextResponse.json({ book: await prisma.rentalBook.create({ data: { ...data, price: 20 } }) }, { status: 201 });
  } catch (error) {
    console.error("Unable to create rental book", error);
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This book is already registered. Edit its existing quantity instead." }, { status: 409 });
    return NextResponse.json({ error: "Unable to save the book to the database" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const parsed = bookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) return NextResponse.json({ error: "Invalid book" }, { status: 400 });
  const { id, ...data } = parsed.data;
  data.imageUrl = normalizeBookImageUrl(data.imageUrl);
  try {
    const duplicate = await prisma.rentalBook.findFirst({ where: {
      id: { not: id }, active: true,
      title: { equals: data.title, mode: "insensitive" },
      author: { equals: data.author, mode: "insensitive" },
      edition: data.edition ? { equals: data.edition, mode: "insensitive" } : null,
      publication: data.publication ? { equals: data.publication, mode: "insensitive" } : null,
    } });
    if (duplicate) return NextResponse.json({ error: "Another identical book is already registered." }, { status: 409 });
    return NextResponse.json({ book: await prisma.rentalBook.update({ where: { id }, data }) });
  } catch (error) {
    console.error("Unable to update rental book", error);
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Another identical book is already registered." }, { status: 409 });
    return NextResponse.json({ error: "Unable to update the book in the database" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing book ID" }, { status: 400 });
  await prisma.rentalBook.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ deleted: true });
}
