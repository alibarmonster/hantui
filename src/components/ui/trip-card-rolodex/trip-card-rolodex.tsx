"use client";

import { useCallback, useEffect, useId, useRef, useState, type ComponentProps, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, animate, motion, useInView, useMotionValue, useReducedMotion } from "motion/react";
import { Lightbulb, Pause, Plane, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { duration, ease, spring } from "@/lib/motion";

export interface TripCard {
  /** Stable id, used for keys. */
  id: string;
  /** Small icon shown in the collapsed row. */
  icon: ReactNode;
  /** Card title, shown in the collapsed row and announced as the slide name. */
  title: string;
  /** One-line summary at the right of the collapsed row, such as "6 nights · 4 hotels". */
  summary: ReactNode;
  /** The expanded card's content. Use the exported building blocks or your own. */
  content: ReactNode;
}

export interface TripCardRolodexProps extends Omit<ComponentProps<"div">, "children"> {
  /** Cards in order. The stack loops. */
  cards: TripCard[];
  /** Controlled index of the expanded card. */
  index?: number;
  /** Index of the expanded card at first when uncontrolled. @default 0 */
  defaultIndex?: number;
  /** Called when the expanded card changes. */
  onIndexChange?: (index: number) => void;
  /** Roll to the next card on a timer while in view. Pauses on hover and focus. @default true */
  autoplay?: boolean;
  /** Seconds between cards while autoplaying. @default 3 */
  interval?: number;
  /** Height of the expanded card in px. @default 320 */
  cardHeight?: number;
  /** Let the mouse wheel roll the stack while the pointer is over it. The page does not scroll from there while this is on. @default true */
  wheel?: boolean;
  /** Accessible name of the carousel. @default "Trip details" */
  label?: string;
}

const ROW = 48;
const GAP = 8;

export function TripCardRolodex({
  cards,
  index,
  defaultIndex = 0,
  onIndexChange,
  autoplay = true,
  interval = 3,
  cardHeight = 320,
  wheel = true,
  label = "Trip details",
  className,
  onKeyDown,
  ...props
}: TripCardRolodexProps) {
  const id = useId();
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.4 });
  const count = cards.length;
  const [internal, setInternal] = useState(defaultIndex);
  const current = count ? (((index ?? internal) % count) + count) % count : 0;
  const [playing, setPlaying] = useState(autoplay);
  const [held, setHeld] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const swipe = useRef<number | null>(null);
  const keepFocus = useRef(false);

  const latest = useRef({ current, count, cards, onIndexChange, controlled: index !== undefined });
  useEffect(() => {
    latest.current = { current, count, cards, onIndexChange, controlled: index !== undefined };
  });

  /** Rolls by `delta` cards. `byUser` announces the new slide. */
  const roll = useCallback((delta: number, byUser: boolean) => {
    const state = latest.current;
    if (state.count < 2) return;
    const next = (((state.current + delta) % state.count) + state.count) % state.count;
    if (!state.controlled) setInternal(next);
    state.onIndexChange?.(next);
    if (byUser) {
      setAnnouncement(`${next + 1} of ${state.count}, ${state.cards[next].title}`);
      keepFocus.current = true;
    }
  }, []);

  // The row that was pressed turns into the expanded card and its button goes away. Hand focus to
  // the stack, so arrow keys keep working.
  useEffect(() => {
    if (!keepFocus.current) return;
    keepFocus.current = false;
    const root = rootRef.current;
    if (root && (document.activeElement === document.body || !document.activeElement || !root.contains(document.activeElement))) stackRef.current?.focus({ preventScroll: true });
  }, [current]);

  const running = autoplay && playing && !held && inView && count > 1;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => roll(1, false), Math.max(1, interval) * 1000);
    return () => window.clearInterval(timer);
  }, [running, interval, roll]);

  // The wheel rolls one card per gesture. It needs a non-passive listener to keep the page still.
  useEffect(() => {
    const stack = stackRef.current;
    if (!stack || !wheel) return;
    let travelled = 0;
    let lockedUntil = 0;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      event.preventDefault();
      const now = performance.now();
      if (now < lockedUntil) return;
      travelled += event.deltaY;
      if (Math.abs(travelled) < 50) return;
      roll(travelled > 0 ? 1 : -1, true);
      travelled = 0;
      lockedUntil = now + 380;
    };
    stack.addEventListener("wheel", onWheel, { passive: false });
    return () => stack.removeEventListener("wheel", onWheel);
  }, [wheel, roll]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const delta = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!delta) return;
    event.preventDefault();
    roll(delta, true);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current;
    swipe.current = null;
    if (start === null || event.pointerType === "mouse") return;
    const dy = event.clientY - start;
    if (Math.abs(dy) >= 36) roll(dy > 0 ? 1 : -1, true);
  }

  // Top to bottom: the next card as a row, the expanded card, the previous card as a row.
  const at = (offset: number) => (((current + offset) % count) + count) % count;
  const visible = count === 0 ? [] : count === 1 ? [current] : count === 2 ? [at(1), current] : [at(1), current, at(-1)];
  const move = reduceMotion ? { duration: 0 } : spring.smooth;
  const fade = { duration: reduceMotion ? duration.quick : duration.base, ease: ease.out };

  return (
    <div
      ref={rootRef}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={handleKeyDown}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false);
      }}
      className={cn("w-full max-w-[340px]", className)}
      {...props}
    >
      <div
        ref={stackRef}
        onPointerDown={(event) => {
          swipe.current = event.clientY;
        }}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
        style={{ height: cardHeight + (Math.min(count, 3) - 1) * (ROW + GAP) }}
        tabIndex={-1}
        className="relative flex touch-none flex-col gap-2 overscroll-contain rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
      >
        <LayoutGroup id={id}>
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((cardIndex) => {
              const card = cards[cardIndex];
              const expanded = cardIndex === current;
              return (
                <motion.div
                  key={card.id}
                  layout
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${cardIndex + 1} of ${count}, ${card.title}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ layout: move, opacity: fade }}
                  whileHover={expanded && !reduceMotion ? { y: -2 } : undefined}
                  style={{ borderRadius: 16, height: expanded ? cardHeight : ROW }}
                  className={cn(
                    "relative w-full shrink-0 overflow-hidden border bg-white text-zinc-900",
                    expanded ? "border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.05),0_14px_34px_-16px_rgb(0_0_0/0.3)]" : "border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)]",
                  )}
                >
                  {/* Blur lives on this inner layer, so the card's frame stays crisp while it resizes. */}
                  <AnimatePresence initial={false} mode="popLayout">
                    {expanded ? (
                      <motion.div
                        key="content"
                        layout="position"
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(6px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(6px)" }}
                        transition={fade}
                        style={{ height: cardHeight }}
                        className="absolute inset-x-0 top-0"
                      >
                        {card.content}
                      </motion.div>
                    ) : (
                      <motion.button
                        key="row"
                        type="button"
                        layout="position"
                        aria-label={`Show ${card.title}`}
                        onClick={() => roll(cardIndex === at(1) ? 1 : -1, true)}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(6px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(6px)" }}
                        transition={fade}
                        style={{ height: ROW }}
                        className="absolute inset-x-0 top-0 flex w-full cursor-pointer items-center gap-2.5 rounded-2xl px-3.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center text-zinc-500 [&_svg]:size-4">
                          {card.icon}
                        </span>
                        <span className="font-medium">{card.title}</span>
                        <span className="ml-auto truncate pl-2 font-mono text-[11.5px] text-zinc-600 tabular-nums">{card.summary}</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </LayoutGroup>
      </div>

      {count > 1 ? (
        <div className="mt-2 flex items-center justify-between pl-1 text-xs text-muted-foreground tabular-nums">
          <span aria-hidden="true">
            {current + 1} / {count}
          </span>
          {autoplay ? (
            <button
              type="button"
              aria-label={playing ? "Pause autoplay" : "Play autoplay"}
              onClick={() => setPlaying((value) => !value)}
              className="grid size-10 cursor-pointer place-items-center rounded-full text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {playing ? <Pause aria-hidden="true" className="size-3.5" fill="currentColor" strokeWidth={0} /> : <Play aria-hidden="true" className="size-3.5" fill="currentColor" strokeWidth={0} />}
            </button>
          ) : null}
        </div>
      ) : null}

      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Building blocks for a trip: six card contents with fictional defaults. Each fills its card.
// ---------------------------------------------------------------------------------------------

const caption = "font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase";

export interface TripCoverProps {
  /** Trip title. @default "Autumn in the Vale" */
  title?: string;
  /** Month, day and weekday shown on the date chip. @default ["NOV", "20", "FRI"] */
  date?: [month: string, day: string, weekday: string];
  /** Line under the title. @default "6 nights · Port Aster to Vale Harbor" */
  subtitle?: string;
}

/** A cover with original scenery (hills, a lake and autumn trees, drawn in SVG) and a date chip. */
export function TripCover({ title = "Autumn in the Vale", date = ["NOV", "20", "FRI"], subtitle = "6 nights · Port Aster to Vale Harbor" }: TripCoverProps) {
  return (
    <div className="relative size-full">
      <svg aria-hidden="true" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id="trip-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd9a8" />
            <stop offset="0.55" stopColor="#ffb38a" />
            <stop offset="1" stopColor="#f07f6a" />
          </linearGradient>
          <linearGradient id="trip-lake" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4a37f" />
            <stop offset="1" stopColor="#7a4a63" />
          </linearGradient>
        </defs>
        <rect width="340" height="320" fill="url(#trip-sky)" />
        <circle cx="236" cy="92" r="30" fill="#fff3d6" />
        <path d="M0 170l52-52 38 30 46-58 60 66 44-36 100 78v122H0z" fill="#c8566b" opacity="0.75" />
        <path d="M0 196l70-44 52 34 66-50 62 52 90-30v162H0z" fill="#8d3f5f" />
        <rect y="214" width="340" height="106" fill="url(#trip-lake)" />
        <path d="M0 214h340v6H0z" fill="#fff3d6" opacity="0.35" />
        <path d="M206 232h60M190 246h92M214 260h44" stroke="#fff3d6" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
        <path d="M0 246c40-22 78-22 120 0s70 20 96 8v66H0z" fill="#3b2140" />
        {[
          [28, 228, 26, "#e2572b"], [62, 236, 20, "#f29b38"], [96, 232, 24, "#d93f2e"], [134, 246, 17, "#f2b84b"], [176, 256, 14, "#e2572b"],
        ].map(([x, y, r, color]) => (
          <g key={`${x}`}>
            <rect x={Number(x) - 1.5} y={Number(y)} width="3" height={Number(r) + 10} fill="#2a1730" />
            <circle cx={x} cy={y} r={r} fill={String(color)} />
            <circle cx={Number(x) - Number(r) * 0.3} cy={Number(y) - Number(r) * 0.3} r={Number(r) * 0.45} fill="#fff" opacity="0.18" />
          </g>
        ))}
      </svg>
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(20_10_24/0.78),transparent_55%)]" />
      <div className="absolute top-3.5 left-3.5 grid w-12 place-items-center rounded-xl bg-white py-1.5 text-center shadow-sm">
        <span className="text-[9px] font-bold tracking-[0.08em] text-[#d93f2e]">{date[0]}</span>
        <span className="text-lg leading-5 font-semibold text-zinc-900">{date[1]}</span>
        <span className="text-[9px] font-medium tracking-[0.08em] text-zinc-500">{date[2]}</span>
      </div>
      <div className="absolute inset-x-4 bottom-4 text-white">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-0.5 text-[13px] text-white/85">{subtitle}</p>
      </div>
    </div>
  );
}

export interface FlightCardProps {
  /** Departure: airport code, city and time. @default { code: "AST", city: "Port Aster", time: "11:50" } */
  from?: { code: string; city: string; time: string };
  /** Arrival: airport code, city and time. @default { code: "VLH", city: "Vale Harbor", time: "15:25" } */
  to?: { code: string; city: string; time: string };
  /** Flight length shown over the arc. @default "3h 35m · Nonstop" */
  length?: string;
  /** Label and value pairs under the arc. @default gate, seat, boarding and bags */
  meta?: [label: string, value: string][];
}

/** A flight between two codes, with a plane that flies along a dashed arc when the card appears. */
export function FlightCard({
  from = { code: "AST", city: "Port Aster", time: "11:50" },
  to = { code: "VLH", city: "Vale Harbor", time: "15:25" },
  length = "3h 35m · Nonstop",
  meta = [["Gate", "B14"], ["Seat", "22A"], ["Boards", "11:10"], ["Bags", "1 × 23kg"]],
}: FlightCardProps) {
  const reduceMotion = useReducedMotion();
  const planeRef = useRef<SVGGElement>(null);
  const t = useMotionValue(0);
  useEffect(() => {
    // A quadratic curve from (16, 70) over (150, -10) to (284, 70), in the SVG's own units.
    const point = (v: number) => ({ x: (1 - v) ** 2 * 16 + 2 * (1 - v) * v * 150 + v ** 2 * 284, y: (1 - v) ** 2 * 70 + 2 * (1 - v) * v * -10 + v ** 2 * 70 });
    const place = (v: number) => {
      const p = point(v);
      const ahead = point(Math.min(1, v + 0.01));
      const behind = point(Math.max(0, v - 0.01));
      const angle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
      // The plane icon points up and to the right, so it is turned 45° to face along the arc.
      planeRef.current?.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${(angle + 45).toFixed(1)})`);
    };
    const stop = t.on("change", place);
    if (reduceMotion) {
      place(0.62);
      return stop;
    }
    place(0);
    const controls = animate(t, 0.62, { duration: 1.4, delay: 0.2, ease: ease.inOut });
    return () => {
      controls.stop();
      stop();
    };
  }, [t, reduceMotion]);
  return (
    <div className="flex size-full flex-col p-4">
      <p className={caption}>Flight · Fri 20 Nov</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-3xl leading-none font-semibold tracking-tight">{from.code}</p>
          <p className="mt-1 text-xs text-zinc-600">{from.city}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl leading-none font-semibold tracking-tight">{to.code}</p>
          <p className="mt-1 text-xs text-zinc-600">{to.city}</p>
        </div>
      </div>
      <div className="relative mt-2 flex-1">
        <svg aria-hidden="true" viewBox="0 0 300 84" className="absolute inset-0 size-full overflow-visible" fill="none">
          <path d="M16 70Q150 -10 284 70" stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round" />
          <circle cx="16" cy="70" r="4" fill="#18181b" />
          <circle cx="284" cy="70" r="4" fill="#18181b" />
          <g ref={planeRef} transform="translate(16 70)">
            <circle r="12" fill="#fff" />
            <Plane x={-9} y={-9} width={18} height={18} fill="#2563eb" stroke="#2563eb" strokeWidth={1.5} />
          </g>
        </svg>
        <p className="absolute inset-x-0 bottom-0 text-center font-mono text-[11px] text-zinc-600">{length}</p>
      </div>
      <div className="flex justify-between font-mono text-sm tabular-nums">
        <span>{from.time}</span>
        <span>{to.time}</span>
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-zinc-200 pt-3">
        {meta.map(([name, value]) => (
          <div key={name}>
            <dt className={caption}>{name}</dt>
            <dd className="mt-0.5 font-mono text-xs font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export interface RouteCardProps {
  /** Stops along the route, in order. Four fit the map. @default four fictional towns */
  stops?: string[];
  /** Transfer chips under the map. @default ["Train 2h 10m", "Ferry 45m", "Bus 1h 20m"] */
  transfers?: string[];
}

const ROUTE_POINTS: [number, number][] = [[36, 104], [112, 44], [196, 92], [262, 36]];

/** A route drawn over a dotted map: the line draws on, then the stop pins pop in one by one. */
export function RouteCard({ stops = ["Port Aster", "Mistral", "Emberfield", "Vale Harbor"], transfers = ["Train 2h 10m", "Ferry 45m", "Bus 1h 20m"] }: RouteCardProps) {
  const reduceMotion = useReducedMotion();
  const points = ROUTE_POINTS.slice(0, Math.max(2, Math.min(stops.length, ROUTE_POINTS.length)));
  const path = points.map(([x, y], i) => (i === 0 ? `M${x} ${y}` : `Q${(points[i - 1][0] + x) / 2} ${points[i - 1][1] + (i % 2 ? -34 : 34)} ${x} ${y}`)).join("");
  return (
    <div className="flex size-full flex-col p-4">
      <p className={caption}>Route · {points.length} stops</p>
      <div className="relative mt-3 aspect-[300/150] w-full overflow-hidden rounded-xl bg-[#f3f6f1] bg-[radial-gradient(circle,#b9c4b4_1px,transparent_1.4px)] bg-[length:10px_10px]">
        <svg viewBox="0 0 300 150" className="absolute inset-0 size-full" fill="none" aria-hidden="true">
          <path d="M-10 128c60-30 96 14 150-8s88-58 170-40v90H-10z" fill="#cfe3ee" />
          <motion.path
            d={path}
            pathLength={1}
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="1"
            initial={{ strokeDashoffset: reduceMotion ? 0 : 1 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: reduceMotion ? 0 : 1.1, delay: 0.15, ease: ease.inOut }}
          />
          {points.map(([x, y], i) => (
            <motion.g
              key={i}
              initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...spring.bouncy, delay: 0.25 + i * 0.28 }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            >
              <circle cx={x} cy={y} r="7" fill="#fff" stroke="#2563eb" strokeWidth="2.5" />
              <circle cx={x} cy={y} r="2.5" fill="#2563eb" />
            </motion.g>
          ))}
        </svg>
        {points.map(([x, y], i) => (
          <span key={stops[i]} style={{ left: `${(x / 300) * 100}%`, top: `${(y / 150) * 100}%` }} className="absolute -translate-x-1/2 translate-y-2.5 rounded bg-white/85 px-1 text-[10px] font-medium whitespace-nowrap text-zinc-800">
            {stops[i]}
          </span>
        ))}
      </div>
      <ul className="mt-auto flex flex-wrap gap-1.5 pt-3">
        {transfers.map((transfer) => (
          <li key={transfer} className="rounded-full bg-zinc-100 px-2.5 py-1 font-mono text-[11px] text-zinc-700">
            {transfer}
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface StaysCardProps {
  /** Places to stay: name, nights and dates. Four fit the grid. @default four fictional inns */
  stays?: { name: string; nights: number; dates: string }[];
  /** A short tip shown under the grid. @default a check-in tip */
  tip?: string;
}

const STAY_COLORS = ["#2563eb", "#eb6834", "#1baf7a", "#7c3aed"];

/** Stays in a two-by-two grid, each with one bar per night, plus a tip. */
export function StaysCard({
  stays = [
    { name: "Harbor House", nights: 2, dates: "Nov 20 – 22" },
    { name: "Mistral Inn", nights: 1, dates: "Nov 22 – 23" },
    { name: "Ember Lodge", nights: 2, dates: "Nov 23 – 25" },
    { name: "The Vale Rooms", nights: 1, dates: "Nov 25 – 26" },
  ],
  tip = "Check-in opens at 3 PM. Ember Lodge holds bags from noon.",
}: StaysCardProps) {
  const total = stays.reduce((sum, stay) => sum + stay.nights, 0);
  return (
    <div className="flex size-full flex-col p-4">
      <p className={caption}>
        Stays · {total} nights · {stays.length} places
      </p>
      <ul className="mt-3 grid flex-1 grid-cols-2 gap-2">
        {stays.map((stay, index) => (
          <li key={stay.name} className="flex flex-col justify-between rounded-xl bg-zinc-50 p-2.5 ring-1 ring-black/[0.04]">
            <div>
              <p className="text-[13px] leading-4 font-medium">{stay.name}</p>
              <p className="mt-0.5 font-mono text-[10.5px] text-zinc-600">{stay.dates}</p>
            </div>
            <div className="mt-2 flex items-center gap-1" aria-label={`${stay.nights} ${stay.nights === 1 ? "night" : "nights"}`} role="img">
              {Array.from({ length: stay.nights }, (_, night) => (
                <motion.span
                  key={night}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: duration.base, delay: 0.15 + index * 0.06 + night * 0.05, ease: ease.out }}
                  style={{ background: STAY_COLORS[index % STAY_COLORS.length] }}
                  className="h-1.5 w-5 origin-left rounded-full"
                />
              ))}
              <span className="ml-1 font-mono text-[10.5px] text-zinc-600">{stay.nights}n</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-xs leading-4 text-amber-950">
        <Lightbulb aria-hidden="true" className="mt-px size-3.5 shrink-0 text-amber-600" />
        {tip}
      </p>
    </div>
  );
}

export interface DiningCardProps {
  /** Reservations: time, place, a short note and a status. @default four fictional tables */
  tables?: { time: string; place: string; note: string; status: "booked" | "included" | "waitlist"; statusLabel?: string }[];
}

const STATUS: Record<"booked" | "included" | "waitlist", { text: string; className: string }> = {
  booked: { text: "Booked", className: "bg-emerald-100 text-emerald-900" },
  included: { text: "With stay", className: "bg-zinc-100 text-zinc-700" },
  waitlist: { text: "Waitlist", className: "bg-amber-100 text-amber-900" },
};

/** A dining list with times, places, notes and status chips. */
export function DiningCard({
  tables = [
    { time: "Fri 19:30", place: "Saltline Kitchen", note: "Harbor view, table for 2", status: "booked" },
    { time: "Sat 08:00", place: "Mistral Inn breakfast", note: "Served until 10", status: "included" },
    { time: "Sun 20:00", place: "Cinder & Rye", note: "Tasting menu", status: "waitlist", statusLabel: "Waitlist #2" },
    { time: "Tue 13:00", place: "Orchard Table", note: "Garden lunch", status: "booked" },
  ],
}: DiningCardProps) {
  return (
    <div className="flex size-full flex-col p-4">
      <p className={caption}>Dining · {tables.length} tables</p>
      <ul className="mt-2 flex flex-1 flex-col justify-between divide-y divide-zinc-100">
        {tables.map((table, index) => (
          <motion.li
            key={`${table.time}-${table.place}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.base, delay: 0.1 + index * 0.05, ease: ease.out }}
            className="flex items-center gap-3 py-2"
          >
            <span className="w-[68px] shrink-0 font-mono text-[11px] whitespace-nowrap text-zinc-600 tabular-nums">{table.time}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{table.place}</span>
              <span className="block truncate text-[11.5px] text-zinc-600">{table.note}</span>
            </span>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", STATUS[table.status].className)}>{table.statusLabel ?? STATUS[table.status].text}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export interface BudgetCardProps {
  /** Amount spent so far. @default 3300 */
  spent?: number;
  /** The whole budget. @default 3800 */
  total?: number;
  /** ISO currency code. @default "USD" */
  currency?: string;
  /** Category chips: a name and an amount. @default transport, lodging and food */
  categories?: [name: string, amount: number][];
  /** Spend per day, one bar each. @default seven days */
  days?: { label: string; amount: number }[];
  /** Index of the bar drawn in the accent color. @default the largest day */
  highlight?: number;
}

/** Spent of total, category chips and a per-day bar chart whose bars grow when the card appears. */
export function BudgetCard({
  spent = 3300,
  total = 3800,
  currency = "USD",
  categories = [["Transport", 1180], ["Lodging", 1420], ["Food", 700]],
  days = [
    { label: "F", amount: 620 }, { label: "S", amount: 410 }, { label: "S", amount: 530 }, { label: "M", amount: 380 }, { label: "T", amount: 760 }, { label: "W", amount: 340 }, { label: "T", amount: 260 },
  ],
  highlight,
}: BudgetCardProps) {
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
  const peak = Math.max(1, ...days.map((day) => day.amount));
  const accent = highlight ?? days.findIndex((day) => day.amount === peak);
  return (
    <div className="flex size-full flex-col p-4">
      <p className={caption}>Budget</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">{money.format(spent)}</span>
        <span className="font-mono text-xs text-zinc-600 tabular-nums">/ {money.format(total)}</span>
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {categories.map(([name, amount]) => (
          <li key={name} className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] text-zinc-700">
            {name} <span className="font-mono tabular-nums">{money.format(amount)}</span>
          </li>
        ))}
      </ul>
      <div role="img" aria-label={`Spend per day, highest ${money.format(peak)}`} className="mt-3 flex flex-1 items-end gap-2">
        {days.map((day, index) => (
          <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <motion.span
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ ...spring.smooth, delay: 0.12 + index * 0.05 }}
              style={{ height: `${Math.max(6, (day.amount / peak) * 100)}%` }}
              className={cn("w-full origin-bottom rounded-md", index === accent ? "bg-[#2563eb]" : "bg-zinc-200")}
            />
            <span aria-hidden="true" className="font-mono text-[10px] text-zinc-500">
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
