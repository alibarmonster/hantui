import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { FoilTicketReel } from "@/components/ui/foil-ticket-reel/foil-ticket-reel";

<FoilTicketReel
  tickets={[
    {
      id: "a1",
      title: "Encore",
      number: "A1",
      art: <MyIllustration />,
      meta: [
        { label: "Show", value: "Late Set" },
        { label: "Door", value: "21:00" },
        { label: "Seat", value: "9" },
      ],
    },
  ]}
  onTear={(ticket) => console.log("admitted", ticket.number)}
/>`,
  a11y: [
    "The reel is a carousel region; each ticket is a labelled slide (\"Ticket 3 of 7, Night Fair\"), and changes made by the user are announced politely (autoplay changes are not).",
    "Previous, next and pause buttons, Left/Right arrow keys inside the reel, horizontal swipes and horizontal wheel (trackpads, shift+wheel) all change tickets; vertical wheel keeps scrolling the page. Autoplay pauses on hover, on focus inside, offscreen and while a stub is being dragged.",
    "The stub is a button: Enter or Space tears it off, and Reset stub brings it back. Titles, numbers and meta rows are real DOM.",
    "Under reduced motion the foil and grain stay still, tickets crossfade, and tearing works without the drop.",
  ],
  notes: [
    "The stamp's perforated edge is a CSS mask: a grid of round holes filled back in everywhere but a thin border. The notches on the tear line are radial-gradient masks, and a torn edge swaps them for a zigzag (the same conic-gradient trick as Printed Receipt's torn bottom).",
    "The foil is two pastel band gradients (silver, yellow, blue, lilac) over the paper in multiply and soft-light. Their position follows the pointer's tilt (rotateX/Y up to ±10°) and a slow drift, like Foil Card Drift's shimmer; titles get a faint emboss.",
    "The film grain is one seeded noise tile, generated once and jumped to a new offset about 12 times a second; it pauses offscreen and in hidden tabs.",
    "The seven night-fair illustrations are original flat SVG in a limited palette; `art` also takes any node or an image URL. Barcodes are seeded from each ticket's id.",
  ],
};
