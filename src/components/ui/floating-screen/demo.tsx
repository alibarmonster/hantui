"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { HtmlCanvasDemo } from "@/components/site/html-canvas-demo";
import { FloatingScreen } from "@/components/ui/floating-screen/floating-screen";

const TABS = ["Revenue", "Users", "Errors"] as const;
const DATA: Record<(typeof TABS)[number], { value: string; delta: string; bars: number[] }> = {
  Revenue: { value: "$48.2K", delta: "▲ 12%", bars: [38, 52, 44, 61, 58, 72, 80] },
  Users: { value: "9,418", delta: "▲ 4%", bars: [60, 62, 58, 66, 70, 69, 74] },
  Errors: { value: "23", delta: "▼ 31%", bars: [70, 64, 52, 40, 36, 30, 22] },
};

function Dashboard() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Revenue");
  const [range, setRange] = useState("7d");
  const d = DATA[tab];
  return (
    <div className="flex size-full flex-col bg-background p-4 text-foreground">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold">Northwind</p>
        <div className="flex gap-1 text-[11px]">
          {["7d", "30d"].map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)} className={`h-6 cursor-pointer rounded-md px-2 ${range === r ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div role="tablist" className="mt-3 flex gap-1">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={t === tab} onClick={() => setTab(t)} className={`h-7 cursor-pointer rounded-full px-3 text-[12px] font-medium ${t === tab ? "bg-primary text-white" : "bg-surface-2 text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">
        {d.value} <span className="text-[12px] font-medium text-muted-foreground">{d.delta} · {range}</span>
      </p>
      <div className="mt-auto flex h-24 items-end gap-2">
        {d.bars.map((v, i) => (
          <div key={i} className="flex-1 rounded-t-md bg-primary/80" style={{ height: `${v}%` }} />
        ))}
      </div>
    </div>
  );
}

/** The laptop needs about 32rem; below that (a phone), the demo shows the phone instead of cropping it. */
function useFitsLaptop(ref: RefObject<HTMLElement | null>) {
  const [fits, setFits] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setFits(entry.contentRect.width >= 512));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return fits;
}

export function Laptop() {
  const ref = useRef<HTMLDivElement>(null);
  const fits = useFitsLaptop(ref);
  return (
    <div ref={ref} className="w-full">
      <HtmlCanvasDemo>
        {({ rendering, onModeChange }) => (
          <FloatingScreen key={fits ? "laptop" : "phone"} device={fits ? "laptop" : "phone"} rendering={rendering} onModeChange={onModeChange}>
            <Dashboard />
          </FloatingScreen>
        )}
      </HtmlCanvasDemo>
    </div>
  );
}

export function Phone() {
  const [count, setCount] = useState(3);
  return (
    <HtmlCanvasDemo>
      {({ rendering, onModeChange }) => (
        <FloatingScreen device="phone" tilt={14} rendering={rendering} onModeChange={onModeChange}>
          <div className="flex size-full flex-col items-center justify-center gap-3 bg-[linear-gradient(160deg,#eef2ff,#fdf2f8)] p-5 text-center">
            <p className="text-[12px] font-medium text-muted-foreground">Cart</p>
            <p className="text-4xl font-semibold text-foreground tabular-nums">{count}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCount((c) => Math.max(0, c - 1))} className="h-10 w-12 cursor-pointer rounded-full border border-border bg-background text-lg">
                −
              </button>
              <button type="button" onClick={() => setCount((c) => c + 1)} className="h-10 w-12 cursor-pointer rounded-full bg-foreground text-lg text-background">
                +
              </button>
            </div>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-[12px] font-medium text-link underline underline-offset-4">
              Checkout
            </a>
          </div>
        </FloatingScreen>
      )}
    </HtmlCanvasDemo>
  );
}
