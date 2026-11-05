/**
 * The /design-system page is internal. It is always on in development, and in a production
 * build only when the server runs with SKILLPROVE_DESIGN_SYSTEM=enabled (used by browser tests).
 * Read at request time, so a deployed build cannot be switched on from the browser.
 */
export function isDesignSystemEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== "production" || env.SKILLPROVE_DESIGN_SYSTEM === "enabled";
}
