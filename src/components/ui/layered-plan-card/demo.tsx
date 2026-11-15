"use client";

import { useState } from "react";
import { LayeredPlanCard } from "@/components/ui/layered-plan-card/layered-plan-card";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/pricing/types";

const pro: Plan = {
  id: "pro",
  name: "Pro",
  badge: "Popular",
  price: { amount: { monthly: 24, yearly: 19 }, currency: "USD", period: "per user / month" },
  features: ["Unlimited projects and boards", "Chat & docs sync", "Advanced permissions", "Priority support"],
  cta: { label: "Upgrade to Pro" },
};

const ACCENTS = [
  { id: "blue", label: "Blue", color: "#2563eb" },
  { id: "ember", label: "Ember", color: "#c2410c" },
  { id: "ink", label: "Ink", color: "#18181b" },
] as const;

export function Default() {
  const [accent, setAccent] = useState<(typeof ACCENTS)[number]>(ACCENTS[0]);
  return (
    <div className="flex w-full flex-col items-center gap-8 pb-6">
      <div role="radiogroup" aria-label="Accent" className="flex gap-2">
        {ACCENTS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === accent.id}
            onClick={() => setAccent(option)}
            className={cn(
              "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              option.id === accent.id ? "border-foreground text-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <span aria-hidden="true" className="size-3 rounded-full" style={{ background: option.color }} />
            {option.label}
          </button>
        ))}
      </div>
      <LayeredPlanCard plan={pro} accent={accent.color} defaultBilling="yearly" />
    </div>
  );
}

const team: Plan = {
  id: "team",
  name: "Team",
  priceNote: "Billed yearly",
  price: { amount: 12, currency: "EUR", period: "per seat / month" },
  features: ["Shared workspaces", "Version history for 90 days", "Guest access"],
  cta: { label: "Start with Team", href: "#team" },
};

export function LinkAndLocale() {
  return (
    <div className="w-full max-w-sm pb-6">
      <LayeredPlanCard plan={team} accent="#0f766e" locale="de-DE" />
    </div>
  );
}

const enterprise: Plan = {
  id: "enterprise",
  name: "Enterprise",
  priceNote: "Annual contract",
  customPrice: "Custom quote",
  badge: "Sales assisted",
  features: ["Everything in Pro", "Single sign-on and audit log", "A named success manager"],
  cta: { label: "Talk to sales" },
};

export function CustomPrice() {
  return (
    <div className="w-full max-w-sm pb-6">
      <LayeredPlanCard plan={enterprise} accent="#18181b" glow={false} />
    </div>
  );
}
