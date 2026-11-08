"use client";

import { useState } from "react";
import { FoilTicketReel, type FoilTicket } from "@/components/ui/foil-ticket-reel/foil-ticket-reel";

export function NightFair() {
  const [admitted, setAdmitted] = useState<string[]>([]);
  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      <FoilTicketReel onTear={(t) => setAdmitted((a) => [...a, t.number])} />
      <p className="text-center text-[13px] text-muted-foreground">
        {admitted.length ? `Stubs torn: ${admitted.join(", ")}.` : "Drag a stub to the right to tear it off, or focus it and press Enter."}
      </p>
    </div>
  );
}

/** A tiny two-ticket set with custom art, to show the shape of `tickets`. */
const Dot = ({ fill }: { fill: string }) => (
  <svg viewBox="0 0 120 150" aria-hidden="true">
    <rect width="120" height="150" fill="#14173a" />
    <circle cx="60" cy="70" r="34" fill={fill} />
    <circle cx="60" cy="70" r="18" fill="#14173a" />
  </svg>
);

const ENCORE: FoilTicket[] = [
  { id: "encore-a", title: "Encore", number: "A1", art: <Dot fill="#8f80ff" />, accent: "#8f80ff", meta: [{ label: "Show", value: "Late Set" }, { label: "Door", value: "21:00" }, { label: "Row", value: "C" }, { label: "Seat", value: "9" }] },
  { id: "encore-b", title: "Encore", number: "B2", art: <Dot fill="#7fe0b8" />, accent: "#7fe0b8", meta: [{ label: "Show", value: "Early Set" }, { label: "Door", value: "18:30" }, { label: "Row", value: "F" }, { label: "Seat", value: "22" }] },
];

export function Encore() {
  return <FoilTicketReel tickets={ENCORE} autoplay={false} label="Encore tickets" className="max-w-2xl" />;
}
