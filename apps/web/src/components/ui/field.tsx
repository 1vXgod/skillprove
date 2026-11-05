import { useId, type LabelHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { ErrorIcon } from "../icons";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("type-label text-foreground", className)} {...props} />;
}

export interface FieldProps {
  label: string;
  /** Guidance shown under the control. */
  helperText?: string;
  /** A validation message. Marks the control invalid and replaces the helper text. */
  error?: string;
  /** Text shown after the label, such as "Optional". */
  labelHint?: string;
}

/** Ids that tie a control to its label and messages. */
export function useFieldIds(error?: string, helperText?: string) {
  const id = useId();
  const messageId = `${id}-message`;
  return {
    id,
    messageId,
    describedBy: error || helperText ? messageId : undefined,
  };
}

/** Lays out a label, a control and its message, and links them for assistive technology. */
export function Field({
  label,
  labelHint,
  helperText,
  error,
  id,
  messageId,
  className,
  children,
}: FieldProps & { id: string; messageId: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="flex items-baseline justify-between gap-2">
        <span>{label}</span>
        {labelHint && <span className="type-caption text-muted-foreground">{labelHint}</span>}
      </Label>
      {children}
      {error ? (
        <p id={messageId} className="flex items-start gap-1.5 type-body-small text-destructive">
          <ErrorIcon size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : (
        helperText && (
          <p id={messageId} className="type-body-small text-muted-foreground">
            {helperText}
          </p>
        )
      )}
    </div>
  );
}

/** Shared control styling: neutral border, accent focus ring, red when invalid. */
export const controlClasses = cn(
  "w-full rounded-md border border-input bg-surface px-3 type-body text-foreground placeholder:text-muted-foreground",
  "transition-[border-color,box-shadow] duration-150 ease-standard",
  "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
  "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/30",
  "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
);
