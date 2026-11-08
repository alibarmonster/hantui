import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { DotBurstFeatureTabs, FeatureNote } from "@/components/ui/dot-burst-feature-tabs/dot-burst-feature-tabs";

<DotBurstFeatureTabs
  heading="Weekends, sorted."
  items={[
    {
      id: "plan",
      title: "Plan the route",
      description: "Pick a trailhead and get a loop that fits your afternoon.",
      color: "#0e9f9a",
      card: <FeatureNote title="Ridge loop, 9.4 km" body="Back before sunset" chip="412 m climb" accent="#0e9f9a" />,
    },
    // …
  ]}
/>`,
  a11y: [
    "The list is a vertical tablist and the stage its tabpanel: arrow keys (and Home/End) move between features with a roving tabindex, and the open item's title labels the panel.",
    "Autoplay has a visible Pause/Play button, pauses while the pointer is over the section, while focus is inside it, while the stage is offscreen and in hidden tabs, and stops for good once someone picks a feature.",
    "The cards are real DOM. Under reduced motion there is no autoplay and no dot motion, and cards crossfade without blur or scale.",
  ],
  notes: [
    "The stage color tweens over 500ms in OKLCH (`mixOklch` in `src/lib/color.ts`), so the midpoint between, say, orange and violet stays saturated instead of turning brown.",
    "Dots are 2–4px squares on a grid, laid out from a seed per feature in clumps along the edges and corners and never in the middle. On a change the old dots fly outward and fade in about a third of a second while the new clusters grow in one after another; a few twinkle at rest. They are drawn on one canvas with the shared canvas loop (DPR capped at 2, paused offscreen and in hidden tabs).",
    "`FeatureNote` and `NoteMeter` build the white notification cards; a card's chip pops in a beat after the card blurs in. Any ReactNode works as a card.",
    "On narrow containers the stage moves above the list and a horizontal swipe on it changes features.",
  ],
};
