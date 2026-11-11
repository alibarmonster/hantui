import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { StretchPillSlider } from "@/components/ui/stretch-pill-slider/stretch-pill-slider";

export function RentalDays() {
  const [days, setDays] = useState(2);
  return (
    <StretchPillSlider
      aria-label="Rental period"
      value={days}
      onValueChange={setDays}
      min={1}
      max={7}
      formatValue={(v) => \`\${v} \${v === 1 ? "day" : "days"}\`}
    />
  );
}`,
  a11y: [
    "The pill has role=\"slider\" with aria-valuenow, aria-valuemin, aria-valuemax and an aria-valuetext built from formatValue, such as \"3 days\".",
    "Arrow keys move one step, PageUp and PageDown move about a tenth of the range, and Home and End jump to the ends.",
    "Give it a name with aria-label or aria-labelledby.",
    "Focus draws a ring around the pill itself, and pressing the track moves focus to the pill so the keyboard picks up where the pointer left off.",
    "The track uses touch-action: pan-y, so a vertical swipe that starts on the slider still scrolls the page.",
    "With reduced motion enabled, the pill jumps to each value, digits swap instantly and the max label fades without a blur.",
  ],
  notes: [
    "The pill never gets narrower than its own label, so the lowest value still reads in full. The max label fades out as the pill's edge reaches it.",
    "The first number in formatValue's result rolls with Rolling Digits. The rest, such as the unit, stands still, so pluralize it in formatValue.",
    "The pill is a clip-path over a full-width layer and the grip is translated with it, so dragging never animates layout. Its shadow and focus ring are drop-shadow filters, which follow the clipped shape.",
    "Past either end the pill stretches up to 8px with a rubber band and springs back on release.",
    "Pass name to render a hidden input for forms.",
  ],
};
