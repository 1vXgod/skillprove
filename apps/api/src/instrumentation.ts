import { getEnv } from "./lib/env";

/**
 * Reports invalid configuration in the startup log. Next.js keeps running after this throws,
 * but `proxy.ts` validates again on each request, so API requests fail with a 500 and no
 * browser origin gains access.
 */
export function register() {
  getEnv();
}
