import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hashPortalPassword, verifyPortalPassword } from "@/lib/portalPassword";

function validAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD || process.env.TEACHER_PASSWORD || "";
  if (!password || !expected || password.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}

function validLegacyPassword(role: "student" | "teacher" | "staff", password: string) {
  const expected = process.env[`${role.toUpperCase()}_PASSWORD`] || "";
  if (!password || !expected || password.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}
const trackingSchema = z.object({
  email: z.email().max(150), role: z.enum(["student", "teacher", "staff"]),
  mode: z.enum(["signin", "signup"]),
  name: z.string().trim().max(100).optional(), phone: z.string().trim().max(30).optional(),
  password: z.string().min(6).max(200),
  roll: z.string().trim().min(1).max(50).optional(), series: z.string().trim().min(2).max(30).optional(),
});
const manualAccountSchema = z.object({
  email: z.email().max(150),
  role: z.enum(["student", "teacher", "staff"]),
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(6).max(200),
});
export async function POST(request: Request) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ tracked: false }, { status: 503 });
  const parsed = trackingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid account information" }, { status: 400 });
  const { email, role, mode, name, phone, password, roll, series } = parsed.data;
  if (mode === "signup" && role !== "student") return NextResponse.json({ error: "Teacher and staff accounts can only be created by an administrator." }, { status: 403 });
  if (mode === "signup" && (!name || !phone || !roll || !series)) return NextResponse.json({ error: "Name, phone, roll number and series are required for student registration." }, { status: 400 });
  const normalizedEmail = email.toLowerCase();
  const registeredAccounts = await prisma.$queryRaw<Array<{ id: string; email: string; role: string; name: string | null; phone: string | null; passwordHash: string | null; active: boolean; registeredAt: Date; mustChangePassword: boolean }>>`
    SELECT "id", "email", "role", "name", "phone", "passwordHash", "active", "registeredAt", "mustChangePassword" FROM "PortalAccount" WHERE "email" = ${normalizedEmail} ORDER BY "registeredAt" ASC
  `;
  const owner = registeredAccounts.find((account) => account.role === "student") || registeredAccounts[0];
  if (owner && owner.role !== role) {
    return NextResponse.json({ error: `This email is registered as a ${owner.role} account and cannot be used in the ${role} portal.` }, { status: 409 });
  }
  const existing = owner?.role === role ? owner : undefined;
  if (existing && !existing.active) return NextResponse.json({ error: role === "student" ? "This student account is awaiting administrator approval." : "This account has been disabled by an administrator" }, { status: 403 });
  if (mode === "signin" && !existing) return NextResponse.json({ error: `No registered ${role} account was found for this email.` }, { status: 401 });
  if (mode === "signup" && existing) return NextResponse.json({ error: `This email is already registered as a ${role} account. Please sign in.` }, { status: 409 });
  if (existing && existing.passwordHash && !verifyPortalPassword(password, existing.passwordHash)) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  if (existing && !existing.passwordHash && !validLegacyPassword(role, password)) return NextResponse.json({ error: "Password is not initialized. Ask an administrator to reset it." }, { status: 401 });
  let account: { id: string };
  if (existing) {
    const passwordHash = existing.passwordHash || hashPortalPassword(password);
    await prisma.$executeRaw`UPDATE "PortalAccount" SET "passwordHash" = ${passwordHash}, "lastLoginAt" = NOW(), "loginCount" = "loginCount" + 1, "updatedAt" = NOW() WHERE "id" = ${existing.id}`;
    account = { id: existing.id };
  } else {
    const usedRoll = await prisma.$queryRaw<Array<{ email: string }>>`SELECT "email" FROM "StudentProfile" WHERE "roll" = ${roll!} LIMIT 1`;
    if (usedRoll.length) return NextResponse.json({ error: "This roll number is already registered with another email address." }, { status: 409 });
    const id = randomUUID();
    const profileId = randomUUID();
    const passwordHash = hashPortalPassword(password);
    try {
      await prisma.$executeRaw`INSERT INTO "PortalAccount" ("id", "email", "role", "name", "phone", "passwordHash", "active", "registeredAt", "lastLoginAt", "loginCount", "updatedAt") VALUES (${id}, ${normalizedEmail}, 'student', ${name!}, ${phone!}, ${passwordHash}, false, NOW(), NOW(), 0, NOW())`;
      await prisma.$executeRaw`INSERT INTO "StudentProfile" ("id", "email", "name", "phone", "roll", "series", "department", "createdAt", "updatedAt") VALUES (${profileId}, ${normalizedEmail}, ${name!}, ${phone!}, ${roll!}, ${series!}, 'BECM', NOW(), NOW())`;
    } catch {
      await prisma.$executeRaw`DELETE FROM "PortalAccount" WHERE "id" = ${id}`;
      return NextResponse.json({ error: "This email or roll number is already registered." }, { status: 409 });
    }
    return NextResponse.json({ tracked: true, pendingApproval: true });
  }
  const mustChangePassword = Boolean(existing?.mustChangePassword);
  const response = NextResponse.json({ tracked: true, mustChangePassword });
  response.cookies.set("becm-portal-account", account.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  if (mustChangePassword) response.cookies.set("becm-password-change-required", "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 30 });
  else response.cookies.delete("becm-password-change-required");
  return response;
}

export async function GET(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const requestedRole = new URL(request.url).searchParams.get("role");
  const role = z.enum(["student", "teacher", "staff"]).safeParse(requestedRole);
  if (requestedRole && !role.success) return NextResponse.json({ error: "Invalid account role" }, { status: 400 });
  const accounts = await prisma.portalAccount.findMany({
    where: role.success ? { role: role.data } : undefined,
    orderBy: [{ registeredAt: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ accounts });
}

export async function PUT(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const parsed = manualAccountSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid account information" }, { status: 400 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.portalAccount.findFirst({ where: { email } });
  if (existing) return NextResponse.json({ error: `This email is already registered as a ${existing.role} account.` }, { status: 409 });
  const id = randomUUID();
  const passwordHash = hashPortalPassword(parsed.data.password);
  const accounts = await prisma.$queryRaw<Array<{ id: string; email: string; role: string; name: string | null; phone: string | null; active: boolean; registeredAt: Date; lastLoginAt: Date; loginCount: number; updatedAt: Date }>>`
    INSERT INTO "PortalAccount" ("id", "email", "role", "name", "phone", "passwordHash", "active", "registeredAt", "lastLoginAt", "loginCount", "updatedAt")
    VALUES (${id}, ${email}, ${parsed.data.role}, ${parsed.data.name}, ${parsed.data.phone || null}, ${passwordHash}, true, NOW(), NOW(), 0, NOW())
    RETURNING "id", "email", "role", "name", "phone", "active", "registeredAt", "lastLoginAt", "loginCount", "updatedAt"
  `;
  const account = accounts[0];
  return NextResponse.json({ account }, { status: 201 });
}

const accountUpdateSchema = z.object({
  id: z.string().min(1), password: z.string().optional(), active: z.boolean().optional(), name: z.string().trim().min(1).max(100).optional(),
  email: z.email().max(150).optional(), phone: z.string().trim().max(30).nullable().optional(),
  newPassword: z.string().min(6).max(200).optional(),
});

export async function PATCH(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const parsed = accountUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid account update" }, { status: 400 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const { id, password, ...changes } = parsed.data;
  if ((typeof changes.active === "boolean" || changes.newPassword) && !validAdminPassword(password || "")) return NextResponse.json({ error: "Incorrect admin password" }, { status: 403 });
  const email = changes.email?.toLowerCase();
  if (email) {
    const duplicate = await prisma.portalAccount.findFirst({ where: { email, id: { not: id } } });
    if (duplicate) return NextResponse.json({ error: `This email is already registered as a ${duplicate.role} account.` }, { status: 409 });
  }
  const { newPassword, ...accountChanges } = changes;
  if (newPassword) {
    const passwordHash = hashPortalPassword(newPassword);
    await prisma.$executeRaw`UPDATE "PortalAccount" SET "passwordHash" = ${passwordHash}, "passwordResetRequestedAt" = NULL, "updatedAt" = NOW() WHERE "id" = ${id}`;
  }
  const account = Object.keys(accountChanges).length || email
    ? await prisma.portalAccount.update({ where: { id }, data: { ...accountChanges, email } })
    : await prisma.portalAccount.findUnique({ where: { id } });
  return NextResponse.json({ account });
}

export async function DELETE(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string; password?: string } | null;
  const id = body?.id;
  if (!id) return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
  if (!validAdminPassword(body?.password || "")) return NextResponse.json({ error: "Incorrect admin password" }, { status: 403 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  await prisma.$executeRaw`DELETE FROM "TeacherCustomizationStore" WHERE "teacherId" = ${id}`;
  await prisma.$executeRaw`DELETE FROM "StudentProfile" WHERE "email" = (SELECT "email" FROM "PortalAccount" WHERE "id" = ${id} AND "role" = 'student')`;
  await prisma.$executeRaw`DELETE FROM "PortalAccount" WHERE "id" = ${id}`;
  return NextResponse.json({ deleted: true });
}
