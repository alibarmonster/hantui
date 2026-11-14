"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { AnimatePresence, animate, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { RotateCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { duration, ease, spring } from "@/lib/motion";
import { runCanvasLoop, type CanvasLoop } from "@/lib/glyph/canvas-loop";
import { blitPixelBuffer, createPixelBuffer, type PixelBuffer } from "@/lib/pixel-art/sprites";

export interface BurstPackCard {
  /** Stable id. */
  id: string;
  /** Card name, shown at the bottom of the card and on its back. */
  name: string;
  /** Full-bleed art: a React node (SVG works best) or an image URL. */
  art: ReactNode | string;
  /** Short stat line under the name, such as "Bounce 7". */
  stat?: string;
  /** Text on the back of the card. */
  description?: string;
  /** "holo" adds a holographic foil that follows the pointer. @default "common" */
  rarity?: "common" | "holo";
  /** Background behind the art, as any CSS background. */
  ground?: string;
}

export interface BurstPack {
  /** Stable id. */
  id: string;
  /** Series name, used on the pack and in its accessible name ("Open pack: Cobalt series"). */
  label: string;
  /** Pack color, as any CSS color. */
  color: string;
  /** Emblem in the middle of the pack. @default a silver four-point star */
  emblem?: ReactNode;
  /** Cards inside. Five fill the row. */
  cards: BurstPackCard[];
}

export interface BurstPackOpeningProps extends Omit<ComponentProps<"div">, "children"> {
  /** Packs to open, in order. After the last one the first comes around again. */
  packs: BurstPack[];
  /** Controlled index of the pack on stage. */
  activePack?: number;
  /** Index of the first pack when uncontrolled. @default 0 */
  defaultActivePack?: number;
  /** Called when the next pack drops in. */
  onActivePackChange?: (index: number) => void;
  /** Called when a pack is torn open, with its cards in the order they landed. */
  onOpen?: (pack: BurstPack, cards: BurstPackCard[]) => void;
  /** Called when a revealed card is opened. */
  onCardSelect?: (card: BurstPackCard) => void;
  /** Seed for the card order, landing angles and confetti, so every visitor sees the same opening. @default 229 */
  seed?: number;
  /** Fire the pixel rays and confetti. @default true */
  burst?: boolean;
  /** Small brand text on the pack's label. @default "Series" */
  brandLabel?: string;
}

const PACK_W = 120;
const PACK_H = 168;
const STAGE_H = 400;
const ROW_TOP = 52;
const PACK_TOP = 112;
/** One burst pixel is this many CSS pixels. */
const PIXEL = 4;
const RAINBOW = ["#ff3b3b", "#ff8a1f", "#ffd426", "#35d04f", "#22b8f0", "#4b5bf0", "#a54bf0"];
const CONFETTI = 90;

/** A small seeded generator (mulberry32). */
function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const ZIGZAG_TOP = `polygon(${Array.from({ length: 13 }, (_, i) => `${(i / 12) * 100}% ${i % 2 ? 0 : 5}px`).join(",")},100% 100%,0 100%)`;
const ZIGZAG_BOTTOM = `polygon(0 0,100% 0,${Array.from({ length: 13 }, (_, i) => `${100 - (i / 12) * 100}% calc(100% - ${i % 2 ? 0 : 5}px)`).join(",")})`;

function StarEmblem() {
  return (
    <svg viewBox="0 0 48 48" className="size-12 drop-shadow-[0_1px_0_rgb(255_255_255/0.6)]" aria-hidden="true">
      <defs>
        <linearGradient id="bpo-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#c9ced8" />
          <stop offset="1" stopColor="#8f97a8" />
        </linearGradient>
      </defs>
      <path d="M24 2c2.4 12.6 7.4 17.6 20 20-12.6 2.4-17.6 7.4-20 20-2.4-12.6-7.4-17.6-20-20 12.6-2.4 17.6-7.4 20-20z" fill="url(#bpo-silver)" stroke="rgb(0 0 0 / 0.25)" strokeWidth="1" />
    </svg>
  );
}

const FOIL = "linear-gradient(115deg,transparent 20%,rgb(255 255 255/0.55) 38%,rgb(125 211 252/0.5) 46%,rgb(192 132 252/0.5) 54%,rgb(253 230 138/0.5) 62%,transparent 80%)";

interface FaceProps {
  card: BurstPackCard;
  className?: string;
  children?: ReactNode;
}

/** The front of a card: art, name and stat line. */
function CardFace({ card, className, children }: FaceProps) {
  return (
    <span className={cn("absolute inset-0 block overflow-hidden rounded-[10%/7%] border-[3px] border-white bg-zinc-100 shadow-[0_1px_2px_rgb(0_0_0/0.12),0_10px_22px_-10px_rgb(0_0_0/0.35)]", className)} style={{ background: card.ground }}>
      {typeof card.art === "string" ? (
        <span aria-hidden="true" style={{ backgroundImage: `url(${JSON.stringify(card.art)})` }} className="absolute inset-0 bg-cover bg-center" />
      ) : (
        <span aria-hidden="true" className="absolute inset-0 [&>svg]:size-full">
          {card.art}
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgb(0_0_0/0.72),transparent)] px-[8%] pt-[18%] pb-[6%] text-left text-white">
        <span className="block truncate text-[0.72em] leading-tight font-semibold">{card.name}</span>
        {card.stat ? <span className="block truncate font-mono text-[0.56em] leading-tight opacity-90">{card.stat}</span> : null}
      </span>
      {children}
    </span>
  );
}

interface RevealedCardProps {
  card: BurstPackCard;
  slot: number;
  count: number;
  tilt: number;
  fly: boolean;
  onSelect: (trigger: HTMLElement) => void;
}

function RevealedCard({ card, slot, count, tilt, fly, onSelect }: RevealedCardProps) {
  const reduceMotion = useReducedMotion();
  const rotateX = useSpring(0, { stiffness: 260, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 260, damping: 20 });
  const lift = useSpring(0, { stiffness: 300, damping: 22 });
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgb(255 255 255 / 0.55), transparent 55%)`;
  const foilPosition = useTransform(glareX, (v) => `${v}% 50%`);

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "touch" || reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    rotateY.set((x - 0.5) * 16);
    rotateX.set((0.5 - y) * 16);
    lift.set(-8);
    glareX.set(x * 100);
    glareY.set(y * 100);
  }
  function onPointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
    lift.set(0);
  }

  // Each card starts at the pack's mouth and arcs up to its slot.
  const fromCenter = (slot - (count - 1) / 2) * -1;
  const flight = fly
    ? { x: [`${fromCenter * 86}%`, `${fromCenter * 40}%`, "0%"], y: ["70%", "-55%", "0%"], scale: [0.35, 0.9, 1], rotate: [tilt * 14, tilt * -5, tilt], opacity: [0, 1, 1] }
    : { opacity: 1, x: "0%", y: "0%", scale: 1, rotate: tilt };

  return (
    <motion.li
      initial={fly ? { opacity: 0 } : { opacity: 0, rotate: tilt }}
      animate={flight}
      exit={reduceMotion ? { opacity: 0 } : { x: `${fromCenter * 86 + 260}%`, opacity: 0, rotate: 0, transition: { duration: duration.slow, ease: ease.inOut, delay: 0.02 * slot } }}
      transition={fly ? { duration: 0.62, delay: 0.12 + slot * 0.07, times: [0, 0.55, 1], ease: ease.out } : { duration: duration.base }}
      style={{ zIndex: slot }}
      className="relative -ml-2.5 aspect-[5/7] w-[21%] max-w-[104px] min-w-[72px] shrink-0 text-[15px] [perspective:600px] first:ml-0 @max-[26rem]:-ml-1.5 @max-[26rem]:w-[30%]"
    >
      <motion.button
        type="button"
        aria-label={`${card.name}${card.rarity === "holo" ? ", holo" : ""}. Open card`}
        onClick={(event) => onSelect(event.currentTarget)}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{ rotateX, rotateY, y: lift }}
        className="absolute inset-0 cursor-pointer rounded-[10%/7%] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <CardFace card={card}>
          {card.rarity === "holo" ? <motion.span aria-hidden="true" style={{ backgroundImage: FOIL, backgroundSize: "260% 100%", backgroundPosition: foilPosition }} className="absolute inset-0 mix-blend-overlay" /> : null}
          <motion.span aria-hidden="true" style={{ background: glare }} className="absolute inset-0 opacity-0 transition-opacity duration-200 [button:hover_&]:opacity-60" />
        </CardFace>
      </motion.button>
    </motion.li>
  );
}

export function BurstPackOpening({
  packs,
  activePack,
  defaultActivePack = 0,
  onActivePackChange,
  onOpen,
  onCardSelect,
  seed = 229,
  burst = true,
  brandLabel = "Series",
  className,
  ...props
}: BurstPackOpeningProps) {
  const reduceMotion = useReducedMotion();
  const [internal, setInternal] = useState(defaultActivePack);
  const index = packs.length ? ((((activePack ?? internal) % packs.length) + packs.length) % packs.length) : 0;
  const pack = packs[index];
  /** How many packs have been opened, so a pack that comes around again deals a new order. */
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"sealed" | "opening" | "revealed" | "sweeping">("sealed");
  const [selected, setSelected] = useState<BurstPackCard | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const packRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const fire = useRef<() => void>(() => {});
  const drag = useRef<{ x: number; fromRight: boolean; moved: boolean } | null>(null);
  const timers = useRef<number[]>([]);
  const focusPack = useRef(false);
  /** The card button that opened the dialog, so focus can go back to it. */
  const opener = useRef<HTMLElement | null>(null);

  /** 0 sealed, 1 torn all the way across. */
  const tear = useMotionValue(0);
  const [fromRight, setFromRight] = useState(false);
  const stripClip = useTransform(tear, (v) => (fromRight ? `inset(0 ${v * 100}% 0 0)` : `inset(0 0 0 ${v * 100}%)`));
  const curlX = useTransform(tear, (v) => (fromRight ? (1 - v) * PACK_W - 10 : v * PACK_W - 4));
  const curlOpacity = useTransform(tear, [0, 0.04, 0.96, 1], [0, 1, 1, 0]);
  const shake = useMotionValue(0);

  // The deal: card order and landing angles for this pack, from the seed.
  const deal = useMemo(() => {
    if (!pack) return [];
    const random = seededRandom(seed + index * 101 + round * 7919);
    return shuffled(pack.cards, random).map((card) => ({ card, tilt: (random() - 0.5) * 6 }));
  }, [pack, seed, index, round]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // Rays and confetti: one low-res canvas, one loop that runs only while something is on it.
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!stage || !canvas || !ctx) return;
    let buffer: PixelBuffer | null = null;
    let started = -1;
    let clock = 0;
    const cx = new Float32Array(CONFETTI);
    const cy = new Float32Array(CONFETTI);
    const cvx = new Float32Array(CONFETTI);
    const cvy = new Float32Array(CONFETTI);
    const cColor = new Uint8Array(CONFETTI);
    const cRest = new Float32Array(CONFETTI);
    let shots = 0;

    const loop: CanvasLoop = runCanvasLoop({
      host: stage,
      canvas,
      isPaused: () => started < 0,
      resize: (frame) => {
        buffer = createPixelBuffer(Math.ceil(frame.width / PIXEL), Math.ceil(frame.height / PIXEL));
      },
      render: (frame) => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!buffer || started < 0 || frame.still) return;
        clock += frame.dt;
        const t = clock - started;
        const b = buffer.ctx;
        b.clearRect(0, 0, buffer.width, buffer.height);
        const mouthX = buffer.width / 2;
        const mouthY = (PACK_TOP + 10) / PIXEL;
        const floor = (ROW_TOP + 150) / PIXEL;

        // Rays: hard-edged wedges, banded red to violet outward, that expand, hold and break into pixels.
        if (t < 1.05) {
          const reach = Math.min(1, t / 0.4) * (buffer.height * 0.62);
          const breakUp = Math.max(0, (t - 0.62) / 0.4);
          const top = Math.max(0, Math.floor(mouthY - reach));
          for (let band = 0; band < RAINBOW.length; band++) {
            b.fillStyle = RAINBOW[band];
            for (let y = top; y < mouthY; y++) {
              for (let x = Math.max(0, Math.floor(mouthX - reach)); x < Math.min(buffer.width, mouthX + reach); x++) {
                const dx = x - mouthX;
                const dy = mouthY - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > reach || distance < 2) continue;
                if (Math.floor(distance / 5) % RAINBOW.length !== band) continue;
                // Eleven wedges across a 150° fan, with a gap between each.
                const angle = Math.atan2(dy, dx);
                if (angle < 0.26 || angle > 2.88) continue;
                if (Math.floor(((angle - 0.26) / 2.62) * 21) % 2) continue;
                // An ordered threshold per pixel, so the fan dissolves in a pixel pattern.
                if (breakUp > 0 && ((x * 7 + y * 13) % 16) / 16 < breakUp) continue;
                b.fillRect(x, y, 1, 1);
              }
            }
          }
        }

        // Confetti: square pixels under gravity that settle on a floor below the row, then fade.
        let alive = false;
        for (let band = 0; band < RAINBOW.length; band++) {
          b.fillStyle = RAINBOW[band];
          for (let i = 0; i < CONFETTI; i++) {
            if (cColor[i] !== band) continue;
            if (cRest[i] > 1.1) continue;
            alive = true;
            if (cRest[i] === 0) {
              cvy[i] += 150 * frame.dt;
              cx[i] += cvx[i] * frame.dt;
              cy[i] += cvy[i] * frame.dt;
              if (cy[i] >= floor && cvy[i] > 0) {
                cy[i] = floor;
                cRest[i] = 0.001;
              }
            } else {
              cRest[i] += frame.dt;
            }
            // Fading is a pixel flicker, not an alpha ramp, to stay hard-edged.
            if (cRest[i] > 0.5 && (i + Math.floor(cRest[i] * 20)) % 3 === 0) continue;
            b.fillRect(Math.round(cx[i]), Math.round(cy[i]), 2, 2);
          }
        }

        blitPixelBuffer(ctx, buffer, canvas.width, canvas.height, { scale: canvas.width / buffer.width, alignX: 0.5, alignY: 0 });
        if (!alive && t > 1.05) {
          started = -1;
          loop.wake();
        }
      },
    });

    fire.current = () => {
      if (!buffer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const random = seededRandom(seed + 31 * ++shots);
      const mouthX = buffer.width / 2;
      const mouthY = (PACK_TOP + 10) / PIXEL;
      for (let i = 0; i < CONFETTI; i++) {
        const angle = 0.3 + random() * 2.54;
        const speed = 40 + random() * 70;
        cx[i] = mouthX + (random() - 0.5) * 8;
        cy[i] = mouthY;
        cvx[i] = Math.cos(angle) * speed;
        cvy[i] = -Math.sin(angle) * speed;
        cColor[i] = Math.floor(random() * RAINBOW.length);
        cRest[i] = 0;
      }
      started = clock;
      loop.wake();
    };

    return () => {
      fire.current = () => {};
      loop.dispose();
    };
  }, [seed]);

  function open() {
    if (phase !== "sealed" || !pack) return;
    setPhase("opening");
    const finish = () => {
      // Two or three frames of shake, then the pack gives.
      if (!reduceMotion) animate(shake, [0, -3, 3, -2, 0], { duration: 0.16 });
      later(
        () => {
          if (burst) fire.current();
          setPhase("revealed");
          setAnnouncement(`${deal.length} cards revealed: ${deal.map((entry) => entry.card.name).join(", ")}`);
          onOpen?.(pack, deal.map((entry) => entry.card));
        },
        reduceMotion ? 0 : 170,
      );
    };
    if (reduceMotion) {
      tear.jump(1);
      finish();
    } else {
      animate(tear, 1, { duration: Math.max(0.12, 0.5 * (1 - tear.get())), ease: ease.out, onComplete: finish });
    }
  }

  function onPackPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (phase !== "sealed" || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const right = event.clientX - rect.left > rect.width / 2;
    drag.current = { x: event.clientX, fromRight: right, moved: false };
    setFromRight(right);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPackPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    if (!state || phase !== "sealed") return;
    const travelled = (event.clientX - state.x) * (state.fromRight ? -1 : 1);
    if (travelled > 6) state.moved = true;
    if (state.moved) tear.set(Math.min(1, Math.max(0, travelled / (PACK_W * 0.9))));
  }
  function onPackPointerUp() {
    const state = drag.current;
    drag.current = null;
    if (!state?.moved || phase !== "sealed") return;
    // Past halfway the tear finishes by itself; otherwise the strip settles back.
    if (tear.get() > 0.5) open();
    else animate(tear, 0, spring.snappy);
  }

  function nextPack() {
    if (phase !== "revealed") return;
    setSelected(null);
    setPhase("sweeping");
  }
  function afterSweep() {
    if (phase !== "sweeping") return;
    const next = (index + 1) % packs.length;
    tear.jump(0);
    setRound((n) => n + 1);
    if (activePack === undefined) setInternal(next);
    onActivePackChange?.(next);
    focusPack.current = true;
    setPhase("sealed");
  }
  useEffect(() => {
    if (phase === "sealed" && focusPack.current) {
      focusPack.current = false;
      packRef.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  function select(card: BurstPackCard, trigger: HTMLElement) {
    opener.current = trigger;
    setFlipped(false);
    setSelected(card);
    onCardSelect?.(card);
    // The enlarged card turns over to its back a beat after it opens.
    later(() => setFlipped(true), reduceMotion ? 0 : 420);
  }

  if (!pack) return null;
  const sealed = phase === "sealed" || phase === "opening";
  const flying = !reduceMotion;

  return (
    <div className={cn("@container relative w-full", className)} {...props}>
      <div ref={stageRef} style={{ height: STAGE_H }} className="relative mx-auto w-full max-w-[560px] overflow-hidden">
        {/* The pack: a foil pouch with crimped seams that bobs over its shadow. */}
        <AnimatePresence>
          {sealed ? (
            <motion.div
              key={`pack-${index}-${round}`}
              style={{ top: PACK_TOP, width: PACK_W, height: PACK_H, marginLeft: -PACK_W / 2, "--pack": pack.color } as CSSProperties & Record<"--pack", string>}
              initial={reduceMotion ? { opacity: 0 } : { y: -PACK_TOP - PACK_H - 20, opacity: 1, rotate: -6 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { y: 90, opacity: 0, rotate: 5, transition: { duration: duration.slow, ease: ease.inOut } }}
              transition={reduceMotion ? { duration: duration.base } : spring.bouncy}
              className="absolute left-1/2 z-10"
            >
              <motion.span
                aria-hidden="true"
                animate={reduceMotion ? undefined : { scaleX: [1, 0.86, 1], opacity: [0.32, 0.22, 0.32] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-5 left-1/2 -ml-12 h-3 w-24 rounded-[50%] bg-black blur-[5px]"
              />
              <motion.div animate={reduceMotion ? undefined : { y: [0, -3, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="size-full">
                <motion.button
                  ref={packRef}
                  type="button"
                  aria-label={`Open pack: ${pack.label} series`}
                  disabled={phase !== "sealed"}
                  onClick={() => {
                    if (tear.get() < 0.02) open();
                  }}
                  onPointerDown={onPackPointerDown}
                  onPointerMove={onPackPointerMove}
                  onPointerUp={onPackPointerUp}
                  onPointerCancel={onPackPointerUp}
                  style={{ x: shake }}
                  className="group/pack relative size-full cursor-pointer touch-none outline-none select-none focus-visible:[filter:drop-shadow(2px_0_0_var(--ring))_drop-shadow(-2px_0_0_var(--ring))_drop-shadow(0_2px_0_var(--ring))_drop-shadow(0_-2px_0_var(--ring))]"
                >
                  {/* Body, with the dark mouth that shows once the strip is gone. */}
                  <span className="absolute inset-x-0 top-[14px] bottom-0 overflow-hidden bg-(--pack) shadow-[inset_0_0_0_1px_rgb(255_255_255/0.25)]" style={{ clipPath: ZIGZAG_BOTTOM }}>
                    <span className="absolute inset-0 bg-[linear-gradient(100deg,rgb(255_255_255/0.28),transparent_30%,rgb(0_0_0/0.12)_62%,rgb(255_255_255/0.2))]" />
                    <span className="absolute inset-x-0 top-0 h-2 bg-black/55" />
                    <motion.span
                      aria-hidden="true"
                      animate={reduceMotion ? undefined : { x: ["-160%", "260%"] }}
                      transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
                      className="absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.45),transparent)]"
                    />
                    <span className="absolute top-5 left-2.5 rounded-[3px] bg-white/90 px-1.5 py-0.5 text-[8px] leading-none font-bold tracking-[0.08em] text-black uppercase">{brandLabel}</span>
                    <span className="absolute inset-0 grid place-items-center">{pack.emblem ?? <StarEmblem />}</span>
                    <span className="absolute inset-x-0 bottom-4 text-center text-[10px] font-semibold tracking-[0.14em] text-white uppercase [text-shadow:0_1px_1px_rgb(0_0_0/0.35)]">{pack.label}</span>
                  </span>
                  {/* The tear strip: its attached part is clipped away as the tear travels. */}
                  <motion.span aria-hidden="true" style={{ clipPath: stripClip }} className="absolute inset-x-0 top-0 block h-[22px]">
                    <span className="absolute inset-0 bg-(--pack) brightness-110" style={{ clipPath: ZIGZAG_TOP }}>
                      <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.22)_0_2px,transparent_2px_5px)]" />
                    </span>
                  </motion.span>
                  <motion.span aria-hidden="true" style={{ x: curlX, opacity: curlOpacity }} className="absolute -top-2 left-0 block h-7 w-3.5 rotate-[24deg] rounded-[3px] bg-[linear-gradient(90deg,rgb(255_255_255/0.95),var(--pack))] shadow-[0_2px_4px_rgb(0_0_0/0.3)]" />
                </motion.button>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 size-full [image-rendering:pixelated]" />

        {/* The row: cards land one by one, slightly turned and overlapping. */}
        <AnimatePresence onExitComplete={afterSweep}>
          {phase === "revealed" ? (
            <motion.ul key={`row-${index}-${round}`} exit={{ opacity: 1 }} style={{ top: ROW_TOP }} className="absolute inset-x-0 z-30 flex flex-wrap justify-center gap-y-2 px-2">
              {deal.map((entry, slot) => (
                <RevealedCard key={entry.card.id} card={entry.card} slot={slot} count={deal.length} tilt={entry.tilt} fly={flying} onSelect={(trigger) => select(entry.card, trigger)} />
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "revealed" ? (
            <motion.div
              key="next"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: reduceMotion ? 0.2 : 0.12 + deal.length * 0.07 + 0.62 + 0.6, duration: duration.base, ease: ease.out } }}
              exit={{ opacity: 0, transition: { duration: duration.quick } }}
              className="absolute inset-x-0 bottom-6 z-30 flex justify-center"
            >
              <button
                ref={nextRef}
                type="button"
                onClick={nextPack}
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-md outline-none transition-transform duration-150 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <RotateCw aria-hidden="true" className="size-4" strokeWidth={2.25} />
                Open another
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>

      <Dialog.Root open={selected !== null} onOpenChange={(next) => !next && setSelected(null)}>
        <AnimatePresence>
          {selected ? (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild forceMount>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: duration.quick }} className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]" />
              </Dialog.Overlay>
              <Dialog.Content
                asChild
                forceMount
                aria-describedby={undefined}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  opener.current?.focus({ preventScroll: true });
                }}
              >
                <motion.div
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                  transition={reduceMotion ? { duration: duration.quick } : spring.smooth}
                  className="fixed inset-0 z-50 m-auto flex h-fit w-[min(240px,70vw)] flex-col items-center gap-4 outline-none"
                >
                  <Dialog.Title className="sr-only">{selected.name}</Dialog.Title>
                  <div className="aspect-[5/7] w-full text-[34px] [perspective:900px]">
                    <motion.div
                      animate={{ rotateY: flipped ? 180 : 0 }}
                      transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: ease.inOut }}
                      className="relative size-full [transform-style:preserve-3d]"
                    >
                      <CardFace card={selected} className="[backface-visibility:hidden]">
                        {selected.rarity === "holo" ? <span aria-hidden="true" style={{ backgroundImage: FOIL, backgroundSize: "260% 100%", backgroundPosition: "35% 50%" }} className="absolute inset-0 mix-blend-overlay" /> : null}
                      </CardFace>
                      <div className="absolute inset-0 flex [transform:rotateY(180deg)] flex-col rounded-[10%/7%] border-[3px] border-white bg-zinc-900 p-5 text-left text-base text-white [backface-visibility:hidden]">
                        <p className="font-mono text-[10px] tracking-[0.14em] text-white/70 uppercase">{selected.rarity === "holo" ? "Holo" : "Common"}</p>
                        <p className="mt-2 text-xl font-semibold tracking-tight">{selected.name}</p>
                        {selected.stat ? <p className="mt-1 font-mono text-xs text-white/80">{selected.stat}</p> : null}
                        {selected.description ? <p className="mt-4 text-sm leading-5 text-white/90">{selected.description}</p> : null}
                        <p className="mt-auto font-mono text-[10px] tracking-[0.14em] text-white/70 uppercase">{pack.label} series</p>
                      </div>
                    </motion.div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFlipped((value) => !value)}
                      className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                      <RotateCw aria-hidden="true" className="size-4" />
                      Flip card
                    </button>
                    <Dialog.Close className="grid size-10 cursor-pointer place-items-center rounded-full bg-white/15 text-white outline-none hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white" aria-label="Close">
                      <X aria-hidden="true" className="size-4" />
                    </Dialog.Close>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          ) : null}
        </AnimatePresence>
      </Dialog.Root>
    </div>
  );
}
