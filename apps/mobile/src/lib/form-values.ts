/** Converting form text to API values. No React Native imports, so it is unit-tested. */

/** "a, b , c" ⇄ ["a", "b", "c"], for list fields typed as text. */
export const splitList = (text: string) => text.split(",").map((item) => item.trim()).filter(Boolean);
export const joinList = (items: readonly string[]) => items.join(", ");

/** Blank text becomes null, which the API reads as "not set". */
export const orNull = (value: string) => (value.trim() === "" ? null : value.trim());

/** "2,5" or "2.5" → 2.5; blank → null. Anything else becomes NaN and fails validation. */
export const yearsValue = (text: string) => (text.trim() === "" ? null : Number(text.trim().replace(",", ".")));
