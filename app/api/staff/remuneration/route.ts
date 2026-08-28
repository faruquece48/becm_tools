import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { defaultStaffRemunerationData } from "@/lib/storage/staffRemuneration";

const STORE_ID = "shared";
const memberSchema = z.object({ id: z.string().min(1).max(100), name: z.string().max(500) });
const courseSchema = z.object({
  id: z.string().min(1).max(100),
  code: z.string().max(100),
  title: z.string().max(300),
  staff: z.array(memberSchema).min(1).max(100),
});
const remunerationSchema = z.object({
  semesters: z.array(z.object({
    id: z.string().min(1).max(100),
    title: z.string().max(300),
    courses: z.array(courseSchema).max(100),
  })).max(50),
});

function validStaffPassword(password: string) {
  const expected = process.env.STAFF_RETURN_PASSWORD || process.env.ADMIN_PASSWORD || "";
  if (!password || !expected || password.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try {
    const saved = await prisma.staffRemunerationStore.findUnique({ where: { id: STORE_ID } });
    return NextResponse.json({ data: saved?.data ?? defaultStaffRemunerationData, updatedAt: saved?.updatedAt ?? null });
  } catch (error) {
    console.error("Unable to load staff remuneration", error);
    return NextResponse.json({ error: "Unable to load shared remuneration data" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { password?: string; data?: unknown } | null;
  if (!validStaffPassword(body?.password || "")) return NextResponse.json({ error: "Incorrect staff password" }, { status: 403 });
  const parsed = remunerationSchema.safeParse(body?.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid remuneration data" }, { status: 400 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try {
    const saved = await prisma.staffRemunerationStore.upsert({
      where: { id: STORE_ID },
      create: { id: STORE_ID, data: parsed.data as Prisma.InputJsonValue },
      update: { data: parsed.data as Prisma.InputJsonValue },
    });
    return NextResponse.json({ data: saved.data, updatedAt: saved.updatedAt });
  } catch (error) {
    console.error("Unable to save staff remuneration", error);
    return NextResponse.json({ error: "Unable to save shared remuneration data" }, { status: 503 });
  }
}