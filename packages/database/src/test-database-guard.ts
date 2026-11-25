import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const ENV_FILES = ["../../../.env", "../.env", "../../../apps/api/.env.local"];
const URL_VARIABLES = ["DATABASE_URL", "DIRECT_URL"];

/** Messages never include connection strings, because they end up in logs. */
export class UnsafeTestDatabaseError extends Error {
  /** `action` only changes the wording, for other tools that share these rules (the demo seed). */
  constructor(
    readonly reason: string,
    action = "run database tests",
  ) {
    super(`Refusing to ${action}: ${reason} See docs/database.md.`);
    this.name = "UnsafeTestDatabaseError";
  }
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    throw new UnsafeTestDatabaseError("a database URL could not be parsed.");
  }
}

/** A Neon endpoint's pooled and direct hosts differ only by the "-pooler" suffix. */
function endpointOf(url: string): string {
  return hostnameOf(url).replace(/^([^.]+)-pooler\./, "$1.");
}

/**
 * Decides whether tests may connect. Anything not explicitly allowed is refused:
 * local databases pass; a remote one must be a Neon host, must not match a configured
 * application database, and must name its branch. Returns the branch to confirm with
 * the server through `assertExpectedBranch`, or null for a local database.
 */
export function checkTestDatabaseUrl(options: {
  url: string;
  protectedUrls: readonly string[];
  allowedBranchId: string | undefined;
}): { requiredBranchId: string | null } {
  const hostname = hostnameOf(options.url);
  if (LOCAL_HOSTS.has(hostname)) return { requiredBranchId: null };

  if (!hostname.endsWith(".neon.tech")) {
    throw new UnsafeTestDatabaseError("remote databases must be a Neon test branch.");
  }
  const endpoint = endpointOf(options.url);
  if (options.protectedUrls.some((url) => endpointOf(url) === endpoint)) {
    throw new UnsafeTestDatabaseError(
      "TEST_DATABASE_URL points at the same endpoint as DATABASE_URL or DIRECT_URL.",
    );
  }
  if (!options.allowedBranchId) {
    throw new UnsafeTestDatabaseError("a remote database requires TEST_NEON_BRANCH_ID.");
  }
  return { requiredBranchId: options.allowedBranchId };
}

/** The URL alone cannot prove which branch it reaches, so the server is asked. */
export function assertExpectedBranch(actual: string | null, expected: string): void {
  if (actual !== expected) {
    throw new UnsafeTestDatabaseError("the connected Neon branch is not TEST_NEON_BRANCH_ID.");
  }
}

/** Application database URLs from the environment and every local env file. */
export function loadProtectedUrls(): string[] {
  const sources: Record<string, string | undefined>[] = [process.env];
  for (const file of ENV_FILES) {
    const path = fileURLToPath(new URL(file, import.meta.url));
    if (existsSync(path)) sources.push(parseEnv(readFileSync(path, "utf8")));
  }
  return sources.flatMap((source) =>
    URL_VARIABLES.map((name) => source[name]).filter((url): url is string => Boolean(url)),
  );
}
