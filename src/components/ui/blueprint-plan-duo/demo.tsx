"use client";

import { Building2, Rocket, Sprout, Trees } from "lucide-react";
import { BlueprintPlanDuo } from "@/components/ui/blueprint-plan-duo/blueprint-plan-duo";
import type { Plan } from "@/lib/pricing/types";

const plans: Plan[] = [
  {
    id: "launch",
    name: "Launch",
    tone: "accent",
    icon: <Rocket strokeWidth={1.5} />,
    description: "Ship one product on managed infrastructure.",
    price: { amount: 499, currency: "USD", period: "/mo" },
    features: ["3 production environments", "Preview builds on every branch", "Rollbacks in one click", "Email support, next business day"],
    cta: { label: "Start a launch" },
  },
  {
    id: "scale",
    name: "Scale",
    tone: "ink",
    icon: <Building2 strokeWidth={1.5} />,
    description: "Run many teams on dedicated capacity.",
    customPrice: "Custom pricing",
    priceNote: "Tailored to your footprint",
    features: ["Dedicated regions", "Private networking", "Role-based access and audit log", "A named solutions engineer"],
    cta: { label: "Book a walkthrough" },
  },
];

export function Default() {
  return (
    <BlueprintPlanDuo
      title="Deployment plans"
      description="Two ways to run your stack. Switch whenever your traffic does."
      plans={plans}
      footnotes={["Sample uptime target: 99.9%", "Example security review on request", "Placeholder data residency note"]}
    />
  );
}

const garden: Plan[] = [
  {
    id: "seed",
    name: "Seed",
    icon: <Sprout strokeWidth={1.5} />,
    description: "For a single plot and a weekend routine.",
    price: { amount: 12, currency: "EUR", period: "/mo" },
    features: ["Planting calendar", "Frost alerts", "One shared bed"],
    cta: { label: "Plant a seed", href: "#seed" },
  },
  {
    id: "grove",
    name: "Grove",
    icon: <Trees strokeWidth={1.5} />,
    description: "For community gardens with many hands.",
    price: { amount: 48, currency: "EUR", period: "/mo" },
    features: ["Unlimited beds and members", "Harvest log", "Tool lending sheet"],
    cta: { label: "Grow a grove", href: "#grove" },
  },
];

export function Ember() {
  return <BlueprintPlanDuo title="Garden plans" plans={garden} accent="#b4380a" locale="de-DE" priceLabel="From" />;
}
