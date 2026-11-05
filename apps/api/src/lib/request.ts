import { getDb } from "./db";
import { badRequest, unavailable } from "./http";
import type { PrismaClient } from "@skillprove/database";
import { fieldErrors } from "@skillprove/validation";
import type { z } from "zod";

const MAX_BODY_BYTES = 64 * 1024;

/** Reads and validates a JSON body. Unknown fields are dropped by the schema. */
export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw badRequest();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw badRequest();
  }
  const result = schema.safeParse(json);
  if (!result.success) throw badRequest(fieldErrors(result.error));
  return result.data;
}

export function parseQuery<T extends z.ZodType>(request: Request, schema: T): z.output<T> {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const result = schema.safeParse(params);
  if (!result.success) throw badRequest(fieldErrors(result.error));
  return result.data;
}

export function requireDb(): PrismaClient {
  const db = getDb();
  if (!db) throw unavailable();
  return db;
}

/** Skill names follow `?locale=` (the app's current language), then the user's saved one. */
export function contentLocale(request: Request, user: { locale: string }): "sq" | "en" {
  const requested = new URL(request.url).searchParams.get("locale");
  if (requested === "sq" || requested === "en") return requested;
  return user.locale === "en" ? "en" : "sq";
}

/** Next.js passes route params as a promise. */
export type RouteContext<P extends Record<string, string>> = { params: Promise<P> };
