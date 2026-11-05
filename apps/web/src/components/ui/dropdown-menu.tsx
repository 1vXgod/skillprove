"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { cn } from "../../lib/cn";
import { CheckIcon } from "../icons";

export interface MenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  /** Set for one-of-many choices, such as a language: the item becomes a menuitemradio. */
  checked?: boolean;
}

export interface MenuLabelGroup {
  label?: string;
  items: MenuItem[];
}

interface DropdownMenuProps {
  /** Renders the trigger. Spread the props onto a button. */
  trigger: (props: TriggerProps) => ReactNode;
  groups: MenuLabelGroup[];
  align?: "start" | "end";
  /** Extra content above the items, such as the signed-in email. Not focusable. */
  header?: ReactNode;
}

export interface TriggerProps {
  ref: RefObject<HTMLButtonElement | null>;
  id: string;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

/**
 * The WAI-ARIA menu button pattern: arrow keys, Home and End move between items, Escape closes
 * and returns focus to the trigger, and Tab or a click outside closes it.
 */
export function DropdownMenu({ trigger, groups, align = "end", header }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusOnOpen, setFocusOnOpen] = useState<"first" | "last">("first");

  const items = () => [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not([disabled])') ?? [])];

  useEffect(() => {
    if (!open) return;
    const list = items();
    (focusOnOpen === "first" ? list[0] : list[list.length - 1])?.focus();

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, focusOnOpen]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setFocusOnOpen(event.key === "ArrowDown" ? "first" : "last");
      setOpen(true);
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = items();
    const index = list.findIndex((item) => item === document.activeElement);
    const move = (next: number) => {
      event.preventDefault();
      list[(next + list.length) % list.length]?.focus();
    };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(list.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") close(false);
  }

  return (
    <div className="relative inline-flex">
      {trigger({
        ref: triggerRef,
        id: `${id}-trigger`,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": `${id}-menu`,
        onClick: () => {
          setFocusOnOpen("first");
          setOpen((value) => !value);
        },
        onKeyDown: onTriggerKeyDown,
      })}
      <div
        ref={menuRef}
        id={`${id}-menu`}
        role="menu"
        aria-labelledby={`${id}-trigger`}
        hidden={!open}
        onKeyDown={onMenuKeyDown}
        className={cn(
          "absolute top-full z-[var(--sp-z-popover)] mt-1.5 min-w-56 rounded-lg border border-border bg-surface-raised p-1 shadow-md",
          align === "end" ? "right-0" : "left-0",
        )}
      >
        {header && <div className="px-3 py-2">{header}</div>}
        {groups.map((group, groupIndex) => (
          <div key={group.label ?? groupIndex} role="group" aria-label={group.label} className={cn(groupIndex > 0 || header ? "mt-1 border-t border-border pt-1" : undefined)}>
            {group.label && <p className="px-3 pb-1 pt-2 type-caption font-medium text-muted-foreground">{group.label}</p>}
            {group.items.map((item) => (
              <button
                key={item.key}
                type="button"
                role={item.checked === undefined ? "menuitem" : "menuitemradio"}
                aria-checked={item.checked}
                tabIndex={-1}
                disabled={item.disabled}
                onClick={() => {
                  close(true);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left type-body-small outline-none focus:bg-muted hover:bg-muted disabled:opacity-50",
                  item.destructive ? "text-destructive" : "text-foreground",
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.checked && <CheckIcon size={16} className="text-accent" />}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
