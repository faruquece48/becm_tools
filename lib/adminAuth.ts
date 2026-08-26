import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const adminCookieName = "becm-admin-session";

function credentials() {
  return {
    id: process.env.ADMIN_ID || process.env.ADMIN_EMAIL || "",
    password: process.env.ADMIN_PASSWORD || process.env.TEACHER_PASSWORD || "",
  };
}

function sessionToken() {
  const { id, password } = credentials();
  if (!id || !password) return "";
  return createHmac("sha256", password).update(`becm-admin:${id.toLowerCase()}`).digest("hex");
}

export function adminCredentialsConfigured() {
  const { id, password } = credentials();
  return Boolean(id && password);
}

export function validateAdminCredentials(id: string, password: string) {
  const expected = credentials();
  return Boolean(expected.id && expected.password && id.trim().toLowerCase() === expected.id.toLowerCase() && password === expected.password);
}

export async function isAdminAuthenticated() {
  const supplied = (await cookies()).get(adminCookieName)?.value || "";
  const expected = sessionToken();
  if (!supplied || !expected || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export function getAdminSessionToken() {
  return sessionToken();
}
