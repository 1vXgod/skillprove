import type { ReactNode } from "react";

/** The title block every signed-in page starts with. */
export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-2xl flex-col gap-1">
        <h1 className="type-h1 text-foreground">{title}</h1>
        {description && <p className="type-body text-muted-foreground">{description}</p>}
      </div>
      {children}
    </header>
  );
}
