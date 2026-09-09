import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

const sections = [
  "student-directory", "syllabuses", "student-eligibility", "prepare-result",
  "prepare-result-backlog", "add-viva-marks", "old-student-directory",
  "marks-sheet", "marks-sheet-backlog", "result-sheet", "result-sheet-backlog", "old-student-result-updates",
] as const;

export async function GET() {
  const accountId = (await cookies()).get("becm-portal-account")?.value;
  const prisma = getPrisma();
  if (!accountId || !prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  const teacher = await prisma.portalAccount.findFirst({ where: { id: accountId, role: "teacher", active: true }, select: { id: true } });
  if (!teacher) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  try {
    const rows = await prisma.$queryRaw<Array<{ section: string; data: Prisma.JsonValue }>>(
      Prisma.sql`SELECT "section", "data" FROM "ResultSectionStore" WHERE "section" IN (${Prisma.join([...sections])})`,
    );
    const data = Object.fromEntries(sections.map((section) => [section, rows.find((row) => row.section === section)?.data ?? []]));
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (error) {
    console.error("Unable to load Excel result input data", error);
    return NextResponse.json({ error: "Unable to load Excel result input data" }, { status: 503 });
  }
}