import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { initials } from "@skillprove/shared/i18n";
import { ErrorIcon, InfoIcon, SuccessIcon, WarningIcon } from "../icons";

export function Separator({ orientation = "horizontal", decorative = true, className }: { orientation?: "horizontal" | "vertical"; decorative?: boolean; className?: string }) {
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("flex flex-col rounded-lg border border-border bg-surface", className)} {...props} />;
}

export function CardHeader({ title, description, action, headingLevel = 2 }: { title: string; description?: string; action?: ReactNode; headingLevel?: 2 | 3 | 4 }) {
  const Heading = `h${headingLevel}` as const;
  return (
    <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
      <div className="flex min-w-0 flex-col gap-1">
        <Heading className="type-h4 text-foreground">{title}</Heading>
        {description && <p className="type-body-small text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-5 sm:px-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <footer className={cn("flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4 sm:px-6", className)} {...props} />;
}

export type Tone = "neutral" | "success" | "warning" | "error" | "info";

const BADGE_TONES: Record<Tone, string> = {
  neutral: "bg-muted text-foreground",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  error: "bg-destructive-subtle text-destructive",
  info: "bg-info-subtle text-info",
};

/** A short status label. The text carries the meaning; colour only reinforces it. */
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 type-caption font-medium", BADGE_TONES[tone], className)}>
      {children}
    </span>
  );
}

const AVATAR_SIZES = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg" } as const;

/** Shows the picture when there is one, otherwise initials. Either way the name is the label. */
export function Avatar({ name, src, size = "md", className }: { name: string; src?: string | null; size?: keyof typeof AVATAR_SIZES; className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-semibold text-secondary-foreground", AVATAR_SIZES[size], className)}>
      {src ? (
        // A plain img: avatars come from Clerk's CDN and need no Next image optimisation.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <span role="img" aria-label={name}>
          <span aria-hidden="true">{initials(name)}</span>
        </span>
      )}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted motion-reduce:animate-none", className)} />;
}

export function Progress({ value, label, className }: { value: number; label: string; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-standard" style={{ width: `${clamped}%` }} />
    </div>
  );
}

const ALERT_TONES = {
  info: { classes: "border-info/30 bg-info-subtle text-info", Icon: InfoIcon },
  success: { classes: "border-success/30 bg-success-subtle text-success", Icon: SuccessIcon },
  warning: { classes: "border-warning/30 bg-warning-subtle text-warning", Icon: WarningIcon },
  error: { classes: "border-destructive/30 bg-destructive-subtle text-destructive", Icon: ErrorIcon },
} as const;

/** Errors interrupt screen readers (role=alert); other tones are announced politely. */
export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof ALERT_TONES; title?: string; children?: ReactNode; className?: string }) {
  const { classes, Icon } = ALERT_TONES[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border p-4", classes, className)}>
      <Icon size={20} className="mt-px shrink-0" />
      <div className="flex min-w-0 flex-col gap-0.5">
        {title && <p className="type-label">{title}</p>}
        {children && <div className="type-body-small text-foreground">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center", className)}>
      {icon && <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>}
      <div className="flex max-w-sm flex-col gap-1">
        <p className="type-h4 text-foreground">{title}</p>
        {description && <p className="type-body-small text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
