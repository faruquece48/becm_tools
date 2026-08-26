import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName, adminCredentialsConfigured, getAdminSessionToken, isAdminAuthenticated, validateAdminCredentials } from "@/lib/adminAuth";

export async function GET() {
  return NextResponse.json({ authenticated: await isAdminAuthenticated(), configured: adminCredentialsConfigured() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { id?: string; password?: string } | null;
  if (!body?.id || !body.password || !validateAdminCredentials(body.id, body.password)) {
    return NextResponse.json({ error: "Invalid admin ID or password" }, { status: 401 });
  }
  (await cookies()).set(adminCookieName, getAdminSessionToken(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  return NextResponse.json({ authenticated: true });
}

export async function DELETE() {
  (await cookies()).delete(adminCookieName);
  return NextResponse.json({ authenticated: false });
}
