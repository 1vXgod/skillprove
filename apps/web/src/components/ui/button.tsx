import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "glow" | "secondary" | "outline" | "ghost" | "destructive" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md type-button transition-colors duration-150 ease-standard disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover",
  // The main call to action on a page: primary with a soft brand glow underneath.
  glow: "sp-glow-button bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover",
  secondary: "bg-secondary text-secondary-foreground hover:bg-muted active:bg-muted",
  outline: "border border-input bg-surface text-foreground hover:bg-muted active:bg-muted",
  ghost: "text-foreground hover:bg-muted active:bg-muted",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90 active:opacity-90",
  link: "h-auto px-0 text-accent underline-offset-4 hover:underline",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3",
  md: "h-10 px-4",
  lg: "h-12 px-5",
};

const ICON_SIZES: Record<ButtonSize, string> = { sm: "size-8", md: "size-10", lg: "size-12" };

/** Classes for elements that should look like a button, such as links. */
export function buttonClasses({ variant = "primary", size = "md", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(BASE, VARIANTS[variant], variant !== "link" && SIZES[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, keeps the label for screen readers and blocks repeat presses. */
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = "primary", size = "md", loading = false, icon, disabled, className, children, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  /** Required: an icon alone has no accessible name. */
  label: string;
  icon: ReactNode;
  variant?: Exclude<ButtonVariant, "link">;
  size?: ButtonSize;
}

export function IconButton({ label, icon, variant = "ghost", size = "md", className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(BASE, VARIANTS[variant], ICON_SIZES[size], "px-0", className)}
      {...props}
    >
      {icon}
    </button>
  );
}
