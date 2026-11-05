import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher(["/account(.*)", "/profile(.*)", "/skill-passport(.*)"]);

const clerk = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) await auth.protect();
}, { signInUrl: "/sign-in", signUpUrl: "/sign-up" });

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const isConfigured =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY;
  // Without keys, the auth pages render a "not configured" notice and hold no private data.
  return isConfigured ? clerk(request, event) : NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:css|js|png|jpg|jpeg|gif|svg|ico|webp|woff2?|txt|map)$).*)"],
};
