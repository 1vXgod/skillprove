"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

/**
 * The WAI-ARIA tabs pattern with automatic activation: only the selected tab is in the tab
 * order, arrow keys, Home and End move between tabs, and each panel is labelled by its tab.
 */
export function Tabs({ items, label, value, defaultValue, onValueChange, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value ?? "");
  const selected = value ?? internal;
  const id = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(next: string) {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = items.findIndex((item) => item.value === selected);
    const targets: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const nextIndex = (target + items.length) % items.length;
    const next = items[nextIndex];
    if (!next) return;
    select(next.value);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b border-border">
        {items.map((item, index) => {
          const isSelected = item.value === selected;
          return (
            <button
              key={item.value}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${item.value}`}
              aria-selected={isSelected}
              aria-controls={`${id}-panel-${item.value}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => select(item.value)}
              className={cn(
                "-mb-px inline-flex h-10 shrink-0 items-center border-b-2 px-3 type-label transition-colors duration-150",
                isSelected ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.value}
          role="tabpanel"
          id={`${id}-panel-${item.value}`}
          aria-labelledby={`${id}-tab-${item.value}`}
          hidden={item.value !== selected}
          tabIndex={0}
          className="rounded-md"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
