"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type WheelEvent } from "react";
import { AnimatePresence, animate, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { createRandom } from "@/lib/random";

export interface FoilTicketMeta {
  /** Small caps label, e.g. "Gate". */
  label: string;
  /** Value under the label. */
  value: string;
}

export interface FoilTicket {
  /** Stable id; seeds the barcode and keeps the torn state. */
  id: string;
  /** Display title, set vertically on the stub. */
  title: string;
  /** Big number on the stub, e.g. "01". */
  number: string;
  /** Illustration in the perforated stamp: any node (an inline SVG works best) or an image URL. */
  art: ReactNode;
  /** Tiny rows on the stub. */
  meta: FoilTicketMeta[];
  /** Accent for the stub stripe and the serial line. @default "#ff8a2b" */
  accent?: string;
  /** Tiny serial line above the stamp. @default "Nº 0000{number} · {title}" */
  serial?: string;
}

export interface FoilTicketReelProps extends Omit<ComponentProps<"section">, "children"> {
  /** The tickets in the reel. @default a seven-ticket night fair set */
  tickets?: FoilTicket[];
  /** Shuffle to the next ticket on a timer (paused on hover, focus, offscreen and while tearing). @default true */
  autoplay?: boolean;
  /** Seconds per ticket while autoplaying. @default 2.4 */
  interval?: number;
  /** Let people tear off the stub by dragging it away (or pressing Enter on it). @default true */
  tearable?: boolean;
  /** Called with a ticket when its stub is torn off. */
  onTear?: (ticket: FoilTicket) => void;
  /** Accessible name of the carousel. @default "Tickets" */
  label?: string;
}

/* ----------------------------------------------------------------------------------------- art */

const C = { sky: "#1f2452", deep: "#14173a", dusk: "#2b2157", orange: "#ff8a2b", ember: "#e2631a", gold: "#ffc95c", bone: "#f4ecd8", lilac: "#8f80ff", ink: "#0d0e24", mist: "#4b5196", grass: "#2f6b57" };

const Star = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <path d={`M${x} ${y - 3 * s}l${0.9 * s} ${2.1 * s} ${2.1 * s} ${0.9 * s} -${2.1 * s} ${0.9 * s} -${0.9 * s} ${2.1 * s} -${0.9 * s} -${2.1 * s} -${2.1 * s} -${0.9 * s} ${2.1 * s} -${0.9 * s}z`} fill={C.gold} />
);

const Ghost = ({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
    <path d="M-10 6c0-12 4-20 10-20s10 8 10 20v12l-3.4-3-3.3 3-3.3-3-3.3 3-3.3-3-3.4 3z" fill={C.bone} />
    <ellipse cx="-3.5" cy="-2" rx="1.8" ry="2.6" fill={C.ink} />
    <ellipse cx="3.5" cy="-2" rx="1.8" ry="2.6" fill={C.ink} />
    <ellipse cx="0" cy="5" rx="2" ry="2.6" fill={C.ink} />
  </g>
);

const Cloud = ({ x, y, s = 1, fill }: { x: number; y: number; s?: number; fill: string }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 14h46c6 0 8-9 2-11 0-7-8-10-13-6-3-8-15-8-17 0-6-3-13 1-12 7-6 1-6 10-6 10z" fill={fill} />
);

function StormArt() {
  return (
    <svg viewBox="0 0 120 150" aria-hidden="true">
      <rect width="120" height="150" fill={C.sky} />
      {[[18, 22, 1], [92, 16, 1.3], [104, 52, 0.8], [30, 58, 0.7], [70, 34, 0.9], [14, 96, 0.8]].map(([x, y, s], i) => (
        <Star key={i} x={x} y={y} s={s} />
      ))}
      <Cloud x={8} y={70} s={1.5} fill={C.mist} />
      <Cloud x={46} y={84} s={1.4} fill="#6a70b8" />
      <path d="M62 104l-8 18h8l-5 16 15-22h-8l5-12z" fill={C.gold} />
      <Cloud x={-6} y={112} s={1.6} fill="#3a3f7c" />
      <Cloud x={52} y={120} s={1.5} fill={C.mist} />
    </svg>
  );
}

function PumpkinArt() {
  return (
    <svg viewBox="0 0 120 150" aria-hidden="true">
      <rect width="120" height="150" fill={C.dusk} />
      <circle cx="60" cy="86" r="44" fill={C.orange} opacity="0.14" />
      <rect x="0" y="122" width="120" height="28" fill={C.deep} />
      <path d="M58 52c0-8 3-13 8-15l3 4c-4 2-5 6-5 11z" fill={C.grass} />
      <ellipse cx="40" cy="92" rx="22" ry="30" fill={C.ember} />
      <ellipse cx="80" cy="92" rx="22" ry="30" fill={C.ember} />
      <ellipse cx="60" cy="92" rx="25" ry="33" fill={C.orange} />
      <path d="M44 84l8-11 8 11zM68 84l8-11 8 11z" fill={C.gold} />
      <path d="M57 92l3-6 3 6z" fill={C.gold} />
      <path d="M38 100c6 10 38 10 44 0l-4 7-4-4-5 6-5-6-5 6-5-6-4 4-4-4z" fill={C.gold} />
      <Star x={20} y={26} s={0.9} />
      <Star x={100} y={34} s={1.2} />
    </svg>
  );
}

function WebArt() {
  const spokes = [0, 18, 36, 54, 72, 90];
  return (
    <svg viewBox="0 0 120 150" aria-hidden="true">
      <rect width="120" height="150" fill={C.sky} />
      <g stroke={C.bone} strokeOpacity="0.55" strokeWidth="1" fill="none">
        {spokes.map((a) => (
          <line key={a} x1="0" y1="0" x2={Math.cos((a * Math.PI) / 180) * 150} y2={Math.sin((a * Math.PI) / 180) * 150} />
        ))}
        {[22, 40, 58, 76, 94].map((r) => (
          <path key={r} d={spokes.slice(0, -1).map((a, i) => `${i ? "Q" : "M"}${i ? `${Math.cos(((a - 9) * Math.PI) / 180) * (r - 5)} ${Math.sin(((a - 9) * Math.PI) / 180) * (r - 5)} ` : ""}${Math.cos((a * Math.PI) / 180) * r} ${Math.sin((a * Math.PI) / 180) * r}`).join(" ") + ` Q${Math.cos((81 * Math.PI) / 180) * (r - 5)} ${Math.sin((81 * Math.PI) / 180) * (r - 5)} ${Math.cos((90 * Math.PI) / 180) * r} ${r}`} />
        ))}
      </g>
      <line x1="84" y1="0" x2="84" y2="40" stroke={C.bone} strokeOpacity="0.6" />
      <circle cx="84" cy="44" r="4" fill={C.ink} stroke={C.bone} strokeOpacity="0.6" />
      <Ghost x={44} y={104} s={1.15} />
      <Ghost x={86} y={118} s={0.85} flip />
    </svg>
  );
}

function TombArt() {
  return (
    <svg viewBox="0 0 120 150" aria-hidden="true">
      <rect width="120" height="150" fill={C.deep} />
      <circle cx="88" cy="34" r="16" fill={C.gold} />
      <circle cx="82" cy="30" r="3" fill="#e8ad46" />
      <path d="M0 98c24-22 72-28 120-6v58H0z" fill="#2d3a6b" />
      {[[22, 92, 0.9], [52, 82, 1.1], [84, 88, 1], [36, 112, 1.2], [76, 114, 1.15]].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M-8 18V-2a8 8 0 0116 0v20z" fill="#9aa2d6" />
          <path d="M-4 3h8M-4 7h6" stroke="#5c6497" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      ))}
      <path d="M0 132c30-8 80-8 120 0v18H0z" fill="#1d2550" />
      <Star x={22} y={24} s={0.8} />
      <Star x={48} y={44} s={0.6} />
    </svg>
  );
}

function CatArt() {
  return (
    <svg viewBox="0 0 120 150" aria-hidden="true">
      <rect width="120" height="150" fill="#3b2f7a" />
      <circle cx="34" cy="38" r="20" fill={C.gold} opacity="0.9" />
      <rect x="0" y="118" width="120" height="32" fill={C.ink} />
      <rect x="0" y="112" width="120" height="8" fill="#241c4f" />
      <path d="M44 112c-3-20 2-34 12-40l-4-12 9 8c3-1 7-1 10 0l9-8-4 12c9 6 12 20 9 40z" fill={C.ink} />
      <path d="M84 110c10 0 14-6 12-12" stroke={C.ink} strokeWidth="5" fill="none" strokeLinecap="round" />
      <ellipse cx="58" cy="82" rx="2.4" ry="3.4" fill={C.gold} />
      <ellipse cx="72" cy="82" rx="2.4" ry="3.4" fill={C.gold} />
      <Ghost x={96} y={58} s={0.95} flip />
      <Star x={100} y={20} s={0.9} />
    </svg>
  );
}

function WindowArt() {
  return (
    <svg viewBox="0 0 120 150" aria-hidden="true">
      <rect width="120" height="150" fill="#2a2350" />
      {Array.from({ length: 6 }, (_, r) => (
        <path key={r} d={`M0 ${r * 26 + 8}h120`} stroke="#241e47" strokeWidth="9" />
      ))}
      <path d="M28 132V62a32 32 0 0164 0v70z" fill="#120f2a" />
      <path d="M34 128V63a26 26 0 0152 0v65z" fill={C.gold} />
      <path d="M34 128V63a26 26 0 0152 0v65z" fill={C.orange} opacity="0.35" />
      <path d="M60 37v91M34 82h52M34 106h52" stroke="#120f2a" strokeWidth="4" />
      <Ghost x={48} y={78} s={0.7} />
      <path d="M70 100c4-4 8-4 10 0" stroke="#120f2a" strokeWidth="2" fill="none" />
      {[[18, 30], [98, 22], [100, 48]].map(([x, y], i) => (
        <path key={i} transform={`translate(${x} ${y})`} d="M0 0c3-3 6-3 7 0 1-2 3-3 4-2 1-1 3 0 4 2 1-3 4-3 7 0-4 0-6 2-7 4-1-1-3-1-4 0-1-1-3-1-4 0-1-2-3-4-7-4z" fill="#120f2a" />
      ))}
      <rect x="22" y="130" width="76" height="8" rx="2" fill="#120f2a" />
    </svg>
  );
}

function MoonArt() {
  return (
    <svg viewBox="0 0 120 150" aria-hidden="true">
      <rect width="120" height="150" fill={C.deep} />
      <circle cx="60" cy="70" r="40" fill={C.orange} />
      <circle cx="46" cy="58" r="7" fill={C.ember} />
      <circle cx="74" cy="84" r="9" fill={C.ember} />
      <circle cx="70" cy="50" r="4" fill={C.ember} />
      <path d="M-4 96h56c8 0 8-10 0-10-2-8-14-8-16 0-4-4-12-2-12 4H-4z" fill={C.mist} />
      <path d="M44 116h80v-12c-4-6-12-4-14 0-4-8-18-8-20 2-6-2-12 2-12 6-8-2-14 2-14 4z" fill="#6a70b8" />
      <path d="M-4 134h70c6 0 6-9 0-10-4-7-16-6-18 2-6-3-14 0-14 4H-4z" fill="#3a3f7c" />
      <Star x={16} y={22} s={0.8} />
      <Star x={104} y={30} s={1.1} />
      <Star x={98} y={128} s={0.7} />
    </svg>
  );
}

const SHOWS: [string, () => ReactNode, string][] = [
  ["Storm Watch", () => <StormArt />, "#8f80ff"],
  ["Lantern Hour", () => <PumpkinArt />, "#ff8a2b"],
  ["Web Walk", () => <WebArt />, "#7fe0b8"],
  ["Bone Hill", () => <TombArt />, "#ffc95c"],
  ["The Cat Show", () => <CatArt />, "#c6a7ff"],
  ["Lit Window", () => <WindowArt />, "#ffb347"],
  ["Harvest Moon", () => <MoonArt />, "#ff7a45"],
];

const DEFAULT_TICKETS: FoilTicket[] = SHOWS.map(([show, art, accent], i) => ({
  id: `night-fair-${i + 1}`,
  title: "Night Fair",
  number: String(i + 1).padStart(2, "0"),
  art: art(),
  accent,
  meta: [
    { label: "Show", value: show },
    { label: "Date", value: `Oct ${25 + i}` },
    { label: "Gate", value: "ABCDEFG"[i] },
    { label: "Seat", value: String(12 + i * 7) },
  ],
}));

/* ---------------------------------------------------------------------------------- the ticket */

const FOIL =
  "linear-gradient(112deg, transparent 18%, rgb(214 222 236 / 0.9) 27%, rgb(255 238 160 / 0.85) 35%, rgb(178 212 255 / 0.85) 43%, rgb(214 196 255 / 0.85) 51%, rgb(214 222 236 / 0.9) 59%, transparent 70%)";
/** A stamp's perforated edge: a grid of holes, filled back in everywhere but the border. */
const STAMP_MASK = "radial-gradient(circle, #0000 2.6px, #000 3px) -5px -5px / 10px 10px round, linear-gradient(#000 0 0) 5px 5px / calc(100% - 10px) calc(100% - 10px) no-repeat";
/** The torn edge: a zigzag along one side. */
const zigzag = (side: "right" | "left") =>
  side === "right"
    ? "conic-gradient(from -135deg at right, #0000, #000 1deg 89deg, #0000 90deg) 100% 0 / 8px 9px repeat-y, linear-gradient(#000 0 0) 0 0 / calc(100% - 7px) 100% no-repeat"
    : "conic-gradient(from 45deg at left, #0000, #000 1deg 89deg, #0000 90deg) 0 0 / 8px 9px repeat-y, linear-gradient(#000 0 0) 7px 0 / calc(100% - 7px) 100% no-repeat";
/** Half-circle notches where the tear line meets the edges. */
const notches = (side: "right" | "left") => {
  const x = side === "right" ? "100%" : "0";
  return `radial-gradient(circle at ${x} 0, #0000 9px, #000 9.5px) top / 100% 51% no-repeat, radial-gradient(circle at ${x} 100%, #0000 9px, #000 9.5px) bottom / 100% 51% no-repeat`;
};

function Barcode({ seed }: { seed: string }) {
  const r = createRandom(`barcode:${seed}`);
  let x = 0;
  const bars: { x: number; w: number }[] = [];
  while (x < 92) {
    const w = r.pick([1, 1, 1.5, 2, 3]);
    bars.push({ x, w });
    x += w + r.pick([1, 1.5, 2]);
  }
  return (
    <svg viewBox="0 0 96 22" className="h-[11cqi] w-full" preserveAspectRatio="none" aria-hidden="true">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} width={b.w} height="22" fill="#141625" />
      ))}
    </svg>
  );
}

const Reg = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 10 10" className={cn("absolute size-[2.6cqi] text-[#141625]/60", className)} aria-hidden="true">
    <path d="M5 0v10M0 5h10" stroke="currentColor" strokeWidth="1" />
    <circle cx="5" cy="5" r="2.4" fill="none" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

/**
 * Collectible event tickets with holographic foil in a shuffling reel on a dark grid with grain. Each
 * ticket has a perforated stamp with an illustration and a stub with a vertical title, a big number,
 * meta rows, a barcode and registration marks. The foil slides with the pointer's tilt and drifts at
 * rest; tickets shuffle on swipe, arrow keys, horizontal wheel or autoplay. Drag the stub away (or
 * press Enter on it) to tear it off along the perforation: it drops and an ADMITTED stamp thumps onto
 * the ticket. Reset puts it back.
 *
 * A carousel region with labelled slides and real DOM text. Reduced motion: no foil drift or grain
 * motion, tickets crossfade, and tearing works without the drop.
 */
export function FoilTicketReel({ tickets = DEFAULT_TICKETS, autoplay = true, interval = 2.4, tearable = true, onTear, label = "Tickets", className, ...props }: FoilTicketReelProps) {
  const id = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [playing, setPlaying] = useState(autoplay);
  const [torn, setTorn] = useState<ReadonlySet<string>>(() => new Set());
  const [announce, setAnnounce] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const hold = useRef({ hover: false, focus: false, tearing: false, inView: true });
  const count = tickets.length;
  const ticket = tickets[((index % count) + count) % count];

  const go = (delta: number, fromUser: boolean) => {
    if (count < 2) return;
    setDirection(delta >= 0 ? 1 : -1);
    setIndex((i) => (((i + delta) % count) + count) % count);
    if (fromUser) setAnnounce(true);
  };

  // Autoplay (paused on hover, focus, offscreen, hidden tabs and while a stub is being dragged).
  const autoplaying = playing && !reduceMotion && count > 1;
  useEffect(() => {
    if (!autoplaying) return;
    let elapsed = 0;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const h = hold.current;
      if (!h.hover && !h.focus && !h.tearing && h.inView && !document.hidden) elapsed += now - last;
      last = now;
      if (elapsed >= interval * 1000) {
        elapsed = 0;
        setDirection(1);
        setIndex((i) => (i + 1) % count);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [autoplaying, interval, count]);

  // Film grain: one noise tile, jumped to a new offset ~12 times a second; also tracks visibility.
  useEffect(() => {
    const stage = stageRef.current;
    const grain = grainRef.current;
    if (!stage || !grain) return;
    const tile = document.createElement("canvas");
    tile.width = tile.height = 160;
    const g = tile.getContext("2d");
    if (g) {
      const img = g.createImageData(160, 160);
      const r = createRandom("grain");
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.round(r.next() * 255);
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      grain.style.backgroundImage = `url(${tile.toDataURL()})`;
    }
    const io = new IntersectionObserver(([entry]) => {
      hold.current.inView = entry?.isIntersecting ?? true;
    });
    io.observe(stage);
    if (reduceMotion) return () => io.disconnect();
    let raf = 0;
    let lastJump = 0;
    const r = createRandom("grain-offsets");
    const loop = (now: number) => {
      if (hold.current.inView && !document.hidden && now - lastJump > 80) {
        lastJump = now;
        grain.style.backgroundPosition = `${r.int(0, 159)}px ${r.int(0, 159)}px`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [reduceMotion]);

  const tear = (t: FoilTicket) => {
    setTorn((s) => new Set(s).add(t.id));
    onTear?.(t);
  };
  const reset = (t: FoilTicket) =>
    setTorn((s) => {
      const next = new Set(s);
      next.delete(t.id);
      return next;
    });

  // Horizontal wheel (trackpad swipes, shift+wheel) changes tickets; vertical wheel keeps scrolling the page.
  const wheel = useRef({ sum: 0, until: 0 });
  const onWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const w = wheel.current;
    if (performance.now() < w.until) return;
    w.sum += e.deltaX;
    if (Math.abs(w.sum) > 40) {
      go(w.sum > 0 ? 1 : -1, true);
      w.sum = 0;
      w.until = performance.now() + 450;
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      go(e.key === "ArrowRight" ? 1 : -1, true);
    }
  };

  const enter = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.94, rotate: -2 };
  const exit = (dir: number) => (reduceMotion ? { opacity: 0, zIndex: 2 } : { opacity: 0, x: `${-dir * 58}%`, y: -34, rotate: -4 - dir * 12, scale: 1.02, zIndex: 2, transition: { duration: 0.34, ease: [0.5, 0, 0.75, 0] as const } });

  return (
    <section
      ref={stageRef}
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={onKeyDown}
      onWheel={onWheel}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") hold.current.hover = true;
      }}
      onPointerLeave={() => (hold.current.hover = false)}
      onFocus={() => (hold.current.focus = true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hold.current.focus = false;
      }}
      className={cn("relative isolate flex w-full flex-col items-center overflow-hidden rounded-3xl bg-[#0b1026] px-5 pt-14 pb-6 text-[#141625]", className)}
      {...props}
    >
      {/* Thin grid and moving film grain. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgb(255_255_255/0.055)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.055)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div ref={grainRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.09] mix-blend-screen" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_40%,rgb(120_110_255/0.16),transparent_60%)]" />

      <div className="relative grid w-full max-w-[40rem] place-items-center [perspective:1100px]" style={{ aspectRatio: "2.35" }}>
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={ticket.id}
            custom={direction}
            role="group"
            aria-roledescription="slide"
            aria-label={`Ticket ${index + 1} of ${count}, ${ticket.title}`}
            className="absolute inset-0"
            initial={enter}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, zIndex: 1 }}
            exit={exit(direction)}
            transition={reduceMotion ? { duration: 0.25 } : { type: "spring", stiffness: 260, damping: 17, mass: 0.9 }}
          >
            <Ticket
              ticket={ticket}
              torn={torn.has(ticket.id)}
              tearable={tearable}
              reduceMotion={!!reduceMotion}
              onTear={() => tear(ticket)}
              onTearing={(v) => (hold.current.tearing = v)}
              onSwipe={(dir) => go(dir, true)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Position: a gradient line that grows to the current ticket. */}
      <div className="mt-10 h-[3px] w-full max-w-[28rem] overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <motion.div
          className="h-full rounded-full bg-[linear-gradient(90deg,#d6dee9,#ffeea0,#b2d4ff,#d6c4ff)]"
          initial={false}
          animate={{ width: `${((index + 1) / count) * 100}%` }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 30 }}
        />
      </div>

      <div className="mt-4 flex items-center gap-2 text-[#e7e9f5]">
        <ReelButton label="Previous ticket" onClick={() => go(-1, true)}>
          <ChevronLeft className="size-4" />
        </ReelButton>
        {count > 1 && !reduceMotion ? (
          <ReelButton label={playing ? "Pause the reel" : "Play the reel"} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </ReelButton>
        ) : null}
        <span className="min-w-14 text-center font-mono text-[12px] tabular-nums text-[#aab0d0]">
          {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>
        <ReelButton label="Next ticket" onClick={() => go(1, true)}>
          <ChevronRight className="size-4" />
        </ReelButton>
        {torn.has(ticket.id) ? (
          <button
            type="button"
            onClick={() => reset(ticket)}
            className="ml-2 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-white/20 px-3.5 text-[13px] font-semibold text-[#e7e9f5] outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#b2d4ff] active:scale-[0.96]"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset stub
          </button>
        ) : null}
      </div>
      <p aria-live={autoplaying && !announce ? "off" : "polite"} className="sr-only" id={`${id}-status`}>
        {`Ticket ${index + 1} of ${count}, ${ticket.title}${torn.has(ticket.id) ? ", admitted" : ""}`}
      </p>
    </section>
  );
}

function ReelButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-10 cursor-pointer place-items-center rounded-full border border-white/15 text-[#e7e9f5] outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#b2d4ff] active:scale-[0.96]"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

interface TicketProps {
  ticket: FoilTicket;
  torn: boolean;
  tearable: boolean;
  reduceMotion: boolean;
  onTear: () => void;
  onTearing: (tearing: boolean) => void;
  onSwipe: (direction: number) => void;
}

/** One ticket: tilt, foil, swipe, and the tearable stub. */
function Ticket({ ticket, torn, tearable, reduceMotion, onTear, onTearing, onSwipe }: TicketProps) {
  const accent = ticket.accent ?? "#ff8a2b";
  const tiltX = useSpring(0, { stiffness: 160, damping: 18 });
  const tiltY = useSpring(0, { stiffness: 160, damping: 18 });
  const drift = useMotionValue(0);
  const pull = useMotionValue(0);
  const [tearing, setTearing] = useState(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const stubDrag = useRef<{ x: number; id: number } | null>(null);

  // A restored stub comes back flush with the body.
  useEffect(() => {
    if (!torn) pull.set(0);
  }, [torn, pull]);

  // Slow foil drift at rest.
  useEffect(() => {
    if (reduceMotion) return;
    const controls = animate(drift, [0, 1, 0], { duration: 9, repeat: Infinity, ease: "easeInOut" });
    return () => controls.stop();
  }, [drift, reduceMotion]);

  const foilX = useTransform(() => 50 + tiltY.get() * 3.4 + (drift.get() - 0.5) * 34);
  const foilY = useTransform(() => 50 - tiltX.get() * 3.4);
  const foilPos = useMotionTemplate`${foilX}% ${foilY}%`;
  const rotateX = useTransform(tiltX, (v) => v);
  const rotateY = useTransform(tiltY, (v) => v);
  const stubX = useTransform(pull, (v) => v * 0.92);
  const stubRotate = useTransform(pull, (v) => v * 0.04);

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduceMotion || e.pointerType !== "mouse") return;
    const box = e.currentTarget.getBoundingClientRect();
    tiltY.set(((e.clientX - box.left) / box.width - 0.5) * 20);
    tiltX.set(-((e.clientY - box.top) / box.height - 0.5) * 20);
  };
  const onLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  const doTear = () => {
    if (torn || !tearable) return;
    onTear();
  };

  const stubDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (torn || !tearable) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    stubDrag.current = { x: e.clientX, id: e.pointerId };
    setTearing(true);
    onTearing(true);
  };
  const stubMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = stubDrag.current;
    if (!d) return;
    // Pulling away from the body (to the right) stretches the perforation; past 70px it gives.
    const dx = Math.max(0, e.clientX - d.x);
    pull.set(dx < 70 ? dx * 0.5 : 35 + (dx - 70));
    if (dx > 70) {
      stubDrag.current = null;
      setTearing(false);
      onTearing(false);
      doTear();
    }
  };
  const stubUp = () => {
    if (!stubDrag.current) return;
    stubDrag.current = null;
    setTearing(false);
    onTearing(false);
    animate(pull, 0, { type: "spring", stiffness: 500, damping: 22 });
  };

  return (
    <motion.div
      className="relative size-full touch-pan-y select-none [transform-style:preserve-3d]"
      style={{ rotateX, rotateY, rotateZ: -4 }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const s = swipe.current;
        swipe.current = null;
        if (!s) return;
        const dx = e.clientX - s.x;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - s.y)) onSwipe(dx < 0 ? 1 : -1);
      }}
    >
      <div className="@container absolute inset-0 flex drop-shadow-[0_24px_30px_rgb(0_0_0/0.45)]">
        {/* Body: serial line and the perforated stamp. */}
        <div
          className="relative flex h-full w-[68%] items-center gap-[4cqi] overflow-hidden rounded-l-[2.4cqi] bg-[#f4efe6] px-[5cqi]"
          style={{ mask: torn ? zigzag("right") : notches("right"), WebkitMask: torn ? zigzag("right") : notches("right") } as CSSProperties}
        >
          <div className="relative aspect-[4/5] h-[78%] shrink-0 bg-white p-[1.6cqi] shadow-[0_1px_2px_rgb(0_0_0/0.15)]" style={{ mask: STAMP_MASK, WebkitMask: STAMP_MASK } as CSSProperties}>
            <div className="size-full overflow-hidden [&>img]:size-full [&>img]:object-cover [&>svg]:size-full">
              {typeof ticket.art === "string" ? (
                // eslint-disable-next-line @next/next/no-img-element -- plain img keeps the component framework-agnostic
                <img src={ticket.art} alt="" />
              ) : (
                ticket.art
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-[2cqi]">
            <p className="font-mono text-[1.9cqi] tracking-[0.18em] uppercase" style={{ color: accent === "#ffc95c" ? "#8a5f00" : "#5b5f7a" }}>
              {ticket.serial ?? `Nº 00${ticket.number} · ${ticket.title}`}
            </p>
            <p
              className="font-display text-[6.4cqi] leading-[0.95] font-bold tracking-[-0.01em] text-[#141625]"
              style={{ textShadow: "0 1px 0 rgb(255 255 255 / 0.85), 0 -1px 0 rgb(0 0 0 / 0.18)" }}
            >
              {ticket.meta[0]?.value ?? ticket.title}
            </p>
            <div className="h-[0.6cqi] w-[16cqi] rounded-full" style={{ background: accent }} />
            <p className="max-w-[30cqi] text-[2.1cqi] leading-snug text-[#5b5f7a]">Admit one. Keep the stub; the fair keeps the rest.</p>
          </div>
          <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70 mix-blend-multiply" style={{ backgroundImage: FOIL, backgroundSize: "260% 260%", backgroundPosition: foilPos }} />
          <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60 mix-blend-soft-light" style={{ backgroundImage: FOIL, backgroundSize: "320% 320%", backgroundPosition: foilPos }} />
          {/* ADMITTED thumps on once the stub is gone. */}
          <AnimatePresence>
            {torn ? (
              <motion.span
                aria-hidden="true"
                className="absolute top-[74%] left-[70%] -translate-x-1/2 -translate-y-1/2 rounded-[0.8cqi] border-[0.6cqi] border-[#d4313f] px-[2cqi] py-[0.6cqi] font-sans text-[4.6cqi] font-black tracking-[0.12em] text-[#d4313f] uppercase mix-blend-multiply"
                initial={reduceMotion ? { opacity: 0, rotate: -12 } : { opacity: 0, scale: 1.9, rotate: -20 }}
                animate={{ opacity: 0.88, scale: 1, rotate: -12 }}
                exit={{ opacity: 0 }}
                transition={reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 520, damping: 18, delay: 0.12 }}
              >
                Admitted
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Stub: dotted tear line, vertical title, number, meta, barcode and registration marks. */}
        <AnimatePresence>
          {!torn ? (
            <motion.div
              key="stub"
              role={tearable ? "button" : undefined}
              tabIndex={tearable ? 0 : undefined}
              aria-label={tearable ? `Tear off the stub of ticket ${ticket.number}` : undefined}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  doTear();
                }
              }}
              onPointerDown={stubDown}
              onPointerMove={stubMove}
              onPointerUp={stubUp}
              onPointerCancel={stubUp}
              className={cn(
                "relative flex h-full w-[32%] gap-[2.4cqi] overflow-hidden rounded-r-[2.4cqi] border-l-[0.45cqi] border-dotted border-[#141625]/35 bg-[#f4efe6] py-[3.6cqi] pr-[3.4cqi] pl-[2.4cqi] outline-none focus-visible:ring-[0.6cqi] focus-visible:ring-[#b2d4ff]",
                tearable && (tearing ? "cursor-grabbing" : "cursor-grab"),
              )}
              style={{ x: stubX, rotate: stubRotate, transformOrigin: "0% 100%", mask: notches("left"), WebkitMask: notches("left") } as unknown as CSSProperties}
              initial={false}
              exit={reduceMotion ? { opacity: 0, transition: { duration: 0.15 } } : { y: "85%", x: "18%", rotate: 22, opacity: 0, transition: { duration: 0.62, ease: [0.55, 0, 0.9, 0.4] } }}
            >
              <span className="w-[1.6cqi] shrink-0 rounded-full" style={{ background: accent }} aria-hidden="true" />
              <p className="font-sans text-[5cqw] leading-none font-black tracking-[0.06em] whitespace-nowrap uppercase [writing-mode:vertical-rl] rotate-180 text-[#141625]" style={{ textShadow: "0 1px 0 rgb(255 255 255 / 0.85), 0 -1px 0 rgb(0 0 0 / 0.18)" }}>
                {ticket.title}
              </p>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="font-display text-[9cqi] leading-[0.9] font-bold tabular-nums">{ticket.number}</p>
                <dl className="mt-auto grid grid-cols-2 gap-x-[2cqi] gap-y-[1cqi] font-mono text-[1.8cqi] leading-tight">
                  {ticket.meta.slice(1).map((m) => (
                    <div key={m.label} className="min-w-0">
                      <dt className="text-[1.5cqi] tracking-[0.14em] text-[#5b5f7a] uppercase">{m.label}</dt>
                      <dd className="truncate font-semibold">{m.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-[2cqi]">
                  <Barcode seed={ticket.id} />
                </div>
              </div>
              <Reg className="top-[2cqi] right-[2cqi]" />
              <Reg className="bottom-[2cqi] left-[4.4cqi]" />
              <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70 mix-blend-multiply" style={{ backgroundImage: FOIL, backgroundSize: "260% 260%", backgroundPosition: foilPos }} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
