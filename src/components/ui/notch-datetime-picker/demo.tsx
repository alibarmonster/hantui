"use client";

import { useState } from "react";
import { NotchDateTimePicker, type TimeSlot } from "@/components/ui/notch-datetime-picker/notch-datetime-picker";
import { cn } from "@/lib/utils";

/** A small seeded hash, so the demo's unavailable slots are the same on the server and the client. */
function seeded(day: number, slot: number) {
  let h = (day * 374761393 + slot * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Demo availability: no Sundays, nothing on the 14th, and about a third of each day already booked. */
function bookingSlots(date: Date): TimeSlot[] {
  if (date.getDay() === 0 || date.getDate() === 14) return [];
  const slots: TimeSlot[] = [];
  for (let minutes = 9 * 60; minutes <= 17 * 60 + 30; minutes += 30) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    slots.push({ time, available: time === "15:30" || seeded(date.getDate() + date.getMonth() * 31, minutes) > 0.34 });
  }
  return slots;
}

export function Default() {
  const [value, setValue] = useState(new Date(2026, 10, 11, 15, 30));
  const [hourCycle, setHourCycle] = useState<"h12" | "h23">("h12");
  return (
    <div className="flex min-h-[440px] w-full flex-col items-center gap-5">
      <div role="radiogroup" aria-label="Clock" className="inline-flex rounded-full border border-border bg-surface p-1">
        {(["h12", "h23"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === hourCycle}
            onClick={() => setHourCycle(option)}
            className={cn(
              "h-8 cursor-pointer rounded-full px-3.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              option === hourCycle ? "bg-foreground text-background" : "text-foreground/65 hover:text-foreground",
            )}
          >
            {option === "h12" ? "12-hour" : "24-hour"}
          </button>
        ))}
      </div>
      <div className="w-full max-w-[420px]">
        <p className="mb-2 text-sm font-medium text-foreground">Book a studio visit</p>
        <NotchDateTimePicker value={value} onValueChange={setValue} getSlots={bookingSlots} hourCycle={hourCycle} min={new Date(2026, 9, 1)} max={new Date(2027, 1, 28)} />
        <p className="mt-3 text-[13px] text-muted-foreground">Sundays and 14 November have no slots. Some times are already taken.</p>
      </div>
    </div>
  );
}

export function Empty() {
  return (
    <div className="flex min-h-[420px] w-full max-w-[420px] flex-col">
      <NotchDateTimePicker step={60} startTime="10:00" endTime="18:00" locale="en-GB" hourCycle="h23" weekStartsOn={0} />
    </div>
  );
}
