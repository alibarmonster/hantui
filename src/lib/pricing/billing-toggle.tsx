"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import type { Billing } from "@/lib/pricing/types";

export interface BillingToggleProps {
  /** The selected billing period. */
  value: Billing;
  /** Called when another period is picked. */
  onValueChange: (billing: Billing) => void;
  /** Periods to offer, in order. @default ["monthly", "yearly"] */
  options?: readonly Billing[];
  /** Visible text per period. @default { monthly: "Monthly", yearly: "Yearly", once: "One time" } */
  labels?: Partial<Record<Billing, string>>;
  /** Accessible name of the group. @default "Billing period" */
  label?: string;
  /** Control height: 32px or 40px (both keep a 40px hit area). @default "md" */
  size?: "sm" | "md";
  className?: string;
}

const DEFAULT_OPTIONS: readonly Billing[] = ["monthly", "yearly"];
const DEFAULT_LABELS: Record<Billing, string> = { monthly: "Monthly", yearly: "Yearly", once: "One time" };

/** A segmented radio group for the billing period, with a pill that glides to the selected option. */
export function BillingToggle({ value, onValueChange, options = DEFAULT_OPTIONS, labels, label = "Billing period", size = "md", className }: BillingToggleProps) {
  const id = useId();
  const reduceMotion = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (Math.max(0, options.indexOf(value)) + step + options.length) % options.length;
    onValueChange(options[next]);
    refs.current[next]?.focus();
  }

  return (
    <LayoutGroup id={id}>
      <div
        role="radiogroup"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={cn("inline-flex rounded-full border border-border bg-surface p-1", className)}
      >
        {options.map((option, index) => {
          const active = option === value;
          return (
            <button
              key={option}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onValueChange(option)}
              className={cn(
                "relative inline-flex cursor-pointer items-center rounded-full font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
                size === "sm" ? "h-7 px-3 text-xs" : "h-8 px-4 text-[13px]",
                active ? "text-background" : "text-foreground/65 hover:text-foreground",
              )}
            >
              {active ? (
                <motion.span layoutId="pill" transition={reduceMotion ? { duration: 0 } : spring.snappy} className="absolute inset-0 rounded-full bg-foreground" />
              ) : null}
              <span className="relative">{labels?.[option] ?? DEFAULT_LABELS[option]}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
