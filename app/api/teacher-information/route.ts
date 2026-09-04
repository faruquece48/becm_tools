import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { mergeDefaultTeacherInformation } from "@/lib/storage/individualTeacher";

const SECTION = "bill-teacher-information";
const informationSchema = z.object({
  englishName: z.string().max(250).optional(),
  departmentKey: z.string().max(100).optional(),
  nameBangla: z.string().max(500),
  designationBangla: z.string().max(500),
  addressBangla: z.string().max(1000),
  accountNumber: z.string().max(250),
  email: z.string().max(254).optional(),
});
const directorySchema = z.record(z.string().max(250), informationSchema);

async function teacherPrisma() {
  const teacherId = (await cookies()).get("becm-portal-account")?.value;
  const prisma = getPrisma();
  if (!teacherId || !prisma) return null;
  const teacher = await prisma.portalAccount.findFirst({
    where: { id: teacherId, role: "teacher", active: true },
    select: { id: true },
  });
  return teacher ? prisma : null;
}

export async function GET() {
  const prisma = await teacherPrisma();
  if (!prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue; updatedAt: Date }>>(Prisma.sql`
    SELECT "data", "updatedAt" FROM "ResultSectionStore" WHERE "section" = ${SECTION} LIMIT 1
  `);
  return NextResponse.json({ records: mergeDefaultTeacherInformation(rows[0]?.data), updatedAt: rows[0]?.updatedAt ?? null });
}

export async function PUT(request: Request) {
  const prisma = await teacherPrisma();
  if (!prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const parsed = directorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid teacher information" }, { status: 400 });
  const serialized = JSON.stringify(parsed.data);
  if (serialized.length > 2_000_000) return NextResponse.json({ error: "Teacher information is too large" }, { status: 413 });
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "ResultSectionStore" ("section", "data", "updatedAt")
    VALUES (${SECTION}, CAST(${serialized} AS jsonb), NOW())
    ON CONFLICT ("section") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = NOW()
  `);
  return NextResponse.json({ saved: true, records: parsed.data });
}
