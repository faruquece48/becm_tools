import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { defaultTeacherRankData, normalizeTeacherRankData } from "@/lib/storage/teacherRank";

const STORE_ID = "shared";
const teacherSchema = z.object({ id: z.string().min(1).max(100), name: z.string().trim().min(1).max(200) });
const rankSchema = z.object({
  departments: z.array(z.object({
    id: z.enum(["becm", "ce", "arch", "eee", "me", "math", "chem", "phy", "hum", "other-university"]),
    title: z.string().trim().min(1).max(200),
    teachers: z.array(teacherSchema).max(300),
  })).length(10),
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
    const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue; updatedAt: Date }>>(Prisma.sql`SELECT "data", "updatedAt" FROM "TeacherRankStore" WHERE "id" = ${STORE_ID} LIMIT 1`);
    const saved = rows[0];
    return NextResponse.json({ data: normalizeTeacherRankData(saved?.data ?? defaultTeacherRankData), updatedAt: saved?.updatedAt ?? null });
  } catch (error) {
    console.error("Unable to load teacher ranks", error);
    return NextResponse.json({ error: "Unable to load shared teacher ranks" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { password?: string; data?: unknown } | null;
  if (!validStaffPassword(body?.password || "")) return NextResponse.json({ error: "Incorrect staff password" }, { status: 403 });
  const parsed = rankSchema.safeParse(body?.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid teacher rank data" }, { status: 400 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try {
    const serialized = JSON.stringify(parsed.data);
    const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue; updatedAt: Date }>>(Prisma.sql`
      INSERT INTO "TeacherRankStore" ("id", "data", "updatedAt")
      VALUES (${STORE_ID}, CAST(${serialized} AS jsonb), NOW())
      ON CONFLICT ("id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = NOW()
      RETURNING "data", "updatedAt"
    `);
    const saved = rows[0];
    return NextResponse.json({ data: saved?.data ?? parsed.data, updatedAt: saved?.updatedAt ?? null });
  } catch (error) {
    console.error("Unable to save teacher ranks", error);
    return NextResponse.json({ error: "Unable to save shared teacher ranks" }, { status: 503 });
  }
}