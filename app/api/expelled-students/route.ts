import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import type { ExpelledStudentRecord } from "@/lib/storage/expelledStudents";

const SECTION = "expelled-students";

export async function GET() {
  const id = (await cookies()).get("becm-portal-account")?.value;
  const prisma = getPrisma();
  if (!id || !prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const teacher = await prisma.portalAccount.findFirst({ where: { id, role: "teacher", active: true }, select: { id: true } });
  if (!teacher) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  try {
    await prisma.$executeRaw(Prisma.sql`INSERT INTO "ResultSectionStore" ("section", "data", "updatedAt") VALUES (${SECTION}, '[]'::jsonb, NOW()) ON CONFLICT ("section") DO NOTHING`);
    const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section" = ${SECTION} LIMIT 1`);
    const records = Array.isArray(rows[0]?.data) ? rows[0].data as unknown as ExpelledStudentRecord[] : [];
    return NextResponse.json({ records }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load expelled students for result preparation", error);
    return NextResponse.json({ error: "Unable to load expelled students" }, { status: 503 });
  }
}
