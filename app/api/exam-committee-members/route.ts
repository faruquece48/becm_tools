import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getPrisma } from "@/lib/prisma";
import { defaultTeacherRankData } from "@/lib/storage/teacherRank";

const SECTION = "examination-committee-members";
const normalizeName = (name: string) => name.trim().replace(/^(?:Mr|Mrs)\.?(?:\s+|$)/i, "").trim();
const namesSchema = z.array(z.string().trim().min(1).max(200)).max(500).transform((names) => {
  const unique = new Map<string, string>();
  names.map(normalizeName).filter(Boolean).forEach((name) => unique.set(name.toLocaleLowerCase(), name));
  return [...unique.values()].sort((a, b) => a.localeCompare(b));
});
const defaults = ["Head", ...defaultTeacherRankData.departments.flatMap((department) => department.teachers.map((teacher) => teacher.name))];

async function load() {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured");
  const seed = JSON.stringify(namesSchema.parse(defaults));
  await prisma.$executeRaw(Prisma.sql`INSERT INTO "ResultSectionStore" ("section", "data", "updatedAt") VALUES (${SECTION}, CAST(${seed} AS jsonb), NOW()) ON CONFLICT ("section") DO NOTHING`);
  const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section" = ${SECTION} LIMIT 1`);
  return namesSchema.parse(rows[0]?.data ?? defaults);
}

export async function GET() {
  try { return NextResponse.json({ names: await load() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("Unable to load examination committee members", error); return NextResponse.json({ error: "Unable to load examination committee members" }, { status: 503 }); }
}

export async function PUT(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const parsed = namesSchema.safeParse((await request.json().catch(() => null) as { names?: unknown } | null)?.names);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid committee member names" }, { status: 400 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try {
    const serialized = JSON.stringify(parsed.data);
    await prisma.$executeRaw(Prisma.sql`INSERT INTO "ResultSectionStore" ("section", "data", "updatedAt") VALUES (${SECTION}, CAST(${serialized} AS jsonb), NOW()) ON CONFLICT ("section") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = NOW()`);
    return NextResponse.json({ names: parsed.data });
  } catch (error) { console.error("Unable to save examination committee members", error); return NextResponse.json({ error: "Unable to save examination committee members" }, { status: 503 }); }
}