/**
 * A last-line screen for generated and hand-written content. It cannot make an assessment fair,
 * and a human still reviews everything before publication. It only refuses text that asks
 * candidates for protected or sensitive personal details, or that claims official certification.
 */
const PATTERNS: RegExp[] = [
  // Protected characteristics and sensitive personal data asked for or used as criteria (English).
  /\b(your|candidate'?s?)\s+(age|gender|sex|religion|ethnicity|race|nationality|marital status|sexual orientation|pregnan\w*|disabilit\w*|political (views|opinions?)|health (status|condition))\b/i,
  /\b(date of birth|national id|id number|passport (number|no)|social security|home address|bank (account|details)|credit card)\b/i,
  /\b(prefer|prioriti[sz]e|reject|favou?r)\w*\s+(young|old|male|female|men|women|married|single)\b/i,
  // The same in Albanian.
  /\b(mosha|gjinia|feja|etnia|kombësia|statusi martesor|orientimi seksual|bindjet politike)\s+(juaj|e juaj|jote|e kandidatit)\b/i,
  /(dat[aë]n?\s+e\s+lindjes|numri(n)?\s+personal|numri(n)?\s+i\s+pasaport[ë]?e?s|adres[aë]n?\s+e\s+banimit|numri(n)?\s+i\s+llogari[ë]?e?s)/i,
  // Claims of official certification or endorsement.
  /\b(officially certified|official certification|accredited by|endorsed by|certified by)\b/i,
  /\b(i certifikuar zyrtarisht|certifikim zyrtar|akredituar nga)\b/i,
];

/** The first matching phrase, or null when the text looks fine. */
export function findUnsafeText(text: string): string | null {
  for (const pattern of PATTERNS) {
    const match = pattern.exec(text);
    if (match) return match[0];
  }
  return null;
}
