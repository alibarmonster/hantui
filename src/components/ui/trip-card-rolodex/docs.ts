import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { Plane, Wallet } from "lucide-react";
import { BudgetCard, FlightCard, TripCardRolodex, TripCover } from "@/components/ui/trip-card-rolodex/trip-card-rolodex";

const cards = [
  { id: "cover", icon: <Plane />, title: "Autumn in the Vale", summary: "NOV 20 – 26", content: <TripCover /> },
  { id: "flight", icon: <Plane />, title: "Flight", summary: "AST → VLH · 11:50", content: <FlightCard /> },
  { id: "budget", icon: <Wallet />, title: "Budget", summary: "$3,300 / $3,800", content: <BudgetCard /> },
];

export function Itinerary() {
  return <TripCardRolodex cards={cards} label="Autumn trip" />;
}`,
  a11y: [
    "The stack is a group with aria-roledescription=\"carousel\" and your label. Each card is a slide labelled with its position and title, such as \"2 of 6, Flight\".",
    "Collapsed rows are buttons. Arrow Down and Right roll to the next card, Arrow Up and Left roll back, from anywhere inside the stack.",
    "A polite live region announces the new slide only when the change came from the user, never from autoplay.",
    "Autoplay pauses while the pointer is over the stack or focus is inside it, and a pause button stops it altogether.",
    "With reduced motion enabled, nothing travels or blurs: the expanded card swaps with a fade and the rows update in place.",
  ],
  notes: [
    "At any moment the stack shows the next card as a row on top, the expanded card, and the previous card as a row below. Rolling moves each card down one slot: Motion layout animations resize and move the frames, while the content blurs on a separate inner layer so the frames stay crisp.",
    "The expanded card has a fixed height (cardHeight), so nothing around the stack shifts as it rolls. Size your content to fit it.",
    "The stack takes vertical swipes that start on it (touch-action: none with overscroll-behavior: contain). With wheel on, the mouse wheel rolls one card per gesture and the page does not scroll while the pointer is over the stack; turn it off for long pages.",
    "TripCover, FlightCard, RouteCard, StaysCard, DiningCard and BudgetCard are exported building blocks with fictional defaults. Their entrance animations (the plane along its arc, the route drawing on, bars growing) replay each time the card expands.",
    "The cover scenery is original SVG drawn in code: no photos and no image files.",
  ],
};
