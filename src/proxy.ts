import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/register", "/forgot-password", "/reset-password", "/download"];

/**
 * Optimistic check only: sends visitors without a session cookie to the sign-in page.
 * Every route handler and page still verifies the session itself (currentUserId).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = !!getSessionCookie(request);
  if (!signedIn && !PUBLIC.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Pages only: API routes answer 401 themselves, and the Android app calls them with a bearer token.
  matcher: ["/((?!api|_next|icon|apple-icon|manifest|.*\\..*).*)"],
};
