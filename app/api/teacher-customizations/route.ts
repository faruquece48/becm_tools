import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

const payloadSchema = z.object({
  preview: z.unknown().optional(),
  summary: z.unknown().optional(),
}).refine((value) => value.preview !== undefined || value.summary !== undefined, "No customization supplied");

async function teacherAccount() {
  const id = (await cookies()).get("becm-portal-account")?.value;
  const prisma = getPrisma();
  if (!id || !prisma) return null;
  return prisma.portalAccount.findFirst({ where: { id, role: "teacher", active: true }, select: { id: true, email: true, name: true } });
}

export async function GET() {
  const teacher = await teacherAccount();
  if (!teacher) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const prisma = getPrisma()!;
  const rows = await prisma.$queryRaw<Array<{ preview: Prisma.JsonValue | null; summary: Prisma.JsonValue | null; updatedAt: Date }>>(Prisma.sql`SELECT "preview", "summary", "updatedAt" FROM "TeacherCustomizationStore" WHERE "teacherId" = ${teacher.id} LIMIT 1`);
  return NextResponse.json({ teacher, customization: rows[0] ?? { preview: null, summary: null, updatedAt: null } });
}

export async function PATCH(request: Request) {
  const teacher = await teacherAccount();
  if (!teacher) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid customization" }, { status: 400 });
  const serialized = JSON.stringify(parsed.data);
  if (serialized.length > 2_000_000) return NextResponse.json({ error: "Customization data is too large" }, { status: 413 });
  const prisma = getPrisma()!;
  const hasPreview = parsed.data.preview !== undefined;
  const hasSummary = parsed.data.summary !== undefined;
  const preview = JSON.stringify(parsed.data.preview ?? null);
  const summary = JSON.stringify(parsed.data.summary ?? null);
  const rows = await prisma.$queryRaw<Array<{ preview: Prisma.JsonValue | null; summary: Prisma.JsonValue | null; updatedAt: Date }>>(Prisma.sql`
    INSERT INTO "TeacherCustomizationStore" ("id", "teacherId", "preview", "summary", "updatedAt")
    VALUES (${teacher.id}, ${teacher.id}, CASE WHEN ${hasPreview} THEN CAST(${preview} AS jsonb) ELSE NULL END, CASE WHEN ${hasSummary} THEN CAST(${summary} AS jsonb) ELSE NULL END, NOW())
    ON CONFLICT ("teacherId") DO UPDATE SET
      "preview" = CASE WHEN ${hasPreview} THEN CAST(${preview} AS jsonb) ELSE "TeacherCustomizationStore"."preview" END,
      "summary" = CASE WHEN ${hasSummary} THEN CAST(${summary} AS jsonb) ELSE "TeacherCustomizationStore"."summary" END,
      "updatedAt" = NOW()
    RETURNING "preview", "summary", "updatedAt"
  `);
  return NextResponse.json({ customization: rows[0] });
}