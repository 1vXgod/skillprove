"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useI18n } from "../../lib/i18n";
import { CloseIcon } from "../icons";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Built on the native <dialog> opened with showModal(): the browser traps focus, makes the page
 * behind inert, closes on Escape and shows a backdrop. Focus returns to the opener on close.
 */
function useNativeDialog(open: boolean, onOpenChange: (open: boolean) => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => {
      onOpenChange(false);
      opener.current?.focus();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onOpenChange]);

  return ref;
}

const PANEL =
  "sp-dialog m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-border bg-surface-raised p-0 text-foreground shadow-lg max-h-[calc(100dvh-2rem)] overflow-y-auto";

export function Dialog({ open, onOpenChange, title, description, children, footer, className }: DialogProps) {
  const { t } = useI18n();
  const ref = useNativeDialog(open, onOpenChange);
  const id = useId();

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      className={cn(PANEL, className)}
      // A click on the backdrop lands on the dialog element itself, outside its content.
      onClick={(event) => event.target === event.currentTarget && ref.current?.close()}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={`${id}-title`} className="type-h3">
              {title}
            </h2>
            {description && (
              <p id={`${id}-description`} className="type-body-small text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={() => ref.current?.close()}
            className="-mr-2 -mt-2 inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
        {footer && <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </dialog>
  );
}

interface AlertDialogProps extends Omit<DialogProps, "children" | "footer"> {
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
}

/**
 * For confirming consequential actions. Announced as an alert dialog, does not close on a
 * backdrop click, and puts initial focus on Cancel so Enter never confirms by accident.
 */
export function AlertDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel, onConfirm, destructive = false, className }: AlertDialogProps) {
  const { t } = useI18n();
  const ref = useNativeDialog(open, onOpenChange);
  const id = useId();

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      className={cn(PANEL, "max-w-md", className)}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-2">
          <h2 id={`${id}-title`} className="type-h3">
            {title}
          </h2>
          {description && (
            <p id={`${id}-description`} className="type-body text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="outline" autoFocus onClick={() => ref.current?.close()}>
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            onClick={() => {
              onConfirm();
              ref.current?.close();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
