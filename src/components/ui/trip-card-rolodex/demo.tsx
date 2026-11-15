"use client";

import { BedDouble, Image as ImageIcon, MapPinned, Plane, UtensilsCrossed, Wallet } from "lucide-react";
import { BudgetCard, DiningCard, FlightCard, RouteCard, StaysCard, TripCardRolodex, TripCover, type TripCard } from "@/components/ui/trip-card-rolodex/trip-card-rolodex";

const cards: TripCard[] = [
  { id: "cover", icon: <ImageIcon />, title: "Autumn in the Vale", summary: "NOV 20 – 26", content: <TripCover /> },
  { id: "flight", icon: <Plane />, title: "Flight", summary: "AST → VLH · 11:50", content: <FlightCard /> },
  { id: "route", icon: <MapPinned />, title: "Route", summary: "4 stops · 3 transfers", content: <RouteCard /> },
  { id: "stays", icon: <BedDouble />, title: "Stays", summary: "6 nights · 4 places", content: <StaysCard /> },
  { id: "dining", icon: <UtensilsCrossed />, title: "Dining", summary: "4 tables · 1 waitlist", content: <DiningCard /> },
  { id: "budget", icon: <Wallet />, title: "Budget", summary: "$3,300 / $3,800", content: <BudgetCard /> },
];

export function Default() {
  return <TripCardRolodex cards={cards} label="Autumn trip" />;
}

export function Manual() {
  return <TripCardRolodex cards={cards.slice(1, 4)} defaultIndex={1} autoplay={false} wheel={false} cardHeight={300} label="Travel day" />;
}
