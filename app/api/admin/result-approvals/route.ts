import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getPrisma } from "@/lib/prisma";
import type { VivaCohort } from "@/lib/storage/vivaMarks";

const SECTION = "add-viva-marks";
const PREPARED_SECTION = "prepare-result";
const requestSchema = z.object({
  department: z.string().min(1).max(150),
  examYear: z.string().regex(/^\d{4}$/),
  academicYear: z.enum(["1st", "2nd", "3rd", "4th"]),
  semester: z.enum(["Odd", "Even"]),
  action: z.enum(["accept", "send-back"]).default("accept"),
  password: z.string().min(1),
});
type RequestData = z.infer<typeof requestSchema>;
function validResultActionPassword(value: string) {
  const expected = process.env.RESULT_APPROVAL_PASSWORD || "123456";
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

async function cohorts(prisma: NonNullable<ReturnType<typeof getPrisma>>) {
  const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(
    Prisma.sql`SELECT "data" FROM "ResultSectionStore" WHERE "section" = ${SECTION} LIMIT 1`,
  );
  return Array.isArray(rows[0]?.data) ? rows[0].data as unknown as VivaCohort[] : [];
}

const same = (
  result: VivaCohort | Record<string, unknown>,
  selection: RequestData,
) =>
  result.examYear === selection.examYear &&
  result.academicYear === selection.academicYear &&
  result.semester === selection.semester &&
  (!("department" in result) || !result.department || result.department === selection.department);

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  }
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  try {
    const results = await cohorts(prisma);
    return NextResponse.json({
      results: results.filter(
        (result) => result.submitted || result.published || result.returnedForCorrection,
      ),
    });
  } catch (error) {
    console.error("Unable to load result approvals", error);
    return NextResponse.json({ error: "Unable to load result approvals" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Result selection and admin password are required" },
      { status: 400 },
    );
  }
  if (!validResultActionPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Incorrect admin password" }, { status: 403 });
  }
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });

  try {
    const results = await cohorts(prisma);
    const index = results.findIndex((result) => same(result, parsed.data));
    if (index < 0) {
      return NextResponse.json({ error: "Matching submitted result was not found" }, { status: 404 });
    }

    const sendBack = parsed.data.action === "send-back";
    if (sendBack) {
      if (!results[index].submitted && !results[index].published) {
        return NextResponse.json({ error: "This result is already open for correction" }, { status: 409 });
      }
      results[index] = {
        ...results[index],
        submitted: false,
        published: false,
        returnedForCorrection: true,
        returnedAt: new Date().toISOString(),
        returnedBy: "Administrator",
        submittedAt: undefined,
        publishedAt: undefined,
        publishedBy: undefined,
      };
    } else {
      if (!results[index].submitted) {
        return NextResponse.json(
          { error: "This result has not been resubmitted for approval" },
          { status: 409 },
        );
      }
      results[index] = {
        ...results[index],
        published: true,
        returnedForCorrection: false,
        publishedAt: new Date().toISOString(),
        publishedBy: "Administrator",
      };
    }

    const serialized = JSON.stringify(results);
    await prisma.$executeRaw(
      Prisma.sql`UPDATE "ResultSectionStore"
        SET "data" = CAST(${serialized} AS jsonb), "updatedAt" = NOW()
        WHERE "section" = ${SECTION}`,
    );

    const preparedRows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(
      Prisma.sql`SELECT "data" FROM "ResultSectionStore"
        WHERE "section" = ${PREPARED_SECTION} LIMIT 1`,
    );
    const prepared = Array.isArray(preparedRows[0]?.data)
      ? preparedRows[0].data as Array<Record<string, unknown>>
      : [];
    let preparedChanged = false;
    const updatedPrepared = prepared.map((record) => {
      if (!same(record, parsed.data) || record.published === !sendBack) return record;
      preparedChanged = true;
      return { ...record, published: !sendBack };
    });

    if (preparedChanged) {
      const preparedJson = JSON.stringify(updatedPrepared);
      await prisma.$executeRaw(
        Prisma.sql`UPDATE "ResultSectionStore"
          SET "data" = CAST(${preparedJson} AS jsonb), "updatedAt" = NOW()
          WHERE "section" = ${PREPARED_SECTION}`,
      );
    }

    return NextResponse.json({ result: results[index] });
  } catch (error) {
    console.error("Unable to update result approval", error);
    return NextResponse.json({ error: "Unable to update result approval" }, { status: 503 });
  }
}
