/** `@db.Date` columns travel as YYYY-MM-DD and are stored at UTC midnight. */
export function toDateOnly(date: Date): string;
export function toDateOnly(date: Date | null): string | null;
export function toDateOnly(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export function fromDateOnly(value: string): Date;
export function fromDateOnly(value: string | null): Date | null;
export function fromDateOnly(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}
