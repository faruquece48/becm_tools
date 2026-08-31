import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

const workspaceSchema = z.object({
  bills: z.array(z.unknown()),
  tableGap: z.number().min(0).max(100),
  remunerationListYear: z.string().max(100),
  indexTableWidth: z.number().min(40).max(100),
  sidebarWidth: z.number().min(260).max(520),
  deletedPageIndexes: z.array(z.number().int().nonnegative()).max(1000).optional().default([]),
});

async function teacherAccount() {
  const teacherId = (await cookies()).get("becm-portal-account")?.value;
  const prisma = getPrisma();
  if (!teacherId || !prisma) return null;
  return prisma.portalAccount.findFirst({
    where: { id: teacherId, role: "teacher", active: true },
    select: { id: true },
  });
}

export async function GET() {
  const teacher = await teacherAccount();
  if (!teacher) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const prisma = getPrisma()!;
  const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue; updatedAt: Date }>>(Prisma.sql`
    SELECT "data", "updatedAt"
    FROM "SummaryWorkspaceStore"
    WHERE "teacherId" = ${teacher.id}
    LIMIT 1
  `);
  return NextResponse.json({ workspace: rows[0]?.data ?? null, updatedAt: rows[0]?.updatedAt ?? null });
}

export async function PUT(request: Request) {
  const teacher = await teacherAccount();
  if (!teacher) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const parsed = workspaceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid Summary workspace" }, { status: 400 });
  const serialized = JSON.stringify(parsed.data);
  if (serialized.length > 15_000_000) return NextResponse.json({ error: "Summary workspace is too large to save" }, { status: 413 });
  const prisma = getPrisma()!;
  const rows = await prisma.$queryRaw<Array<{ updatedAt: Date }>>(Prisma.sql`
    INSERT INTO "SummaryWorkspaceStore" ("id", "teacherId", "data", "updatedAt")
    VALUES (${teacher.id}, ${teacher.id}, CAST(${serialized} AS jsonb), NOW())
    ON CONFLICT ("teacherId") DO UPDATE SET
      "data" = EXCLUDED."data",
      "updatedAt" = NOW()
    RETURNING "updatedAt"
  `);
  return NextResponse.json({ saved: true, updatedAt: rows[0]?.updatedAt ?? null });
}

export async function DELETE() {
  const teacher = await teacherAccount();
  if (!teacher) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const prisma = getPrisma()!;
  await prisma.$executeRaw(Prisma.sql`DELETE FROM "SummaryWorkspaceStore" WHERE "teacherId" = ${teacher.id}`);
  return NextResponse.json({ deleted: true });
}
