"use client";

import { cloneElement, useEffect, useId, useState, type ReactElement } from "react";
import { cn } from "../../lib/cn";

interface TooltipProps {
  content: string;
  /** A single focusable element, such as a button. It is described by the tooltip. */
  children: ReactElement<{ "aria-describedby"?: string }>;
  side?: "top" | "bottom";
}

/**
 * Shown on hover and keyboard focus, dismissed with Escape, and hoverable itself (WCAG 1.4.13).
 * Only for supplementary hints: anything essential belongs in visible text.
 */
export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {cloneElement(children, { "aria-describedby": id })}
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        className={cn(
          "absolute left-1/2 z-[var(--sp-z-tooltip)] w-max max-w-64 -translate-x-1/2 rounded-md bg-foreground px-2.5 py-1.5 type-caption text-background shadow-md",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        )}
      >
        {content}
      </span>
    </span>
  );
}
