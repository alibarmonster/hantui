import type { ReactNode } from "react";

/** How a plan is billed. `once` is a single payment. */
export type Billing = "monthly" | "yearly" | "once";

export interface Price {
  /** One amount in major units (199 = $199), or one per billing period (yearly is the per-month equivalent). */
  amount: number | { monthly: number; yearly: number };
  /** ISO 4217 currency code, e.g. "USD". */
  currency: string;
  /** Text after the price, e.g. "per user / month" or "One time". */
  period?: string;
}

export interface PlanCta {
  /** Button label. */
  label: string;
  /** Renders the button as a link when set. */
  href?: string;
}

export interface Plan {
  /** Stable id, used for keys and selection. */
  id: string;
  name: string;
  description?: string;
  /** Small icon shown next to the name. */
  icon?: ReactNode;
  /** Omit for plans without a public price and set `customPrice` instead. */
  price?: Price;
  /** Shown in place of a price, e.g. "Custom quote". */
  customPrice?: string;
  /** Small line near the price, e.g. "Billed yearly". */
  priceNote?: string;
  features: string[];
  cta: PlanCta;
  /** Badge text, e.g. "Popular". */
  badge?: string;
  /** Panel tone, for components that style plans differently. */
  tone?: "accent" | "ink" | "neutral";
}
