import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";

type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & {
  label: string;
  description?: string;
  /** A large bordered row, all of it clickable, for answers. */
  card?: boolean;
  /** A decorative icon before the text (card rows and switches). */
  icon?: ReactNode;
};

const CARD =
  "rounded-lg border border-border bg-surface p-4 transition-colors duration-150 ease-standard hover:border-primary/50 hover:bg-muted has-checked:border-primary has-checked:bg-secondary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring";

const BOX =
  "peer size-4 shrink-0 cursor-pointer appearance-none border border-input bg-surface transition-colors duration-150 ease-standard checked:border-primary checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function ChoiceRow({ id, label, description, control, disabled, card, icon }: { id: string; label: string; description?: string; control: ReactNode; disabled?: boolean; card?: boolean; icon?: ReactNode }) {
  if (card) {
    // The whole row is the label, so a click anywhere on it chooses the answer.
    return (
      <label htmlFor={id} className={cn("flex items-start gap-3", CARD, disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
        <span className="relative mt-0.5 flex size-5 items-center justify-center">{control}</span>
        {icon && (
          <span aria-hidden="true" className="mt-px shrink-0 text-primary">
            {icon}
          </span>
        )}
        <span className="flex flex-col">
          <span className="type-body text-foreground">{label}</span>
          {description && <span className="type-body-small text-muted-foreground">{description}</span>}
        </span>
      </label>
    );
  }
  return (
    <div className={cn("flex items-start gap-3", disabled && "opacity-60")}>
      <span className="relative mt-0.5 flex size-5 items-center justify-center">{control}</span>
      <span className="flex flex-col">
        <label htmlFor={id} className={cn("type-label text-foreground", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
          {label}
        </label>
        {description && <span className="type-body-small text-muted-foreground">{description}</span>}
      </span>
    </div>
  );
}

/** A native checkbox, styled. Space toggles it and the label is clickable. */
export function Checkbox({ label, description, card, icon, className, ...props }: ChoiceProps) {
  const id = useId();
  return (
    <div className={className}>
      <ChoiceRow
        id={id}
        label={label}
        description={description}
        disabled={props.disabled}
        card={card}
        icon={icon}
        control={
          <>
            <input id={id} type="checkbox" className={cn(BOX, "rounded-sm")} {...props} />
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="pointer-events-none absolute size-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
            >
              <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        }
      />
    </div>
  );
}

/** One radio button. Group them with RadioGroup so they share a name and a legend. */
export function Radio({ label, description, card, icon, className, ...props }: ChoiceProps) {
  const id = useId();
  return (
    <div className={className}>
      <ChoiceRow
        id={id}
        label={label}
        description={description}
        disabled={props.disabled}
        card={card}
        icon={icon}
        control={
          <>
            <input id={id} type="radio" className={cn(BOX, "rounded-full")} {...props} />
            <span aria-hidden="true" className="pointer-events-none absolute size-1.5 rounded-full bg-primary-foreground opacity-0 peer-checked:opacity-100" />
          </>
        }
      />
    </div>
  );
}

/** A fieldset with a legend: screen readers announce the question with each option. */
export function RadioGroup({ legend, children, className }: { legend: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn("flex flex-col gap-3", className)}>
      <legend className="mb-1 type-label text-foreground">{legend}</legend>
      {children}
    </fieldset>
  );
}

/** A native checkbox with the switch role, announced as on or off. */
export function Switch({ label, description, icon, card: _card, className, ...props }: ChoiceProps) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-4", props.disabled && "opacity-60", className)}>
      {icon && (
        <span aria-hidden="true" className="mt-px shrink-0 text-muted-foreground">
          {icon}
        </span>
      )}
      <span className="flex flex-1 flex-col">
        <label htmlFor={id} className={cn("type-label text-foreground", props.disabled ? "cursor-not-allowed" : "cursor-pointer")}>
          {label}
        </label>
        {description && <span className="type-body-small text-muted-foreground">{description}</span>}
      </span>
      <span className="relative inline-flex h-6 w-10 shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="peer absolute inset-0 cursor-pointer appearance-none rounded-full bg-input transition-colors duration-150 ease-standard checked:bg-primary disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          {...props}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none relative ml-0.5 size-5 rounded-full bg-surface shadow-sm transition-transform duration-150 ease-standard peer-checked:translate-x-4"
        />
      </span>
    </div>
  );
}
