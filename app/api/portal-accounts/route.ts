import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/adminAuth";

const trackingSchema = z.object({
  email: z.email().max(150), role: z.enum(["student", "teacher", "staff"]),
  mode: z.enum(["signin", "signup"]),
  name: z.string().trim().max(100).optional(), phone: z.string().trim().max(30).optional(),
});

export async function POST(request: Request) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ tracked: false }, { status: 503 });
  const parsed = trackingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid account information" }, { status: 400 });
  const { email, role, mode, name, phone } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const registeredAccounts = await prisma.portalAccount.findMany({ where: { email: normalizedEmail }, orderBy: { registeredAt: "asc" } });
  const owner = registeredAccounts.find((account) => account.role === "student") || registeredAccounts[0];
  if (owner && owner.role !== role) {
    return NextResponse.json({ error: `This email is registered as a ${owner.role} account and cannot be used in the ${role} portal.` }, { status: 409 });
  }
  const existing = owner?.role === role ? owner : undefined;
  if (existing && !existing.active) return NextResponse.json({ error: "This account has been disabled by an administrator" }, { status: 403 });
  if (mode === "signin" && !existing) return NextResponse.json({ error: `No registered ${role} account was found for this email.` }, { status: 401 });
  if (mode === "signup" && existing) return NextResponse.json({ error: `This email is already registered as a ${role} account. Please sign in.` }, { status: 409 });
  if (existing) {
    await prisma.portalAccount.update({ where: { id: existing.id }, data: { lastLoginAt: new Date(), loginCount: { increment: 1 } } });
  } else {
    await prisma.portalAccount.create({ data: { email: normalizedEmail, role, name: name || null, phone: phone || null } });
  }
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
