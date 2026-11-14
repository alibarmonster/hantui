"use client";

import type { ReactElement, ReactNode } from "react";
import { Tooltip } from "radix-ui";

/**
 * Tooltips for the site's icon-only controls (DESIGN 9): 150ms before the first one, then instant on
 * neighbors. Only a delayed hover animates (125ms fade + scale from 0.97 at the trigger); keyboard focus
 * and neighbors show at once, and touch never opens one.
 */
export function HintProvider({ children }: { children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
      {children}
    </Tooltip.Provider>
  );
}

/** Wraps one control; `label` should match its accessible name. */
export function Hint({ label, side = "bottom", children }: { label: string; side?: "top" | "bottom" | "left" | "right"; children: ReactElement }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side={side} sideOffset={6} collisionPadding={8} className="hint z-[70] rounded-md bg-foreground px-2 py-1 text-[12px] leading-4 font-medium text-background shadow-sm select-none">
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
