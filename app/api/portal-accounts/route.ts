import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/adminAuth";

const trackingSchema = z.object({
  email: z.email().max(150), role: z.enum(["student", "teacher", "staff"]),
  name: z.string().trim().max(100).optional(), phone: z.string().trim().max(30).optional(),
});

export async function POST(request: Request) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ tracked: false }, { status: 503 });
  const parsed = trackingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid account information" }, { status: 400 });
  const { email, role, name, phone } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.portalAccount.findUnique({ where: { email_role: { email: normalizedEmail, role } } });
  if (existing && !existing.active) return NextResponse.json({ error: "This account has been disabled by an administrator" }, { status: 403 });
  await prisma.portalAccount.upsert({
    where: { email_role: { email: normalizedEmail, role } },
    create: { email: normalizedEmail, role, name: name || null, phone: phone || null },
    update: { lastLoginAt: new Date(), loginCount: { increment: 1 }, ...(name ? { name } : {}), ...(phone ? { phone } : {}) },
  });
  return NextResponse.json({ tracked: true });
}

export async function GET() {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const accounts = await prisma.portalAccount.findMany({ orderBy: { lastLoginAt: "desc" } });
  return NextResponse.json({ accounts });
}

export async function PATCH(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const body = await request.json().catch(() => null) as { id?: string; active?: boolean } | null;
  if (!body?.id || typeof body.active !== "boolean") return NextResponse.json({ error: "Invalid account update" }, { status: 400 });
  return NextResponse.json({ account: await prisma.portalAccount.update({ where: { id: body.id }, data: { active: body.active } }) });
}
