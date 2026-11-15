import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { TickerHeader } from "@/components/ui/ticker-header/ticker-header";

<TickerHeader brand={<Logo />} items={items} actions={actions} announcements={["Version 4 is out", "Join the live workshop"]} />`,
  a11y: [
    "The strip pauses on hover and while it holds focus, and has a dismiss button.",
    "Under reduced motion it shows the first message, still.",
    "Repeated copies of the messages are hidden from screen readers.",
  ],
  notes: [
    "The strip scrolls away with the page and the nav stays pinned: the header sticks 32px above the top, so nothing changes size and the page never moves under the reader. Only the dismiss button folds the strip away. Pass `scrollContainer` for a scrolling panel.",
    "Once the strip has scrolled out of view it stops moving and drops out of the tab order.",
    "`duration` sets the seconds per loop.",
  ],
};
