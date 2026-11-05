import { describe, expect, it } from "vitest";
import {
  createTranslator,
  DEFAULT_LOCALE,
  formatCurrency,
  formatDate,
  formatPhone,
  getMessages,
  initials,
  parseLocale,
} from "./index";

function leaves(node: unknown, prefix = ""): [string, string][] {
  if (typeof node === "string") return [[prefix, node]];
  return Object.entries(node as object).flatMap(([key, value]) => leaves(value, prefix ? `${prefix}.${key}` : key));
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("messages", () => {
  const en = new Map(leaves(getMessages("en")));
  const sq = new Map(leaves(getMessages("sq")));

  it("has the same keys in Albanian and English", () => {
    expect([...sq.keys()].sort()).toEqual([...en.keys()].sort());
  });

  it("has no empty messages and the same placeholders in both", () => {
    for (const [key, text] of en) {
      expect(text.trim(), key).not.toBe("");
      expect(sq.get(key)?.trim(), key).not.toBe("");
      expect(placeholders(sq.get(key) ?? ""), key).toEqual(placeholders(text));
    }
  });
});

describe("translator", () => {
  it("defaults to Albanian", () => {
    expect(DEFAULT_LOCALE).toBe("sq");
    expect(parseLocale("fr")).toBe("sq");
    expect(parseLocale("en")).toBe("en");
  });

  it("switches language and fills placeholders", () => {
    expect(createTranslator("sq")("nav.account")).toBe("Llogaria");
    expect(createTranslator("en")("nav.account")).toBe("Account");
    expect(createTranslator("en")("components.page", { page: 3 })).toBe("Page 3");
    expect(createTranslator("sq")("components.page", { page: 3 })).toBe("Faqja 3");
  });
});

describe("initials", () => {
  it("uses the first and last name, including Albanian letters", () => {
    expect(initials("Arta Krasniqi")).toBe("AK");
    expect(initials("ëndrit çela")).toBe("ËÇ");
    expect(initials("  Blerta  ")).toBe("B");
    expect(initials("Ana Maria Gashi")).toBe("AG");
  });
});

describe("Kosovo formatting", () => {
  const date = new Date("2026-02-17T10:00:00Z");

  it("formats dates in the Kosovo time zone for each language", () => {
    expect(formatDate("en", date)).toBe("17 February 2026");
    expect(formatDate("sq", date)).toMatch(/17.*2026/);
    expect(formatDate("sq", date)).not.toBe(formatDate("en", date));
  });

  it("formats euros", () => {
    expect(formatCurrency("en", 1250.5)).toBe("€1,250.50");
    expect(formatCurrency("sq", 1250.5)).toContain("€");
  });

  it("formats +383 phone numbers and leaves others alone", () => {
    expect(formatPhone("044123456")).toBe("+383 44 123 456");
    expect(formatPhone("+383 49 555 777")).toBe("+383 49 555 777");
    expect(formatPhone("12345")).toBe("12345");
  });
});
