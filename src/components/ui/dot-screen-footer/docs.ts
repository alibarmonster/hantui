import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { DotScreenFooter } from "@/components/ui/dot-screen-footer/dot-screen-footer";

export function SiteFooter() {
  return (
    <DotScreenFooter
      wordmark="Lumivo"
      brand="Lumivo Studio"
      meta="© 2026 · Port Aster"
      columns={[
        { title: "Studio", links: [{ label: "Work", href: "/work" }, { label: "Journal", href: "/journal" }] },
        { title: "Contact", links: [{ label: "hello@example.com", href: "mailto:hello@example.com" }] },
      ]}
      tone="ink"
      angle={15}
    />
  );
}`,
  a11y: [
    "Renders a footer landmark with one labelled nav per column. Brand, meta and links are real text.",
    "The wordmark is also in a visually hidden span; the canvas and the grain are hidden from assistive tech.",
    "Back to top is a button. It scrolls smoothly (instantly under reduced motion) and then moves focus to the main landmark, or the body when there is none.",
    "Every link and the button are at least 40px tall and show a focus ring in the ink color.",
    "The word stays readable without a pointer: pushing dots is decoration only.",
    "With reduced motion enabled the screen is static: no push, no shock ring and no animation loop.",
  ],
  notes: [
    "The word is set once on an offscreen mask, turned back by the screen angle, and downsampled so each cell's alpha is the share of it the letter covers. Cells under about 6% are skipped, and a round dot's radius is the square root of its coverage times the gap times 0.56, so tone stays even.",
    "Dots live in flat typed arrays and are filled in one path per color: warmth is quantized to 8 steps between ink and warm. The loop sleeps once every dot is home and nothing is pushing, pauses offscreen and in hidden tabs, and caps the pixel ratio at 2.",
    "The word is laid out again after resizes (debounced) and once document.fonts.ready resolves, so a late web font is picked up. gap is clamped to 4px or more.",
    "plates={2} adds a second screen at 75° in the warm color, slightly offset and at low opacity.",
    "Until the canvas has drawn, and for good where 2D canvas is unavailable, the word shows as plain text behind a CSS dot mask.",
    "tone picks one of four palettes (ink, paper, terracotta, cobalt) and palette overrides any of its colors. They are CSS variables, so the text always matches the dots. The mono text is small and uppercase by design; keep link labels short.",
  ],
};
