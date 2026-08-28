import { createHmac, randomInt, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { gmailConfigured, sendAccountEmail } from "@/lib/gmail";
import { hashPortalPassword } from "@/lib/portalPassword";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request"), email: z.email().max(150), role: z.enum(["student", "teacher", "staff"]) }),
  z.object({ action: z.literal("verify"), email: z.email().max(150), role: z.enum(["student", "teacher", "staff"]), otp: z.string().regex(/^\d{6}$/) }),
]);
const secret = () => process.env.ADMIN_PASSWORD || process.env.TEACHER_PASSWORD || "becm-reset";
const digest = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");
const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid password reset information" }, { status: 400 });

  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Account service is unavailable" }, { status: 503 });
  const email = parsed.data.email.toLowerCase();
  const rows = await prisma.$queryRaw<Array<{ id: string; active: boolean; otpHash: string | null; expiresAt: Date | null; attempts: number; lastSentAt: Date | null }>>`
    SELECT "id", "active", "passwordResetOtpHash" AS "otpHash", "passwordResetOtpExpiresAt" AS "expiresAt", "passwordResetOtpAttempts" AS "attempts", "passwordResetLastSentAt" AS "lastSentAt"
    FROM "PortalAccount" WHERE "email" = ${email} AND "role" = ${parsed.data.role} LIMIT 1
  `;
  const account = rows[0];
  if (!account || !account.active) return NextResponse.json({ error: `No active ${parsed.data.role} account exists with this email address.` }, { status: 404 });
  if (!gmailConfigured()) return NextResponse.json({ error: "Gmail is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to the environment file." }, { status: 503 });

  if (parsed.data.action === "request") {
    if (account.lastSentAt && Date.now() - account.lastSentAt.getTime() < 60_000) return NextResponse.json({ error: "Please wait one minute before requesting another OTP." }, { status: 429 });
    const otp = randomInt(100000, 1000000).toString();
    await sendAccountEmail(email, "BECM Tools password reset OTP", `Your BECM Tools password reset OTP is: ${otp}\n\nThis OTP expires in 5 minutes. Do not share it with anyone.`);
    const otpHash = digest(`${account.id}:${otp}`);
    await prisma.$executeRaw`UPDATE "PortalAccount" SET "passwordResetOtpHash"=${otpHash}, "passwordResetOtpExpiresAt"=NOW()+INTERVAL '5 minutes', "passwordResetOtpAttempts"=0, "passwordResetLastSentAt"=NOW(), "updatedAt"=NOW() WHERE "id"=${account.id}`;
    return NextResponse.json({ sent: true });
  }

  if (!account.otpHash || !account.expiresAt || account.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "The OTP has expired. Request a new OTP." }, { status: 410 });
  if (account.attempts >= 5) return NextResponse.json({ error: "Too many incorrect attempts. Request a new OTP." }, { status: 429 });
  if (!safeEqual(digest(`${account.id}:${parsed.data.otp}`), account.otpHash)) {
    await prisma.$executeRaw`UPDATE "PortalAccount" SET "passwordResetOtpAttempts"="passwordResetOtpAttempts"+1 WHERE "id"=${account.id}`;
    return NextResponse.json({ error: "Incorrect OTP" }, { status: 400 });
  }
  const temporaryPassword = `Becm-${randomBytes(6).toString("base64url")}`;
  await sendAccountEmail(email, "BECM Tools temporary password", `Your temporary BECM Tools password is: ${temporaryPassword}\n\nSign in with this password. You will be required to create a new password before accessing any tools.`);
  const passwordHash = hashPortalPassword(temporaryPassword);
  await prisma.$executeRaw`UPDATE "PortalAccount" SET "passwordHash"=${passwordHash}, "mustChangePassword"=true, "passwordResetOtpHash"=NULL, "passwordResetOtpExpiresAt"=NULL, "passwordResetOtpAttempts"=0, "passwordResetRequestedAt"=NULL, "updatedAt"=NOW() WHERE "id"=${account.id}`;
  return NextResponse.json({ verified: true });
}
