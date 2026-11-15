"use client";

import { Building2, Layers, PenTool } from "lucide-react";
import { GlassTierPricing } from "@/components/ui/glass-tier-pricing/glass-tier-pricing";
import type { Plan } from "@/lib/pricing/types";

const tiers: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    icon: <PenTool />,
    description: "For independent designers and illustrators running their own client work.",
    price: { amount: { monthly: 19, yearly: 15 }, currency: "USD" },
    features: ["3 active client projects", "Proposals and invoices", "Shared review links", "Email support"],
    cta: { label: "Start with Solo" },
  },
  {
    id: "studio",
    name: "Studio",
    icon: <Layers />,
    badge: "Popular",
    description: "For small studios that plan, review and bill together in one place.",
    price: { amount: { monthly: 49, yearly: 39 }, currency: "USD" },
    features: ["Unlimited projects", "Up to 10 teammates", "Time tracking and retainers", "Branded client portal", "Priority support"],
    cta: { label: "Start with Studio" },
  },
  {
    id: "agency",
    name: "Agency",
    icon: <Building2 />,
    description: "For agencies with several teams, shared resourcing and custom contracts.",
    customPrice: "Custom quote",
    features: ["Everything in Studio", "Unlimited teammates", "Resource planning", "A dedicated onboarding lead"],
    cta: { label: "Talk to us" },
  },
];

export function Default() {
  return (
    <GlassTierPricing
      plans={tiers}
      featuredId="studio"
      defaultBilling="monthly"
      description="Pick the tier that fits your practice today. Move up or down whenever the work changes."
    />
  );
}

const oneTime: Plan[] = [
  { ...tiers[0], price: { amount: 199, currency: "USD", period: "One time" }, cta: { label: "Buy Solo" } },
  { ...tiers[1], price: { amount: 499, currency: "USD", period: "One time" }, cta: { label: "Buy Studio" } },
  tiers[2],
];

export function OneTime() {
  return <GlassTierPricing eyebrow="Lifetime licenses" title="Pay once, keep it for good." plans={oneTime} featuredId="studio" />;
}
