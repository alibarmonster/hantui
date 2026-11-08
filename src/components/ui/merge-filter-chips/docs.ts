import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { MergeFilterChips } from "@/components/ui/merge-filter-chips/merge-filter-chips";

const [sports, setSports] = useState<string[]>([]);

<MergeFilterChips
  options={[
    { value: "cycling", label: "Cycling" },
    { value: "tennis", label: "Tennis" },
  ]}
  value={sports}
  onValueChange={setSports}
  getCount={(selected) => search(selected).length}
/>`,
  a11y: [
    "The row is a group with an accessible name (`label`). Each chip is a toggle button with aria-pressed; a selected chip becomes a button in the pill named \"Remove Cycling\". Focus follows a chip into and out of the pill.",
    "Arrow keys move between chips and pill labels, Home and End jump to the ends, and the row scrolls to keep the focused chip in view.",
    "The count is announced in a polite live region (\"17 results\"); the rolling digits themselves are hidden from screen readers so it is read once.",
    "Under reduced motion there is no goo, wipe or wobble: chips move instantly and the count swaps.",
  ],
  notes: [
    "The row is drawn twice from the same layout: a layer of plain dark shapes (the pill and each moving chip's body) under an SVG goo filter (blur plus an alpha threshold, sharper on dense screens), and an unfiltered layer of text and buttons on top. Both follow the same Motion layout springs, so the neck between a chip and the pill forms in the shapes while the labels stay crisp.",
    "A joining chip's white face is peeled off from its leading edge with clip-path as it travels; a leaving chip's dark body is peeled off from the other side as it lands at the front of the row. The hover wobble is a short feTurbulence + feDisplacementMap pulse on the chip's outline only.",
    "The count comes from `getCount(selected)`; without it, nothing selected shows `total` (or the sum of every option's `count`) and a selection shows the sum of its options' counts. Digits roll with Rolling Digits.",
  ],
};
