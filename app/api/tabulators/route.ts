import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { defaultTabulatorRecords } from "@/lib/storage/tabulators";

const STORE_ID = "shared";
const recordSchema = z.object({ id: z.string().min(1).max(100), examType: z.enum(["Regular", "Backlog"]), examYear: z.string().max(20), academicYear: z.string().max(20), semester: z.enum(["Odd", "Even", ""]), chairman: z.string().max(200), member1: z.string().max(200), member2: z.string().max(200), formDate: z.string().max(20), reportingDate: z.string().max(20) });
const recordsSchema = z.array(recordSchema).max(1000);

async function teacherPrisma() {
  const id = (await cookies()).get("becm-portal-account")?.value;
  const prisma = getPrisma();
  if (!id || !prisma) return null;
  const teacher = await prisma.portalAccount.findFirst({ where: { id, role: "teacher", active: true }, select: { id: true } });
  return teacher ? prisma : null;
}

export async function GET() {
  const prisma = await teacherPrisma();
  if (!prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  try {
    const seed = JSON.stringify(defaultTabulatorRecords);
    await prisma.$executeRaw(Prisma.sql`INSERT INTO "TabulatorStore" ("id", "data", "updatedAt") VALUES (${STORE_ID}, CAST(${seed} AS jsonb), NOW()) ON CONFLICT ("id") DO NOTHING`);
    const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue; updatedAt: Date }>>(Prisma.sql`SELECT "data", "updatedAt" FROM "TabulatorStore" WHERE "id" = ${STORE_ID} LIMIT 1`);
    return NextResponse.json({ data: recordsSchema.parse(rows[0]?.data ?? defaultTabulatorRecords), updatedAt: rows[0]?.updatedAt ?? null });
  } catch (error) { console.error("Unable to load tabulators", error); return NextResponse.json({ error: "Unable to load tabulators" }, { status: 503 }); }
}

export async function PUT(request: Request) {
  const prisma = await teacherPrisma();
  if (!prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const parsed = recordsSchema.safeParse((await request.json().catch(() => null) as { data?: unknown } | null)?.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid tabulator data" }, { status: 400 });
  try {
    const serialized = JSON.stringify(parsed.data);
    const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue; updatedAt: Date }>>(Prisma.sql`INSERT INTO "TabulatorStore" ("id", "data", "updatedAt") VALUES (${STORE_ID}, CAST(${serialized} AS jsonb), NOW()) ON CONFLICT ("id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = NOW() RETURNING "data", "updatedAt"`);
    return NextResponse.json({ data: rows[0]?.data ?? parsed.data, updatedAt: rows[0]?.updatedAt ?? null });
  } catch (error) { console.error("Unable to save tabulators", error); return NextResponse.json({ error: "Unable to save tabulators" }, { status: 503 }); }
}