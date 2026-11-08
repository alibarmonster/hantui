import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { InkBloomFooter } from "@/components/ui/ink-bloom-footer/ink-bloom-footer";

<InkBloomFooter
  wordmark="Fernwick"
  quote={{ text: "I only meant to check the pricing page.", cite: "A reader, probably" }}
  columns={[
    { title: "Product", links: [{ label: "Pricing", href: "/pricing" }] },
    { title: "Help", links: [{ label: "Support", href: "/support" }] },
  ]}
  inks={["#f2b705", "#e0457b", "#3b3a98"]}
/>`,
  a11y: [
    "A normal footer element with a labelled navigation and real links; the ink canvas and the fallback blobs are aria-hidden decoration.",
    "Links and text stay above the ink at 4.5:1: they carry a soft paper-colored halo, and the ink is lighter under the link columns. The wordmark is solid ink on top.",
    "On touch screens a vertical drag keeps scrolling the page; a horizontal drag or a 150ms hold draws. Clicks on links and buttons never draw.",
    "Under reduced motion the ink doesn't spread: strokes stamp still blooms and the resting wash is a static image.",
  ],
  notes: [
    "The ink is a small watercolor simulation in WebGL2 with half-float ping-pong targets (`src/lib/webgl/ping-pong.ts`, shipped with the component): one texture holds water and suspended pigment, another the deposited pigment. Each step, water flows to drier neighbours through paper whose permeability comes from noise, so wet fronts branch into cauliflower edges; evaporation is fastest at the thin front, so pigment is carried outward and settles there as a darker rim; fresh water pushing into drying pigment lifts some of it again and leaves pale back-runs.",
    "Pigments are stored as absorbance, so they mix subtractively where strokes meet. The simulation runs at about a third of the display resolution and is composited at full resolution over the paper with the resting wash: a wavy, feathered waterline with a pale cyan fringe whose colors drift slowly across.",
    "It stops stepping a few seconds after the last stroke (only the resting wash is redrawn, about 12 times a second), pauses offscreen and in hidden tabs, and caps DPR at 2. Clear ink fades everything out over 600ms.",
    "Without WebGL2 or renderable float textures, on software GPUs and under reduced motion, strokes stamp SVG blooms (feTurbulence + feDisplacementMap) that fade in without spreading over a static wash.",
  ],
};
