"use client";

import { useState } from "react";
import { StretchPillSlider } from "@/components/ui/stretch-pill-slider/stretch-pill-slider";

const days = (v: number) => `${v} ${v === 1 ? "day" : "days"}`;

export function Default() {
  const [value, setValue] = useState(2);
  return (
    <div className="w-full max-w-sm space-y-3">
      <div className="flex items-baseline justify-between">
        <span id="rental-label" className="text-sm font-medium text-foreground">Rental period</span>
        <span className="font-mono text-[13px] text-muted-foreground tabular-nums">${value * 38} total</span>
      </div>
      <StretchPillSlider aria-labelledby="rental-label" value={value} onValueChange={setValue} min={1} max={7} formatValue={days} />
    </div>
  );
}

export function Volume() {
  return (
    <div className="w-full max-w-sm">
      <StretchPillSlider aria-label="Volume" defaultValue={40} step={5} tone="accent" formatValue={(v) => `${v}%`} maxLabel="Max" />
    </div>
  );
}

export function Sizes() {
  return (
    <div className="w-full max-w-sm space-y-4">
      <StretchPillSlider aria-label="Seats, small" size="sm" defaultValue={3} min={1} max={12} formatValue={(v) => `${v} ${v === 1 ? "seat" : "seats"}`} />
      <StretchPillSlider aria-label="Seats, large" size="lg" defaultValue={8} min={1} max={12} formatValue={(v) => `${v} ${v === 1 ? "seat" : "seats"}`} />
    </div>
  );
}
