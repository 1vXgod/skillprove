import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { CheckIcon, CloseIcon } from "../icons";
import { Spinner } from "./spinner";

export type StepState = "done" | "active" | "pending" | "failed" | "cancelled";

const DOT: Record<StepState, string> = {
  done: "border-success bg-success-subtle text-success",
  active: "border-primary bg-secondary text-primary",
  pending: "border-border bg-surface text-muted-foreground",
  failed: "border-destructive bg-destructive-subtle text-destructive",
  cancelled: "border-border bg-muted text-muted-foreground",
};

/**
 * Steps in order, each with its state. The state is also given in words (`stateLabel`), so it
 * never depends on colour or icon alone. `aria-current` marks the active step.
 */
export function Stepper({ steps, className }: { steps: { key: string; label: string; state: StepState; stateLabel: string }[]; className?: string }) {
  return (
    <ol className={cn("flex items-start", className)}>
      {steps.map((step, index) => {
        let icon: ReactNode = <span className="type-label">{index + 1}</span>;
        if (step.state === "done") icon = <CheckIcon size={16} />;
        if (step.state === "failed" || step.state === "cancelled") icon = <CloseIcon size={16} />;
        if (step.state === "active") icon = <Spinner size="sm" label="" />;
        return (
          <li key={step.key} aria-current={step.state === "active" ? "step" : undefined} className="relative flex flex-1 flex-col items-center gap-2 text-center">
            {index > 0 && <span aria-hidden="true" className={cn("absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2", step.state === "done" || step.state === "active" ? "bg-primary" : "bg-border")} />}
            <span aria-hidden="true" className={cn("relative z-10 flex size-8 items-center justify-center rounded-full border-2", DOT[step.state])}>
              {icon}
            </span>
            <span className={cn("type-label", step.state === "pending" || step.state === "cancelled" ? "text-muted-foreground" : step.state === "failed" ? "text-destructive" : "text-foreground")}>{step.label}</span>
            <span className="sr-only">{step.stateLabel}</span>
          </li>
        );
      })}
    </ol>
  );
}
