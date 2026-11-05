import { cn } from "../../lib/cn";

const SIZES = { sm: "size-4", md: "size-5", lg: "size-6" } as const;

/**
 * A spinning ring. With `label` it is announced as a status; without, it is decorative and the
 * surrounding control (such as a loading button) describes the state.
 */
export function Spinner({ size = "md", label, className }: { size?: keyof typeof SIZES; label?: string; className?: string }) {
  const ring = (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]",
        SIZES[size],
        className,
      )}
    />
  );
  if (!label) return ring;
  return (
    <span role="status" className="inline-flex items-center gap-2">
      {ring}
      <span className="sr-only">{label}</span>
    </span>
  );
}
