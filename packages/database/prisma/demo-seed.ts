import { existsSync } from "node:fs";
import { createPrismaClient } from "../src/index";
import { assertDemoBranch, checkDemoDatabaseUrl, parseProductionHosts, seedDemoData } from "../src/seed/demo";
import { loadProtectedUrls } from "../src/test-database-guard";

/*
 * Development-only demo data. Targets DEMO_DATABASE_URL, or, with DEMO_ALLOW_DEV_DATABASE=1, the
 * configured development database (DIRECT_URL, else DATABASE_URL). Production is always refused:
 * NODE_ENV=production or a host in PRODUCTION_DATABASE_HOSTS. Only the host is ever printed.
 * See docs/database.md.
 */
if (existsSync(".env")) process.loadEnvFile(".env");

const allowDevDatabase = process.env.DEMO_ALLOW_DEV_DATABASE === "1";
const url = process.env.DEMO_DATABASE_URL ?? (allowDevDatabase ? (process.env.DIRECT_URL ?? process.env.DATABASE_URL) : undefined);
if (!url) {
  throw new Error("Set DEMO_DATABASE_URL, or DEMO_ALLOW_DEV_DATABASE=1 to seed the configured development database.");
}

// Checked before any connection, so a refused database is never contacted.
const guard = checkDemoDatabaseUrl({
  url,
  protectedUrls: loadProtectedUrls(),
  allowedBranchId: process.env.DEMO_NEON_BRANCH_ID,
  nodeEnv: process.env.NODE_ENV,
  allowDevDatabase,
  productionHosts: parseProductionHosts(process.env.PRODUCTION_DATABASE_HOSTS),
});

const client = createPrismaClient(url);
try {
  if (guard.requiredBranchId) await assertDemoBranch(client, guard.requiredBranchId);
  console.log(`Seeding demo data into ${new URL(url).hostname}`);
  const { created, existing } = await seedDemoData(client);
  console.log(`Done: ${created} assessments created, ${existing} already there.`);
} finally {
  await client.$disconnect();
}
