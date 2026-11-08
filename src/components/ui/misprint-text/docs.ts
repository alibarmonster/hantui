import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { MisprintText, type MisprintTextHandle } from "@/components/ui/misprint-text/misprint-text";

const press = useRef<MisprintTextHandle>(null);

<MisprintText ref={press} text={paragraph} seed="keeper" className="text-2xl font-semibold" />
<button onClick={() => press.current?.replay()}>Reprint</button>`,
  a11y: [
    "The words are the real text: selectable, copyable and read once by screen readers. Every effect (plates, pieces, stickers, debris and the torn-band copy) is an aria-hidden layer.",
    "Under reduced motion the paragraph shows fully printed with no glitches, and replay() does nothing. Without JavaScript the text is simply visible.",
    "The print starts when the paragraph first scrolls into view, pauses offscreen and in hidden tabs, and idle glitches can be turned off with idleGlitch={false}.",
  ],
  notes: [
    "The print runs on one stepped rAF loop at 24 ticks per second, like a press rather than a smooth tween. Words land one to three ticks apart, with longer pauses after commas and sentence ends.",
    "Each word arrives one way: it shatters into three to eight flat-colored pieces cut with jagged clip-path polygons that fly in and settle, it gets one or two offset colored duplicates that snap on, or (a `stickers` share of words) it lands as a stack of one to three skewed labels with a thick outline, a hard shadow and the word knocked out in white, which jitter for a few ticks and peel away. Cyan, magenta and yellow plates (mix-blend-mode multiply, or screen on dark) close onto every word; some words slip sideways in four strips; halftone dots and ink slivers fade around fresh words.",
    "Band tears cut a horizontal band out of the paragraph with an even-odd clip-path hole and show it, shifted and sometimes split into plates, from an aria-hidden copy of the text, so nothing is drawn twice.",
    "Everything is seeded (`seed`): the same seed gives the same arrivals, stickers, tears and idle glitches. replay() scatters the words with a few flashing stickers, lets most dissolve while a handful of strays linger, then prints again from the start.",
  ],
};
