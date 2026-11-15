import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { NotchDateTimePicker } from "@/components/ui/notch-datetime-picker/notch-datetime-picker";

export function Booking() {
  const [when, setWhen] = useState(new Date(2026, 10, 11, 15, 30));
  return (
    <NotchDateTimePicker
      value={when}
      onValueChange={setWhen}
      getSlots={(date) => (date.getDay() === 0 ? [] : [{ time: "09:00", available: true }, { time: "09:30", available: false }])}
    />
  );
}`,
  a11y: [
    "Both pills are buttons with aria-haspopup=\"dialog\" and aria-expanded, labelled with the full value, such as \"Date: Wednesday, 11 November 2026\".",
    "The popover is a non-modal dialog. Opening moves focus into it, Tab and Shift+Tab stay within the pills and the popover, and Escape closes and returns focus to the pill.",
    "The calendar is a grid with one tab stop: arrow keys move by day and week, PageUp and PageDown change month, Home and End jump to the start or end of the week, and Enter picks.",
    "The time slots are a grid with one tab stop: arrow keys move between slots and skip the ones that cannot be picked. Unavailable days and slots are marked aria-disabled.",
    "In time mode the arrows step one available day at a time and say so in their labels; the weekday button returns to the calendar.",
    "With reduced motion enabled there is no goo, morph or blur: labels and views swap with a fade.",
  ],
  notes: [
    "Closed, the two pills overlap into one dark bar. Open, they move apart and an SVG goo filter on a text-free copy of the shapes draws the neck between them and the stem down to the popover, so the letters stay crisp.",
    "Picking a day switches to the time slots and keeps the chosen time; picking a time closes the popover. onValueChange fires once both a day and a time are known.",
    "Days with no available slot (or rejected by isDateUnavailable, min or max) cannot be picked and are skipped by the day arrows.",
    "Labels come from Intl.DateTimeFormat with the locale you pass, in day-month order. The locale, hour cycle and first weekday are props with fixed defaults, not read from the browser, so server and client render the same text.",
    "Dates are handled in local time. Build values with new Date(year, monthIndex, day, hour, minute) to avoid time-zone shifts.",
    "Below 480px of viewport width the popover becomes a bottom sheet over a dimmed backdrop, the stem is hidden and slot cells are 44px tall.",
  ],
};
