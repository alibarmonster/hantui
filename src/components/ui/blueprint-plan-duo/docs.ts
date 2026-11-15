import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { Building2, Rocket } from "lucide-react";
import { BlueprintPlanDuo } from "@/components/ui/blueprint-plan-duo/blueprint-plan-duo";
import type { Plan } from "@/lib/pricing/types";

const plans: Plan[] = [
  { id: "launch", name: "Launch", tone: "accent", icon: <Rocket />, price: { amount: 499, currency: "USD", period: "/mo" }, features: ["3 environments"], cta: { label: "Start a launch" } },
  { id: "scale", name: "Scale", tone: "ink", icon: <Building2 />, customPrice: "Custom pricing", features: ["Dedicated regions"], cta: { label: "Book a walkthrough" } },
];

export function Plans() {
  return <BlueprintPlanDuo title="Deployment plans" plans={plans} footnotes={["Cancel anytime"]} />;
}`,
  a11y: [
    "Each panel is an article labelled by its heading, features are a list and every call to action is a real link or button with a white focus ring.",
    "The scramble runs on aria-hidden copies. The real price and feature text is in the DOM from the first render, so screen readers never hear scrambled characters.",
    "Crop marks, wireframe boxes and the scanline are decorative and hidden from assistive tech.",
    "White text sits on both panels at 4.5:1 or better with the default accent; check your own accent against white.",
    "With reduced motion enabled, nothing scrambles, draws, rotates or sweeps: the section renders finished.",
  ],
  notes: [
    "Pass exactly two plans; extra ones are ignored. tone picks each panel, and without it the first is accent and the second ink.",
    "On first scroll into view the crop marks and wireframe boxes draw in and the price and feature rows scramble in one after another (Text Scramble).",
    "Hovering a panel turns its wireframe box a quarter turn (the cube is re-projected in JS and written straight to the path) and sweeps one scanline down. Touch skips both.",
    "Everything is set in the mono font in capitals. Plans with a price per billing period show the monthly amount; this section has no billing toggle.",
    "The panels stack below 36rem of the component's own width. The crop marks stay on the outer frame.",
  ],
};
