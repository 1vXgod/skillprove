"use client";

import { useAuth } from "@clerk/nextjs";
import { createContext, useContext, type ReactNode } from "react";

type GetToken = () => Promise<string | null>;

const TokenContext = createContext<GetToken | null>(null);

/** Signed-in pages: the session token comes from Clerk. Must render inside ClerkProvider. */
export function ClerkTokenProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  return <TokenContext.Provider value={getToken}>{children}</TokenContext.Provider>;
}

/**
 * For the internal design-system harness only: a placeholder token that the API rejects,
 * so screens can be shown and browser-tested with intercepted responses.
 */
export function PlaceholderTokenProvider({ children }: { children: ReactNode }) {
  return <TokenContext.Provider value={placeholderToken}>{children}</TokenContext.Provider>;
}
const placeholderToken: GetToken = () => Promise.resolve("design-system-placeholder");

export function useGetToken(): GetToken {
  const value = useContext(TokenContext);
  if (!value) throw new Error("useGetToken must be used inside a token provider");
  return value;
}
