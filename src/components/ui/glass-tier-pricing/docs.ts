import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { GlassTierPricing } from "@/components/ui/glass-tier-pricing/glass-tier-pricing";
import type { Plan } from "@/lib/pricing/types";

const plans: Plan[] = [
  { id: "solo", name: "Solo", price: { amount: { monthly: 19, yearly: 15 }, currency: "USD" }, features: ["3 projects"], cta: { label: "Start with Solo" } },
  { id: "studio", name: "Studio", badge: "Popular", price: { amount: { monthly: 49, yearly: 39 }, currency: "USD" }, features: ["Unlimited projects"], cta: { label: "Start with Studio" } },
  { id: "agency", name: "Agency", customPrice: "Custom quote", features: ["Everything in Studio"], cta: { label: "Talk to us" } },
];

export function Pricing() {
  return <GlassTierPricing plans={plans} featuredId="studio" defaultBilling="monthly" />;
}`,
  a11y: [
    "Each tier is an article labelled by its heading, features are a list and every call to action is a real link or button.",
    "The billing toggle is a radio group: arrow keys move between periods and the selected one is the only tab stop.",
    "Moving focus into a tier moves the spotlight there, the same as hovering it.",
    "On narrow containers the tiers become a horizontal scroll-snap row with a labelled dot per tier; the dot for the tier in view is marked aria-current.",
    "Prices are announced once as full text; the rolling reels are hidden from assistive tech.",
    "With reduced motion enabled, the spotlight jumps between tiers, the inner panels do not tilt and prices swap instantly.",
  ],
  notes: [
    "The accent wash and glow are one shared layout element that glides to the hovered, focused or snapped tier and returns to featuredId. The filled button stays on the featured tier.",
    "The section paints its own soft color wash, so the frosted cards have something to blur. Without backdrop-filter support the cards fall back to solid white at 92%.",
    "The toggle shows when billing or defaultBilling is set. Plans with one amount keep their own period text; plans with a custom price show customPrice.",
    "The layout follows the component's own width (container queries): three columns from 40rem, a carousel that opens on the featured tier below that.",
    "Colors come from --primary. Text on the filled button is white, so keep --primary at 4.5:1 or better against white.",
  ],
};
