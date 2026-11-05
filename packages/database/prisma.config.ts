import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma does not load .env on its own when a config file is present.
if (existsSync(".env")) process.loadEnvFile(".env");

// Migrations use the direct connection. A pooled URL can break Prisma's advisory locks.
// `prisma generate` needs no database, so a missing URL is not an error here;
// migrate commands report it themselves.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "" },
});
