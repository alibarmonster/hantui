import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { InkWalkerCard } from "@/components/ui/ink-walker-card/ink-walker-card";

export function EmptyOrders() {
  return (
    <InkWalkerCard
      figure="courier"
      prop="mailbox"
      title="Nothing here yet"
      description="New orders will show up on this street."
    />
  );
}`,
  a11y: [
    "The drawing is an image with a label that names the figure and the prop. The title and description are real text above it.",
    "The figure is a button (\"Say hi to the courier\") that travels with it, so its reaction works from the keyboard; the prop is a second button (\"Light the lamp\"). Both show a focus ring in the ink color.",
    "Nothing in the strip is needed to understand the card: it is decoration with two optional pokes.",
    "With reduced motion enabled the figure stands still. Pressing it swaps to the reaction pose for a moment, and the lamp switches on or off without a flicker.",
  ],
  notes: [
    "Everything is SVG built by a small toolkit in src/lib/line-art: one wobble filter on the drawing, limbs drawn as two open strokes around a curve, ink as currentColor over paper-colored fills.",
    "The walk is solved, not keyframed: planted toes stay put, the heel lifts over the last part of each step, the swinging foot follows a minimum-jerk curve with a low lift, the hip's height comes from the planted leg and knees use two-bone IK. The jogger adds a flight phase; the cyclist's wheels roll without slipping and the cranks turn.",
    "Scarves and bags are pendulums, and pointer speed over the strip is wind. Hovering slows the figure to about a third of its pace.",
    "The strip's height follows the card's width, and strokes use vector-effect: non-scaling-stroke, so the pen stays the same width at every size.",
    "tone=\"auto\" follows the page's dark mode through two CSS variables (--la-ink and --la-paper); night inverts to pale ink on indigo.",
    "One animation frame loop per card, paused offscreen and in hidden tabs. The line style and motion rules learn from line-art-animation by JDhruv14 (MIT); the code and scenes here are our own.",
  ],
};
