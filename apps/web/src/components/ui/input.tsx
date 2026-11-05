"use client";

import { useState, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { useI18n } from "../../lib/i18n";
import { ChevronDownIcon, EyeIcon, EyeOffIcon } from "../icons";
import { controlClasses, Field, useFieldIds, type FieldProps } from "./field";

type InputProps = FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

export function Input({ label, labelHint, helperText, error, className, ...props }: InputProps) {
  const { id, messageId, describedBy } = useFieldIds(error, helperText);
  return (
    <Field {...{ label, labelHint, helperText, error, id, messageId, className }}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(controlClasses, "h-10")}
        {...props}
      />
    </Field>
  );
}

export function PasswordInput({ label, labelHint, helperText, error, className, ...props }: Omit<InputProps, "type">) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const { id, messageId, describedBy } = useFieldIds(error, helperText);
  return (
    <Field {...{ label, labelHint, helperText, error, id, messageId, className }}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClasses, "h-10 pr-11")}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={id}
          aria-label={visible ? t("components.hidePassword") : t("components.showPassword")}
          disabled={props.disabled}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>
    </Field>
  );
}

type TextareaProps = FieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">;

export function Textarea({ label, labelHint, helperText, error, className, rows = 4, ...props }: TextareaProps) {
  const { id, messageId, describedBy } = useFieldIds(error, helperText);
  return (
    <Field {...{ label, labelHint, helperText, error, id, messageId, className }}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(controlClasses, "min-h-20 resize-y py-2")}
        {...props}
      />
    </Field>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type SelectProps = FieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "children"> & {
    options: SelectOption[];
    /** Shown as an unselectable first option when nothing is chosen. */
    placeholder?: string;
  };

/** The native select: full keyboard, screen reader and mobile picker support for free. */
export function Select({ label, labelHint, helperText, error, className, options, placeholder, ...props }: SelectProps) {
  const { t } = useI18n();
  const { id, messageId, describedBy } = useFieldIds(error, helperText);
  return (
    <Field {...{ label, labelHint, helperText, error, id, messageId, className }}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClasses, "h-10 appearance-none pr-10")}
          {...props}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder || t("components.selectPlaceholder")}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
    </Field>
  );
}
