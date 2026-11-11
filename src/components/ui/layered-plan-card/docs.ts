import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { LayeredPlanCard } from "@/components/ui/layered-plan-card/layered-plan-card";
import type { Plan } from "@/lib/pricing/types";

const pro: Plan = {
  id: "pro",
  name: "Pro",
  badge: "Popular",
  price: { amount: { monthly: 24, yearly: 19 }, currency: "USD", period: "per user / month" },
  features: ["Unlimited projects", "Advanced permissions", "Priority support"],
  cta: { label: "Upgrade to Pro", href: "/checkout" },
};

export function Upgrade() {
  return <LayeredPlanCard plan={pro} defaultBilling="yearly" />;
}`,
  a11y: [
    "The band at the bottom is a real link (when cta.href is set) or a button, with a white focus outline inside the band.",
    "Features are a list, the plan name is a heading and the badge is plain text.",
    "The billing toggle is a radio group: arrow keys move between periods and the selected one is the only tab stop.",
    "The price is announced once as its full text; the rolling reels are hidden from assistive tech.",
    "With reduced motion enabled, the card does not lift and the glow does not move or brighten. Prices swap instantly.",
  ],
  notes: [
    "The card is two layers: the base card in the accent color, and a white card on top of it. The part of the base that shows below is the call to action.",
    "Hovering slides the top card up 8px so more of the band shows, and pressing the band sinks it 2px. Hover effects are skipped on touch, where only the press applies.",
    "The toggle appears when billing or defaultBilling is set and the plan's price has monthly and yearly amounts. Without it, priceNote is shown under the name.",
    "accent takes any CSS color. White text sits on it and the checks use it on a light tint, so pick one with at least 4.5:1 against white.",
    "The glow is a blurred CSS gradient under the stack, not a canvas. Leave room below the card for it, or turn it off with glow={false}.",
  ],
};
