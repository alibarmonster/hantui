import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { LineArtStreet } from "@/components/ui/line-art-street/line-art-street";

export function Hero() {
  return (
    <LineArtStreet dayLength={90}>
      <h1 className="text-2xl font-semibold">Good morning, neighbor.</h1>
    </LineArtStreet>
  );
}`,
  a11y: [
    "The scene is an image with a label that describes the street. Nothing in it is needed to use the page.",
    "Two real controls sit under it: a Pause button and a \"Time of day\" slider whose value text reads as words, such as \"Dusk\" or \"Night\".",
    "Clicking people, windows, birds and the sun are pointer extras on top of that; the slider does the same job as dragging the sun.",
    "Ink and paper invert together at night, so line contrast holds through the whole day.",
    "With reduced motion enabled the scene is a still daytime drawing with one figure mid-stride, the Pause button is hidden, and the slider still changes day and night at once.",
  ],
  notes: [
    "One SVG, built with the toolkit in src/lib/line-art. The wobble filter sits on the drawing group only; the gradient sky, the stars and the warm glows (on a mix-blend-mode: screen layer) stay outside it.",
    "One animation frame loop with seeded schedules writes attributes directly: no React state per frame. It pauses offscreen and in hidden tabs.",
    "The day runs from dawn to nightfall in dayLength seconds and keeps going through the night. tau pins the time (0 is midnight, 0.5 is noon) and disables the slider and the sun drag.",
    "Pointer speed is wind on the awning fringe, the hanging sign, the flower stall's ribbons and the commuter's scarf. Clicking a person plays a reaction, clicking a window toggles its light, and the birds fly off when approached and come back.",
    "The bicycle's wheels roll without slipping and its cranks turn; walkers use the solved gait, so feet do not slide. In containers under 520px the street crops to its center and the cyclist and the child stay home.",
    "Signboards use fictional names. The line style and motion rules learn from line-art-animation by JDhruv14 (MIT); the scene, figures and code are our own.",
  ],
};
