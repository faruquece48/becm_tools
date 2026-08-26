import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

const profileSchema = z.object({
  email: z.email().max(150).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number"),
  roll: z.string().trim().min(1).max(50),
  series: z.string().trim().min(2).max(30),
  department: z.string().trim().min(2).max(100).default("BECM"),
});

export async function GET(request: Request) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  try { return NextResponse.json({ profile: await prisma.studentProfile.findUnique({ where: { email } }) }); }
  catch { return NextResponse.json({ error: "Unable to load the student profile" }, { status: 503 }); }
}

export async function PUT(request: Request) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid profile" }, { status: 400 });
  try {
    const profile = await prisma.studentProfile.upsert({ where: { email: parsed.data.email }, create: parsed.data, update: parsed.data });
    await prisma.portalAccount.updateMany({ where: { email: parsed.data.email, role: "student" }, data: { name: parsed.data.name, phone: parsed.data.phone } });
    return NextResponse.json({ profile });
  } catch { return NextResponse.json({ error: "Unable to save the student profile" }, { status: 503 }); }
}
