import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { BurstPackOpening, type BurstPack } from "@/components/ui/burst-pack-opening/burst-pack-opening";

const packs: BurstPack[] = [
  {
    id: "cobalt",
    label: "Cobalt",
    color: "#1d4ed8",
    cards: [
      { id: "c1", name: "Bounder", stat: "Bounce 7", art: <BounderArt />, ground: "#ffd9c2" },
      { id: "c2", name: "Halo Nine", stat: "Orbit 9", art: "/cards/halo-nine.webp", rarity: "holo" },
    ],
  },
];

export function Packs() {
  return <BurstPackOpening packs={packs} onOpen={(pack, cards) => save(pack.id, cards)} />;
}`,
  a11y: [
    "The pack is a button named \"Open pack: Cobalt series\". Enter, Space or a click tears it open; dragging along the top edge is an extra, not a requirement.",
    "A polite live region announces the reveal once: \"5 cards revealed: …\" with the card names in landing order.",
    "Each card is a button. It opens a dialog that traps focus, is titled with the card's name, closes with Escape or its Close button and returns focus to the card.",
    "The card's back (name, stat, description and rarity) is real text, and a Flip card button turns it from the keyboard.",
    "When the next pack drops in, focus moves to it.",
    "With reduced motion enabled there are no rays, confetti or flight: the pack crossfades into the row and the enlarged card swaps faces without turning.",
  ],
  notes: [
    "Drag from either top corner to tear: the strip peels with the pointer and finishes by itself past halfway. A click or key press runs the same tear in half a second.",
    "The pack and the cards are DOM with CSS 3D, driven by Motion values. Rays and confetti are one low-res canvas between them, drawn at 4 screen pixels per pixel with smoothing off; its loop runs only while the burst is on screen.",
    "Card order, landing angles and confetti come from seed, the pack and how many packs have been opened, so server and client agree and a pack that comes around again deals a new order.",
    "Cards with rarity \"holo\" get the foil from Foil Card Drift, here following the pointer. Hover lifts and tilts a card up to 8°.",
    "art can be a React node (SVG scales cleanly) or an image URL. All demo art is original SVG drawn in code.",
    "In narrow containers the five cards wrap into two rows. The stage has a fixed height of 400px.",
  ],
};
