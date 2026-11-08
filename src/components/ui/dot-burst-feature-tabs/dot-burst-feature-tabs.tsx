"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion } from "motion/react";
import { Coffee, Pause, Play, ShieldCheck, Sun, Users, Wallet, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { cssColorToRgb, mixOklch, type Vec3 } from "@/lib/color";
import { runCanvasLoop } from "@/lib/glyph/canvas-loop";
import { createRandom } from "@/lib/random";

export interface DotBurstFeature {
  /** Stable id, reported by `onActiveChange`. */
  id: string;
  /** Title in the list. */
  title: string;
  /** One line shown when the item is open. */
  description: string;
  /** Saturated stage color for this feature (any CSS color). */
  color: string;
  /** Product card shown in the middle of the stage, as real DOM. `FeatureNote` builds one. */
  card: ReactNode;
}

export interface DotBurstFeatureTabsProps extends Omit<ComponentProps<"section">, "children"> {
  /** Heading above the list. @default "Everything moves while you're away." */
  heading?: ReactNode;
  /** The features. @default six fictional money features */
  items?: DotBurstFeature[];
  /** Seconds each feature stays open while autoplaying. @default 4.5 */
  interval?: number;
  /** Open the next feature when the bar fills. Stops for good once someone picks an item. @default true */
  autoplay?: boolean;
  /** How many dot clusters gather at the edges, 0–1. @default 0.5 */
  dotDensity?: number;
  /** Called with the id of the feature that opens. */
  onActiveChange?: (id: string) => void;
}

export interface FeatureNoteProps {
  /** Icon in the colored tile, top left. */
  icon?: ReactNode;
  /** App name above the title. @default "Nimbra" */
  app?: string;
  /** Time on the right of the app name. @default "now" */
  time?: string;
  /** Bold first line. */
  title: ReactNode;
  /** Second line. */
  body?: ReactNode;
  /** Highlighted amount or status; pops in a beat after the card. */
  chip?: ReactNode;
  /** Tint of the icon tile and chip. @default "#16a34a" */
  accent?: string;
  /** Extra content under the body, such as a progress bar or avatars. */
  children?: ReactNode;
}

/**
 * A white notification card for a Dot Burst Feature Tabs stage. Its chip pops in a beat after the
 * card arrives.
 */
export function FeatureNote({ icon, app = "Nimbra", time = "now", title, body, chip, accent = "#16a34a", children }: FeatureNoteProps) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="w-[min(84%,20rem)] rounded-2xl bg-white p-4 text-left text-[#1c1917] shadow-[0_18px_40px_-12px_rgb(0_0_0/0.35)]">
      <div className="flex items-center gap-2 text-[12px] text-[#6b635d]">
        <span className="grid size-6 place-items-center rounded-md text-white [&_svg]:size-3.5" style={{ background: accent }} aria-hidden="true">
          {icon}
        </span>
        <span className="font-semibold text-[#1c1917]">{app}</span>
        <span className="ml-auto tabular-nums">{time}</span>
      </div>
      <p className="mt-2.5 text-[15px] leading-snug font-semibold">{title}</p>
      {body ? <p className="mt-0.5 text-[13px] leading-snug text-[#57534e]">{body}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
      {chip ? (
        <motion.span
          initial={reduceMotion ? false : { opacity: 0, scale: 0.7, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.24 }}
          className="mt-3 inline-flex h-7 origin-left items-center rounded-full px-2.5 text-[12.5px] font-semibold tabular-nums"
          style={{ background: `color-mix(in oklab, ${accent} 14%, white)`, color: `color-mix(in oklab, ${accent} 78%, black)` }}
        >
          {chip}
        </motion.span>
      ) : null}
    </div>
  );
}

/** A thin goal bar for cards; fills on arrival. */
export function NoteMeter({ value, accent = "#16a34a", label }: { value: number; accent?: string; label?: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <div>
      {label ? <div className="mb-1.5 flex justify-between text-[12px] text-[#57534e] tabular-nums">{label}</div> : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-[#ece9e5]" role="img" aria-label={`${Math.round(value * 100)}%`}>
        <motion.div
          className="h-full origin-left rounded-full"
          style={{ background: accent }}
          initial={reduceMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: Math.max(0, Math.min(1, value)) }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

const DEFAULT_ITEMS: DotBurstFeature[] = [
  {
    id: "salary",
    title: "Pay yourself first",
    description: "A slice of every paycheck moves to savings the minute it lands.",
    color: "#f2542d",
    card: <FeatureNote icon={<Wallet />} title="Salary landed" body="$3,200.00 from Corvane Studio" chip="+$320.00 to Savings" />,
  },
  {
    id: "roundup",
    title: "Round up the change",
    description: "Card purchases round up to the next dollar, and the difference is saved.",
    color: "#7357ff",
    card: <FeatureNote icon={<Coffee />} title="Flat white, Driftwell Café" body="$4.60 rounded up to $5.00" chip="+$0.40" accent="#7357ff" time="8:12" />,
  },
  {
    id: "overnight",
    title: "Earn while you sleep",
    description: "Idle cash earns interest overnight, paid out every morning.",
    color: "#0e9f9a",
    card: <FeatureNote icon={<Sun />} title="Good morning" body="Your balance worked the night shift." chip="+$1.84 earned while you slept" accent="#0e9f9a" time="6:00" />,
  },
  {
    id: "safe",
    title: "Know what's safe to spend",
    description: "Bills and goals come off the top, so the number you see is yours.",
    color: "#2f6bff",
    card: (
      <FeatureNote icon={<ShieldCheck />} title="$412.00 safe to spend" body="Through Sunday, after rent and bills" accent="#2f6bff" time="Mon">
        <NoteMeter value={0.62} accent="#2f6bff" label={<><span>Spent $252</span><span>of $664</span></>} />
      </FeatureNote>
    ),
  },
  {
    id: "pot",
    title: "Save together",
    description: "Shared pots for trips and gifts, with everyone's progress in one place.",
    color: "#e0407b",
    card: (
      <FeatureNote icon={<Users />} title="Coast trip pot" body="Mira added $40.00" accent="#e0407b" time="2m">
        <div className="mb-3 flex -space-x-1.5" aria-label="Mira, Tomas and Ana">
          {["MI", "TO", "AN"].map((i, n) => (
            <span key={i} className="grid size-7 place-items-center rounded-full border-2 border-white text-[10.5px] font-bold text-white" style={{ background: ["#e0407b", "#7357ff", "#0e9f9a"][n] }}>
              {i}
            </span>
          ))}
        </div>
        <NoteMeter value={860 / 1200} accent="#e0407b" label={<><span>$860.00 saved</span><span>Goal $1,200</span></>} />
      </FeatureNote>
    ),
  },
  {
    id: "instant",
    title: "Move money instantly",
    description: "Transfers between friends land in seconds, any day of the week.",
    color: "#16a34a",
    card: <FeatureNote icon={<Zap />} title="Sent $50.00 to Rafi" body="Dinner, split three ways" chip="Arrived in 4s" time="Sun" />,
  },
];

interface Dot {
  x: number;
  y: number;
  size: number;
  tint: boolean;
  delay: number;
  twinkle: number;
  vx: number;
  vy: number;
}

/**
 * Seeded dot clusters for one feature: clumps of 2–4px square dots on a grid, gathered along the
 * edges and in the corners, never in the middle of the stage.
 */
function layoutDots(seed: string, size: number, density: number): Dot[] {
  const r = createRandom(seed);
  const pitch = Math.max(6, size / 60);
  const cells = Math.floor(size / pitch);
  const clusters = Math.round(5 + density * 9);
  const dots: Dot[] = [];
  const taken = new Set<number>();
  for (let c = 0; c < clusters; c++) {
    // Along an edge, or tucked into a corner.
    const corner = r.chance(0.35);
    const along = corner ? r.pick([0.06, 0.94]) : r.range(0.08, 0.92);
    const depth = r.range(0.02, 0.17);
    const side = r.int(0, 3);
    let [cx, cy] = side === 0 ? [along, depth] : side === 1 ? [1 - depth, along] : side === 2 ? [along, 1 - depth] : [depth, along];
    if (corner) [cx, cy] = [cx < 0.5 ? r.range(0.02, 0.12) : r.range(0.88, 0.98), cy < 0.5 ? r.range(0.02, 0.12) : r.range(0.88, 0.98)];
    const radius = r.range(3.2, 8) * (0.75 + density * 0.6);
    const gx = Math.round(cx * cells);
    const gy = Math.round(cy * cells);
    const reach = Math.ceil(radius);
    for (let y = gy - reach; y <= gy + reach; y++) {
      for (let x = gx - reach; x <= gx + reach; x++) {
        if (x < 0 || y < 0 || x >= cells || y >= cells) continue;
        const d = Math.hypot(x - gx, y - gy) / radius;
        // A soft, lumpy falloff makes clumps rather than discs.
        if (d > 1 || r.next() > (1 - d) ** 1.1 * 0.95) continue;
        const u = (x + 0.5) / cells;
        const v = (y + 0.5) / cells;
        if (Math.abs(u - 0.5) < 0.3 && Math.abs(v - 0.5) < 0.3) continue;
        const key = y * cells + x;
        if (taken.has(key)) continue;
        taken.add(key);
        dots.push({
          x: (x + 0.5) * pitch,
          y: (y + 0.5) * pitch,
          size: d < 0.35 ? 4 : d < 0.7 ? 3 : 2,
          tint: r.chance(0.28),
          delay: c * 0.055 + d * 0.12,
          twinkle: r.chance(0.07) ? r.range(0, Math.PI * 2) : -1,
          vx: 0,
          vy: 0,
        });
      }
    }
  }
  return dots;
}

const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

/**
 * A feature section with an autoplaying vertical list on the left and a square color stage on the
 * right. Each feature has its own saturated color, a seeded burst of dot clusters along the stage's
 * edges and a small product card in the middle. The open item's bar fills over `interval` in the
 * feature's color, then the next one opens; changing features tweens the stage color in OKLCH,
 * scatters the old dots, grows the new ones cluster by cluster and blurs the card across.
 *
 * Tabs semantics with arrow keys; a visible pause/play button; autoplay pauses on hover, on focus
 * inside, offscreen and in hidden tabs, and stops for good once someone picks an item. The stage
 * moves above the list on narrow containers, where a swipe changes features. Dots are drawn on one
 * canvas (paused offscreen, still under reduced motion, which also turns off autoplay).
 */
export function DotBurstFeatureTabs({
  heading = (
    <>
      Everything moves
      <br />
      while you&apos;re away.
    </>
  ),
  items = DEFAULT_ITEMS,
  interval = 4.5,
  autoplay = true,
  dotDensity = 0.5,
  onActiveChange,
  className,
  ...props
}: DotBurstFeatureTabsProps) {
  const id = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const active = items[Math.min(index, items.length - 1)];
  const progress = useMotionValue(0);
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pause = useRef({ hover: false, focus: false, inView: true });
  const live = useRef({ index, items, onActiveChange, dotDensity });
  useEffect(() => {
    live.current = { index, items, onActiveChange, dotDensity };
  });

  const go = (next: number, fromUser: boolean) => {
    const i = ((next % items.length) + items.length) % items.length;
    progress.set(0);
    setIndex(i);
    if (fromUser) setPlaying(false);
    onActiveChange?.(items[i].id);
  };

  // The autoplay timer: one rAF loop that fills the open item's bar, then opens the next item.
  const autoplaying = playing && !reduceMotion && items.length > 1;
  useEffect(() => {
    if (!autoplaying) return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      const p = pause.current;
      if (!p.hover && !p.focus && p.inView && !document.hidden) {
        const next = progress.get() + dt / Math.max(0.5, interval);
        if (next >= 1) {
          const { index: i, items: list, onActiveChange: cb } = live.current;
          const n = (i + 1) % list.length;
          progress.set(0);
          setIndex(n);
          cb?.(list[n].id);
        } else progress.set(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoplaying, interval, progress]);

  // Stage color: tween in OKLCH so the midpoints stay saturated.
  const colorRef = useRef<{ from: Vec3; to: Vec3; start: number } | null>(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const to = cssColorToRgb(active.color, stage);
    const prev = colorRef.current;
    const current = prev ? mixOklch(prev.from, prev.to, ease((performance.now() - prev.start) / 500)) : to;
    colorRef.current = { from: reduceMotion ? to : current, to, start: performance.now() };
    let raf = 0;
    const paint = () => {
      const c = colorRef.current!;
      const t = ease((performance.now() - c.start) / 500);
      stage.style.backgroundColor = `rgb(${mixOklch(c.from, c.to, t).join(",")})`;
      if (t < 1) raf = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(raf);
  }, [active.color, reduceMotion]);

  // Dots: one canvas, seeded clusters per feature, scattered and regrown on each change.
  const dotsRef = useRef<{ current: Dot[]; leaving: Dot[]; changedAt: number; key: string; tint: string; redraw: () => void } | null>(null);
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!stage || !canvas || !ctx) return;
    let size = 1;
    let clock = 0;
    const state = { current: [] as Dot[], leaving: [] as Dot[], changedAt: -10, key: "", tint: "#ffffff", redraw: () => {} };
    dotsRef.current = state;

    const relayout = (feature: DotBurstFeature, animate: boolean) => {
      const key = `${feature.id}:${Math.round(size)}`;
      if (key === state.key) return;
      const center = size / 2;
      state.leaving = animate
        ? state.current.map((d) => {
            const a = Math.atan2(d.y - center, d.x - center);
            return { ...d, vx: Math.cos(a) * (140 + d.size * 30), vy: Math.sin(a) * (140 + d.size * 30) };
          })
        : [];
      state.current = layoutDots(`${id}:${feature.id}`, size, live.current.dotDensity);
      const rgb = cssColorToRgb(feature.color, stage);
      state.tint = `rgb(${mixOklch(rgb, [255, 255, 255], 0.55).join(",")})`;
      state.changedAt = animate ? clock : -10;
      state.key = key;
    };

    const loop = runCanvasLoop({
      host: stage,
      canvas,
      resize: (frame) => {
        size = Math.min(frame.width, frame.height);
        state.key = "";
        const { items: list, index: i } = live.current;
        relayout(list[Math.min(i, list.length - 1)], false);
      },
      render: ({ dt, still, dpr, width, height }) => {
        clock += dt;
        const { items: list, index: i } = live.current;
        relayout(list[Math.min(i, list.length - 1)], !still);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const ox = (width - size) / 2;
        const oy = (height - size) / 2;
        const since = clock - state.changedAt;
        // Old dots fly outward and fade fast.
        if (since < 0.4) {
          for (const d of state.leaving) {
            ctx.globalAlpha = Math.max(0, 1 - since / 0.35);
            ctx.fillStyle = d.tint ? state.tint : "#ffffff";
            ctx.fillRect(ox + d.x + d.vx * since - d.size / 2, oy + d.y + d.vy * since - d.size / 2, d.size, d.size);
          }
        }
        // New clusters grow in one after another; a few dots twinkle at rest.
        for (const d of state.current) {
          const grow = still ? 1 : ease((since - 0.12 - d.delay) / 0.28);
          if (grow <= 0) continue;
          const s = d.size * grow;
          ctx.globalAlpha = d.twinkle >= 0 && !still ? 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(clock * 2.6 + d.twinkle)) : 1;
          ctx.fillStyle = d.tint ? state.tint : "#ffffff";
          ctx.fillRect(ox + d.x - s / 2, oy + d.y - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
      },
    });
    state.redraw = () => loop.redraw();
    const io = new IntersectionObserver(([entry]) => {
      pause.current.inView = entry?.isIntersecting ?? true;
    });
    io.observe(stage);
    return () => {
      loop.dispose();
      io.disconnect();
      dotsRef.current = null;
    };
  }, [id]);

  // Redraw the still frame when the feature changes under reduced motion.
  useEffect(() => {
    dotsRef.current?.redraw();
  }, [index, dotDensity]);

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const map: Record<string, number> = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: items.length - 1 };
    if (!(event.key in map)) return;
    event.preventDefault();
    const next = ((map[event.key] % items.length) + items.length) % items.length;
    go(next, true);
    tabRefs.current[next]?.focus();
  };

  // Swipe on the stage (mostly for narrow, touch layouts).
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const spring = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 260, damping: 30 };

  return (
    <section
      ref={sectionRef}
      className={cn("@container w-full", className)}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") pause.current.hover = true;
      }}
      onPointerLeave={() => (pause.current.hover = false)}
      onFocus={() => (pause.current.focus = true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) pause.current.focus = false;
      }}
      {...props}
    >
      {/* Narrow: heading, stage, list. Wide: heading and list centered beside the stage. */}
      <div className="grid gap-x-12 gap-y-7 [grid-template-areas:'heading'_'stage'_'list'] @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] @3xl:grid-rows-[1fr_auto_auto_1fr] @3xl:[grid-template-areas:'._stage'_'heading_stage'_'list_stage'_'._stage']">
        <h2 className="text-[clamp(1.75rem,4.4cqi,2.6rem)] leading-[1.08] font-semibold tracking-[-0.02em] text-balance text-foreground [grid-area:heading]">{heading}</h2>
        <div className="flex flex-col gap-7 [grid-area:list]">
          <div role="tablist" aria-orientation="vertical" aria-label="Features" className="flex flex-col">
            {items.map((item, i) => {
              const open = i === index;
              return (
                <div key={item.id} className="border-t border-border first:border-t-0">
                  <motion.div
                    initial={false}
                    animate={{ backgroundColor: open ? "var(--surface)" : "rgba(0,0,0,0)" }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                    className="my-1 rounded-xl"
                  >
                    <button
                      ref={(el) => {
                        tabRefs.current[i] = el;
                      }}
                      type="button"
                      role="tab"
                      id={`${id}-tab-${i}`}
                      aria-selected={open}
                      aria-controls={`${id}-panel`}
                      tabIndex={open ? 0 : -1}
                      onClick={() => go(i, true)}
                      onKeyDown={(e) => onTabKey(e, i)}
                      className={cn(
                        "flex w-full cursor-pointer items-center px-4 pt-3.5 text-left text-[16px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded-xl",
                        open ? "pb-1 text-foreground" : "pb-3.5 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {item.title}
                    </button>
                    <motion.div initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }} transition={{ height: spring, opacity: { duration: reduceMotion ? 0 : 0.2 } }} className="overflow-hidden">
                      <p className="px-4 text-[14px] leading-relaxed text-text-secondary">{item.description}</p>
                      <div className="mx-4 mt-3 mb-4 h-[3px] overflow-hidden rounded-full bg-border" aria-hidden="true">
                        {open ? <motion.div className="h-full origin-left rounded-full" style={{ scaleX: autoplaying ? progress : 1, background: item.color }} /> : null}
                      </div>
                    </motion.div>
                  </motion.div>
                </div>
              );
            })}
          </div>
          {items.length > 1 && !reduceMotion ? (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause autoplay" : "Play autoplay"}
              className="inline-flex h-10 w-fit cursor-pointer items-center gap-2 rounded-md border border-input px-3.5 text-[13px] font-semibold text-foreground outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
            >
              {playing ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
              {playing ? "Pause" : "Play"}
            </button>
          ) : null}
        </div>
        <div
          ref={stageRef}
          id={`${id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${index}`}
          className="relative aspect-square w-full touch-pan-y self-center overflow-hidden rounded-3xl [grid-area:stage]"
          style={{ backgroundColor: items[0]?.color }}
          onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (!s) return;
            const dx = e.clientX - s.x;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(index + (dx < 0 ? 1 : -1), true);
          }}
        >
          <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
          <AnimatePresence initial={false}>
            <motion.div
              key={active.id}
              className="absolute inset-0 grid place-items-center"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(8px)" }}
              transition={{ duration: reduceMotion ? 0.2 : 0.36, ease: [0.22, 1, 0.36, 1] }}
            >
              {active.card}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
