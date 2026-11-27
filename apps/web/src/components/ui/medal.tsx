import type { SkillMedal as Medal } from "@skillprove/shared";
import { cn } from "../../lib/cn";

/** Shared with the mobile medal: ribbon tails, a rimmed disc and a star, on a 24 × 28 grid. */
const STAR = "M12 13.6l1.3 2.7 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z";
const SIZES = { sm: 18, md: 26 } as const;

/**
 * A skill medal. Display only. `label` is the translated medal name ("Gold medal"), read by
 * screen readers. `faded` marks outdated evidence; the "Outdated" badge beside it says why.
 */
export function SkillMedal({ medal, label, size = "sm", faded = false, className }: { medal: Medal; label: string; size?: keyof typeof SIZES; faded?: boolean; className?: string }) {
  const face = `var(--sp-medal-${medal})`;
  const rim = `var(--sp-medal-${medal}-rim)`;
  const width = SIZES[size];
  return (
    <svg role="img" aria-label={label} width={width} height={(width * 28) / 24} viewBox="0 0 24 28" className={cn("shrink-0", faded && "opacity-60 grayscale-[30%]", className)}>
      <path d="M6.5 1h4.5l2.2 8.5H8.7z" fill={rim} />
      <path d="M17.5 1H13l-2.2 8.5h4.5z" fill={rim} opacity={0.8} />
      <circle cx={12} cy={18} r={8.75} fill={face} stroke={rim} strokeWidth={1.5} />
      <path d={STAR} fill={rim} />
    </svg>
  );
}
