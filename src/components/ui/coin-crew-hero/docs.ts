import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { CoinCrewHero } from "@/components/ui/coin-crew-hero/coin-crew-hero";

<CoinCrewHero
  title="Meet your new team"
  description="Eight small agents that file, follow up and tidy up."
  cta={{ label: "Hire the crew", href: "/signup" }}
  onPoke={(agent) => console.log("poked", agent.mood)}
/>`,
  a11y: [
    "The headline, description and call to action are the content. The coin parade is decorative and hidden from assistive tech.",
    "A visually hidden \"Poke a coin\" button (it appears when focused) pokes a coin, so keyboard users get the joke too.",
    "Under reduced motion the coins sit still on the diagonal, a poke only swaps the face, and dragging is off. The loop pauses offscreen and in hidden tabs.",
  ],
  notes: [
    "Each coin is a flat face disc over eight stacked rim layers offset down and to the right, so it reads as a thick disc; toward the top of the card the coins shrink, squash a little and show more rim, like a belt receding into the distance.",
    "One rAF loop places every coin on the diagonal belt, bobs and rolls it, blinks it at random and points its eyes at the pointer, writing transforms directly (no per-frame React renders). A coin that rolls off the top re-enters at the bottom as the next agent in the crew.",
    "A poke flips the coin through edge-on (scaleX follows a cosine) and swaps its face at the halfway point, then nudges its neighbors, which wobble on a damped spring. Dragging lifts a coin out of the line; on release it tumbles with gravity and spin, bounces off the card's edges and eases back into its moving slot.",
    "Faces are inline SVG with ten moods (happy, grin, wink, sleepy, squint, surprised, meh, sad, cool and shy). Without `agents`, the crew and its moods come from `seed` and `palette`.",
  ],
};
