/** Splits 100 into shares (in hundredths) proportional to `counts`, by largest remainder, so the total is exactly 100. All-zero counts split equally. */
export function distributeWeights(counts: readonly number[]): number[] {
  if (counts.length === 0) return [];
  const total = counts.reduce((a, b) => a + b, 0);
  const basis = total === 0 ? counts.map(() => 1) : counts;
  const sum = basis.reduce((a, b) => a + b, 0);
  const exact = basis.map((c) => (c / sum) * 10_000);
  const floors = exact.map(Math.floor);
  let remaining = 10_000 - floors.reduce((a, b) => a + b, 0);
  const order = exact.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (remaining <= 0) break;
    floors[i] = (floors[i] ?? 0) + 1;
    remaining -= 1;
  }
  return floors.map((v) => v / 100);
}

/** A skill's share of the assessment, from how many questions measure it. Skills with no question get 0. */
export function skillWeights(
  skillIds: readonly string[],
  questionSkillIds: readonly (string | null)[],
): { skillId: string; weight: number }[] {
  const counts = skillIds.map((id) => questionSkillIds.filter((s) => s === id).length);
  const weights = distributeWeights(counts);
  return skillIds.map((skillId, i) => ({ skillId, weight: weights[i] ?? 0 }));
}
