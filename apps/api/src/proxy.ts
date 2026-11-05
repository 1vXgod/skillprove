import { NextResponse, type NextRequest } from "next/server";
import { evaluateCors } from "./lib/cors";
import { getEnv } from "./lib/env";
import { fail } from "./lib/http";
import { requiresSession } from "./lib/public-routes";

export function proxy(request: NextRequest) {
  const { headers, preflightStatus } = evaluateCors(
    {
      origin: request.headers.get("origin"),
      method: request.method,
      requestedMethod: request.headers.get("access-control-request-method"),
    },
    getEnv().CORS_ALLOWED_ORIGINS,
  );

  // Deny by default: a new route that forgets `withAuth` still needs a token to be reached.
  // This only checks a token is present. `withAuth` is what verifies it.
  const isMissingToken =
    !preflightStatus &&
    requiresSession(request.nextUrl.pathname) &&
    !request.headers.get("authorization")?.startsWith("Bearer ");

  let response: NextResponse;
  if (preflightStatus) response = new NextResponse(null, { status: preflightStatus });
  else if (isMissingToken) response = fail("UNAUTHENTICATED", "Sign in to continue.", 401);
  else response = NextResponse.next();

  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }
  return response;
}

export const config = { matcher: "/api/:path*" };
