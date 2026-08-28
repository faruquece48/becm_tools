import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { hashPortalPassword } from "@/lib/portalPassword";

const schema = z.object({ password: z.string().min(8).max(200), confirmPassword: z.string().min(8).max(200) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.password !== parsed.data.confirmPassword) return NextResponse.json({ error: "Passwords must match and contain at least 8 characters." }, { status: 400 });
  const accountId = (await cookies()).get("becm-portal-account")?.value;
  if (!accountId) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Account service is unavailable" }, { status: 503 });
  const passwordHash = hashPortalPassword(parsed.data.password);
  const changed = await prisma.$executeRaw`UPDATE "PortalAccount" SET "passwordHash"=${passwordHash}, "mustChangePassword"=false, "updatedAt"=NOW() WHERE "id"=${accountId} AND "active"=true`;
  if (!changed) return NextResponse.json({ error: "Account was not found." }, { status: 404 });
  const response = NextResponse.json({ changed: true });
  response.cookies.delete("becm-password-change-required");
  return response;
}