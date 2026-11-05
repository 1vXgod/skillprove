import { getSharedPrismaClient, type PrismaClient } from "@skillprove/database";
import { getEnv } from "./env";

/** Returns the shared client, or null when no database is configured. */
export function getDb(): PrismaClient | null {
  const { DATABASE_URL } = getEnv();
  return DATABASE_URL ? getSharedPrismaClient(DATABASE_URL) : null;
}
