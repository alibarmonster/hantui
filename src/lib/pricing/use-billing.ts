"use client";

import { useCallback, useState } from "react";
import { formatPrice, type PriceParts } from "@/lib/pricing/format";
import type { Billing, Plan } from "@/lib/pricing/types";

export interface UseBillingOptions {
  /** Controlled billing period. */
  billing?: Billing;
  /** Initial billing period when uncontrolled. @default "monthly" */
  defaultBilling?: Billing;
  /** Called when the billing period changes. */
  onBillingChange?: (billing: Billing) => void;
  /** Locale for formatting. @default "en-US" */
  locale?: string;
}

export interface PlanPrice extends PriceParts {
  /** The amount for the current billing period, in major units. */
  amount: number;
  currency: string;
  /** Props for RollingDigits (the number only, without the symbol), so the price rolls when billing changes. */
  rolling: { value: number; decimals: number; locale: string };
}

/** The amount a plan charges for a billing period, or null when it has no public price. */
export function planAmount(plan: Plan, billing: Billing): number | null {
  const amount = plan.price?.amount;
  if (amount === undefined) return null;
  if (typeof amount === "number") return amount;
  if (billing === "once") return amount.once ?? amount.monthly;
  return billing === "yearly" ? amount.yearly : amount.monthly;
}

/** True when a plan charges a different amount per billing period, so a billing toggle changes its price. */
export function hasBillingPrices(plan: Plan) {
  return typeof plan.price?.amount === "object";
}

/**
 * Billing period state, controlled or uncontrolled, plus the price to show for a plan.
 * `priceFor` returns null for plans with a custom price.
 */
export function useBilling({ billing, defaultBilling = "monthly", onBillingChange, locale = "en-US" }: UseBillingOptions = {}) {
  const [internal, setInternal] = useState<Billing>(defaultBilling);
  const current = billing ?? internal;

  const setBilling = useCallback(
    (next: Billing) => {
      if (billing === undefined) setInternal(next);
      onBillingChange?.(next);
    },
    [billing, onBillingChange],
  );

  const priceFor = useCallback(
    (plan: Plan): PlanPrice | null => {
      const amount = planAmount(plan, current);
      if (amount === null || !plan.price) return null;
      const parts = formatPrice(amount, plan.price.currency, locale);
      return { ...parts, amount, currency: plan.price.currency, rolling: { value: amount, decimals: parts.decimals, locale } };
    },
    [current, locale],
  );

  return { billing: current, setBilling, priceFor };
}
