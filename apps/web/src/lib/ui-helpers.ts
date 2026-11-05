/** Page numbers with gaps, always showing the first, last and one either side of the current. */
export function pageItems(page: number, pageCount: number): (number | "gap")[] {
  const shown = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...shown].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - (sorted[i - 1] ?? p) > 1 ? ["gap" as const, p] : [p]));
}
