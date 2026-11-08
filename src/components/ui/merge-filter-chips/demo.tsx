"use client";

import { useState } from "react";
import { MergeFilterChips, type MergeFilterOption } from "@/components/ui/merge-filter-chips/merge-filter-chips";

const SPORTS: MergeFilterOption[] = [
  { value: "cycling", label: "Cycling" },
  { value: "tennis", label: "Tennis" },
  { value: "running", label: "Running" },
  { value: "climbing", label: "Climbing" },
  { value: "swimming", label: "Swimming" },
  { value: "rowing", label: "Rowing" },
];

/** A made-up catalog: each sport keeps this share of whatever is left, like stacking filters. */
const SHARE: Record<string, number> = { cycling: 0.71, tennis: 0.65, running: 0.58, climbing: 0.42, swimming: 0.54, rowing: 0.33 };
const countFor = (selected: string[]) => Math.max(1, Math.round(selected.reduce((n, v) => n * (SHARE[v] ?? 1), 24)));

export function Sports() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="w-full max-w-xl space-y-4">
      <MergeFilterChips options={SPORTS} value={selected} onValueChange={setSelected} getCount={countFor} label="Filter by sport" />
      <p className="text-[13px] text-muted-foreground">{selected.length ? `Showing clubs for ${selected.length} ${selected.length === 1 ? "sport" : "sports"}.` : "Pick a sport to narrow the list."}</p>
    </div>
  );
}

const SESSIONS: MergeFilterOption[] = [
  { value: "morning", label: "Morning", count: 14 },
  { value: "lunch", label: "Lunch break", count: 6 },
  { value: "evening", label: "Evening", count: 19 },
  { value: "weekend", label: "Weekend", count: 23 },
  { value: "online", label: "Online", count: 9 },
];

export function Counted() {
  return <MergeFilterChips options={SESSIONS} defaultValue={["evening"]} unit="sessions" label="Filter sessions by time" className="max-w-xl" />;
}

export function LimitTwo() {
  return <MergeFilterChips options={SPORTS} defaultValue={["tennis"]} getCount={countFor} max={2} unit="clubs" label="Pick up to two sports" className="max-w-md" />;
}
