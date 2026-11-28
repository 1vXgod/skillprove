/** `atob` exists in browsers, Node 16+ and Hermes, but not in every TypeScript lib setting. */
declare const atob: (data: string) => string;

/**
 * The address of Clerk's hosted account page (the Account Portal "user profile"), where people
 * change their password, email and sign-in methods. It is derived from the publishable key,
 * which encodes the Frontend API host, so no extra configuration is needed. Returns null when
 * the key is missing or not a Clerk key.
 *
 * Development: `foo-12.clerk.accounts.dev` → `https://foo-12.accounts.dev/user`
 * Production:  `clerk.example.com`          → `https://accounts.example.com/user`
 */
export function clerkAccountPortalUrl(publishableKey: string | null | undefined): string | null {
  const match = /^pk_(?:test|live)_([A-Za-z0-9+/=_-]+)$/.exec(publishableKey ?? "");
  if (!match?.[1]) return null;
  let host: string;
  try {
    host = atob(match[1].replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return null;
  }
  host = host.replace(/\$$/, "");
  if (!/^[a-z0-9.-]+$/i.test(host)) return null;
  if (host.endsWith(".clerk.accounts.dev")) return `https://${host.replace(/\.clerk\.accounts\.dev$/, ".accounts.dev")}/user`;
  if (host.startsWith("clerk.")) return `https://accounts.${host.slice("clerk.".length)}/user`;
  return null;
}
