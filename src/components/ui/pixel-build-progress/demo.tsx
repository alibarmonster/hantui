"use client";

import { useState } from "react";
import { PixelBuildProgress } from "@/components/ui/pixel-build-progress/pixel-build-progress";

const toggle = "flex h-10 cursor-pointer items-center gap-2 text-sm text-foreground";

export function Default() {
  const [value, setValue] = useState(42);
  const [autoplay, setAutoplay] = useState(true);
  const [loop, setLoop] = useState(true);
  const [indeterminate, setIndeterminate] = useState(false);
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="w-full rounded-3xl bg-[linear-gradient(160deg,#ece9ff,#f7f1ff_45%,#e6eeff)] p-4 @container sm:p-8">
        <div className="rounded-2xl bg-white/85 px-4 py-7 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_16px_40px_-20px_rgb(60_40_120/0.35)] sm:px-8">
          <PixelBuildProgress value={value} autoplay={autoplay} loop={loop} indeterminate={indeterminate} stallAt={99} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
        <label className={toggle}>
          <input type="checkbox" checked={autoplay} onChange={(event) => setAutoplay(event.target.checked)} className="size-4 accent-foreground" />
          Autoplay
        </label>
        <label className={toggle}>
          <input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} className="size-4 accent-foreground" />
          Loop
        </label>
        <label className={toggle}>
          <input type="checkbox" checked={indeterminate} onChange={(event) => setIndeterminate(event.target.checked)} className="size-4 accent-foreground" />
          Indeterminate
        </label>
        <label className={toggle}>
          Value
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            disabled={autoplay || indeterminate}
            onChange={(event) => setValue(Number(event.target.value))}
            className="h-10 w-36 accent-foreground disabled:opacity-40"
          />
          <span className="w-9 font-mono text-[13px] text-muted-foreground tabular-nums">{value}%</span>
        </label>
      </div>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex w-full flex-col items-center gap-8">
      <PixelBuildProgress size="sm" value={64} />
      <PixelBuildProgress
        size="sm"
        value={30}
        messages={[
          { until: 50, text: "Pouring the foundation…" },
          { until: 100, text: "Raising the walls…" },
          { until: Infinity, text: "Keys are ready." },
        ]}
        palette={{ sky: ["#ffb38a", "#ffc9a3", "#ffe0c2"], brick: ["#6b7280", "#4b5563"], mortar: "#d1d5db", vest: "#22c55e" }}
      />
    </div>
  );
}
