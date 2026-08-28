import { NextResponse, type NextRequest } from "next/server";
export function proxy(request: NextRequest) {
  if (request.cookies.get("becm-password-change-required")?.value === "1") return NextResponse.redirect(new URL("/change-password", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/((?!api|_next/static|_next/image|change-password|favicon.ico|.*\\..*).*)"] };
