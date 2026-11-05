import { existsSync } from "node:fs";
import { createPrismaClient, seedSkillTaxonomy } from "../src/index";

if (existsSync(".env")) process.loadEnvFile(".env");

if (process.env.NODE_ENV === "production") {
  throw new Error("The development seed does not run with NODE_ENV=production.");
}

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL before seeding.");

const client = createPrismaClient(url);
try {
  console.log(`Seeding ${new URL(url).hostname}`);
  const { categories, skills } = await seedSkillTaxonomy(client);
  console.log(`Done: ${categories} categories, ${skills} skills.`);
} finally {
  await client.$disconnect();
}
