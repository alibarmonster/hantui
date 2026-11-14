"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { createRandom } from "@/lib/random";

export type CoinMood = "happy" | "grin" | "wink" | "sleepy" | "squint" | "surprised" | "meh" | "sad" | "cool" | "shy";

export interface CoinAgent {
  /** Flat face color; the rim is a darker shade of it. */
  color: string;
  /** The face it starts with. */
  mood: CoinMood;
}

export interface CoinCrewHeroProps extends Omit<ComponentProps<"section">, "title" | "children"> {
  /** Headline, top left. @default "Meet your new team" */
  title?: ReactNode;
  /** Two-line description under the headline. */
  description?: ReactNode;
  /** The black pill call to action. Pass `href` for a link or `onClick` for a button. @default { label: "Hire the crew", href: "#" } */
  cta?: { label: string; href?: string; onClick?: () => void };
  /** The coins in the parade, in order. @default a seeded crew drawn from `palette` */
  agents?: CoinAgent[];
  /** Colors for the default crew. @default eight bright flats */
  palette?: string[];
  /** Conveyor speed multiplier. @default 1 */
  speed?: number;
  /** Seed for the default crew, blinks and new moods. @default "crew" */
  seed?: string | number;
  /** Called when a coin is poked (clicked, tapped or via the "Poke a coin" button). */
  onPoke?: (agent: CoinAgent, index: number) => void;
}

const MOODS: CoinMood[] = ["happy", "grin", "wink", "sleepy", "squint", "surprised", "meh", "sad", "cool", "shy"];
const PALETTE = ["#ff6b4a", "#ffc53d", "#3ec486", "#3e8bff", "#a77bff", "#ff7eb6", "#20c4d6", "#ff9f1c"];
/** Coins on the belt at once. */
const SLOTS = 8;
/** Stacked layers that make the rim. */
const RIM = 8;
const INK = "#1c1917";

/** The face, drawn in a -50…50 box. The eyes group is moved and blinked by the loop. */
function Face({ mood }: { mood: CoinMood }) {
  const eyes = (() => {
    switch (mood) {
      case "grin":
        return <path d="M-19 2q5-8 10 0M9 2q5-8 10 0" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />;
      case "wink":
        return (
          <>
            <circle cx="-13" cy="0" r="5" fill={INK} />
            <path d="M8 2q5-7 10 0" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        );
      case "sleepy":
        return <path d="M-19 0q6 5 12 0M7 0q6 5 12 0" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />;
      case "squint":
        return <path d="M-19-5l9 5-9 5M19-5l-9 5 9 5" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
      case "surprised":
        return (
          <>
            <ellipse cx="-13" cy="0" rx="5" ry="7.5" fill={INK} />
            <ellipse cx="13" cy="0" rx="5" ry="7.5" fill={INK} />
          </>
        );
      case "cool":
        return <path d="M-24-5h48v4q0 9-10 9h-6q-6 0-8-6-2 6-8 6h-6q-10 0-10-9z" fill={INK} />;
      default:
        return (
          <>
            <circle cx="-13" cy={mood === "sad" ? 2 : 0} r="5" fill={INK} />
            <circle cx="13" cy={mood === "sad" ? 2 : 0} r="5" fill={INK} />
          </>
        );
    }
  })();
  const mouth = (() => {
    switch (mood) {
      case "grin":
      case "squint":
        return <path d="M-14 12h28q0 15-14 15t-14-15z" fill={INK} />;
      case "sleepy":
      case "shy":
        return <path d="M-5 17q5 4 10 0" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />;
      case "surprised":
        return <ellipse cx="0" cy="19" rx="5.5" ry="7" fill={INK} />;
      case "meh":
        return <path d="M-9 18h18" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
      case "sad":
        return <path d="M-10 22q10-9 20 0" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />;
      case "cool":
        return <path d="M-8 18q9 5 16-3" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />;
      default:
        return <path d="M-12 14q12 12 24 0" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />;
    }
  })();
  const blush = mood === "happy" || mood === "shy" || mood === "grin";
  return (
    <svg viewBox="-50 -50 100 100" className="absolute inset-0 size-full" aria-hidden="true">
      <circle r="44" fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="3" />
      <path d="M-30-22a38 38 0 0118-14" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" fill="none" />
      <g transform="translate(0 -6)">
        <g data-eyes="">{eyes}</g>
      </g>
      {blush ? (
        <>
          <ellipse cx="-24" cy="12" rx="6" ry="3.5" fill="#ff5e8a" opacity="0.45" />
          <ellipse cx="24" cy="12" rx="6" ry="3.5" fill="#ff5e8a" opacity="0.45" />
        </>
      ) : null}
      {mouth}
    </svg>
  );
}

const shade = (hex: string, k: number) => {
  const n = Number.parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k));
  return `rgb(${c.join(",")})`;
};

type Mode = "line" | "held" | "flung" | "return";

interface CoinState {
  agent: number;
  mode: Mode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  since: number;
  flip: number;
  flipMood: CoinMood | null;
  wobble: number;
  wobbleV: number;
  blinkAt: number;
  /** When the current fling or return started, in seconds. */
  t0: number;
  from: { x: number; y: number; angle: number };
}

/**
 * A hero card for a fictional agent product with a diagonal parade of chunky coin characters rolling
 * up and out of the card. Coins near the bottom are larger; toward the top they shrink and tilt to
 * show more rim. The line moves like a conveyor, each coin bobbing as it rolls; they blink and their
 * eyes follow the pointer. Hover squishes a coin, a poke flips it over to a new mood and bumps its
 * neighbors, and a coin can be dragged out of the line and flung: it tumbles off the card's edges and
 * rejoins the line at its gap.
 *
 * The parade is decorative (aria-hidden); the headline, description and CTA are the content, and a
 * visually hidden "Poke a coin" button lets keyboard users poke one too. One rAF loop writes every
 * transform. Reduced motion: a still diagonal, and a poke only swaps the face.
 */
export function CoinCrewHero({
  title = "Meet your new team",
  description = (
    <>
      Eight small agents that file, follow up and tidy up.
      <br />
      They never sleep, but they do blink.
    </>
  ),
  cta = { label: "Hire the crew", href: "#" },
  agents,
  palette = PALETTE,
  speed = 1,
  seed = "crew",
  onPoke,
  className,
  ...props
}: CoinCrewHeroProps) {
  const reduceMotion = useReducedMotion();
  const crew: CoinAgent[] =
    agents ??
    (() => {
      const r = createRandom(`${seed}:crew`);
      return Array.from({ length: 12 }, (_, i) => ({ color: palette[i % palette.length], mood: r.pick(MOODS) }));
    })();
  const crewKey = JSON.stringify(crew);
  // Which agent sits in each slot, and the face each slot shows right now.
  const [slots, setSlots] = useState(() => Array.from({ length: SLOTS }, (_, i) => ({ agent: i % crew.length, mood: crew[i % crew.length].mood })));
  const cardRef = useRef<HTMLElement>(null);
  const coinRefs = useRef<(HTMLDivElement | null)[]>([]);
  const engine = useRef<{ poke: (slot: number) => void } | null>(null);
  const live = useRef({ speed, onPoke, crew, reduceMotion, slots });
  useEffect(() => {
    live.current = { speed, onPoke, crew, reduceMotion, slots };
  });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const rng = createRandom(`${seed}:life`);
    let width = 1;
    let height = 1;
    let base = 100;
    let belt = 0;
    let raf = 0;
    let last = 0;
    let clock = 0;
    let inView = true;
    const pointer = { x: -1e4, y: -1e4, inside: false };
    const state: CoinState[] = Array.from({ length: SLOTS }, (_, i) => ({
      agent: i % live.current.crew.length,
      mode: "line" as Mode,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      spin: 0,
      since: 0,
      flip: -1,
      flipMood: null,
      wobble: 0,
      wobbleV: 0,
      blinkAt: rng.range(1, 6),
      t0: 0,
      from: { x: 0, y: 0, angle: 0 },
    }));
    let drag: { slot: number; dx: number; dy: number; lastX: number; lastY: number; lastT: number; vx: number; vy: number; moved: boolean; startX: number; startY: number } | null = null;

    /** Where slot i sits on the belt: position along the diagonal, size and tilt. */
    const place = (i: number) => {
      const s = (((i + belt) / SLOTS) % 1 + 1) % 1;
      const x = width * (0.36 + s * 0.8);
      const y = height * (1.14 - s * 1.34);
      const size = base * (1.15 - s * 0.62);
      return { s, x, y, size };
    };

    const measure = () => {
      width = card.clientWidth;
      height = card.clientHeight;
      base = Math.max(64, Math.min(200, Math.min(width * 0.235, height * 0.42)));
      card.style.setProperty("--coin", `${base}px`);
    };

    const setMood = (slot: number, mood: CoinMood) => setSlots((list) => list.map((s, i) => (i === slot ? { ...s, mood } : s)));

    const poke = (slot: number) => {
      const c = state[slot];
      const current = live.current.slots[slot]?.mood ?? "happy";
      const next = MOODS[(MOODS.indexOf(current) + 1 + rng.int(0, MOODS.length - 2)) % MOODS.length];
      const { crew: list, onPoke: cb, reduceMotion: still } = live.current;
      cb?.(list[c.agent % list.length], slot);
      if (still) {
        setMood(slot, next);
        return;
      }
      c.flip = 0;
      c.flipMood = next;
      // Neighbors on the belt get a nudge.
      for (const n of [slot - 1, slot + 1]) {
        const o = state[(n + SLOTS) % SLOTS];
        if (o) o.wobbleV += n < slot ? -6 : 6;
      }
      wake();
    };
    engine.current = { poke };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const still = live.current.reduceMotion;
      if (!still) {
        clock += dt;
        belt += dt * 0.085 * live.current.speed;
      }
      const order: { i: number; s: number }[] = [];
      for (let i = 0; i < SLOTS; i++) {
        const el = coinRefs.current[i];
        const c = state[i];
        if (!el) continue;
        const p = place(i);
        // A coin that left the top re-enters at the bottom as the next agent in the crew.
        if (!still && c.mode === "line" && p.s < 0.02 && c.since > 1) {
          const list = live.current.crew;
          c.agent = (c.agent + SLOTS) % list.length;
          setSlots((cur) => cur.map((s, k) => (k === i ? { agent: c.agent, mood: list[c.agent].mood } : s)));
          c.since = 0;
        }
        c.since += dt;
        const bob = still ? 0 : Math.sin(clock * 3.1 + i * 1.7) * base * 0.025;
        const roll = still ? 0 : Math.sin(clock * 1.6 + i) * 6;
        // Neighbor wobble: a damped spring on a small angle.
        c.wobbleV += (-c.wobble * 90 - c.wobbleV * 9) * dt;
        c.wobble += c.wobbleV * dt;

        let x = p.x;
        let y = p.y + bob;
        let angle = roll + c.wobble;
        if (c.mode === "held") {
          x = c.x;
          y = c.y;
          angle = c.angle;
        } else if (c.mode === "flung") {
          c.vy += 2600 * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.angle += c.spin * dt;
          const r = p.size * 0.5;
          // Bounce off the card's edges, losing a little energy each time.
          if (c.x < r) {
            c.x = r;
            c.vx = Math.abs(c.vx) * 0.55;
            c.spin *= -0.7;
          }
          if (c.x > width - r) {
            c.x = width - r;
            c.vx = -Math.abs(c.vx) * 0.55;
            c.spin *= -0.7;
          }
          if (c.y < r) {
            c.y = r;
            c.vy = Math.abs(c.vy) * 0.5;
          }
          if (c.y > height - r) {
            c.y = height - r;
            c.vy = -Math.abs(c.vy) * 0.5;
            c.vx *= 0.8;
            c.spin *= 0.8;
          }
          if (now / 1000 - c.t0 > 1.5) {
            c.mode = "return";
            c.from = { x: c.x, y: c.y, angle: c.angle };
            c.t0 = now / 1000;
          }
          x = c.x;
          y = c.y;
          angle = c.angle;
        } else if (c.mode === "return") {
          const t = Math.min(1, (now / 1000 - c.t0) / 0.55);
          const e = 1 - (1 - t) ** 3;
          x = c.from.x + (x - c.from.x) * e;
          y = c.from.y + (y - c.from.y) * e;
          angle = c.from.angle * (1 - e) + angle * e;
          if (t >= 1) c.mode = "line";
        }

        // Flip through edge-on; the new face appears at the halfway point.
        let flipScale = 1;
        if (c.flip >= 0) {
          c.flip += dt / 0.55;
          if (c.flip >= 0.5 && c.flipMood) {
            setMood(i, c.flipMood);
            c.flipMood = null;
          }
          flipScale = Math.cos(Math.min(1, c.flip) * Math.PI * 2);
          if (c.flip >= 1) c.flip = -1;
        }

        // Hover squish, and eyes that look at the pointer.
        const dx = pointer.x - x;
        const dy = pointer.y - y;
        const dist = Math.hypot(dx, dy);
        const hovered = pointer.inside && dist < p.size * 0.5 && c.mode === "line";
        const sq = hovered && !still ? 0.06 : 0;
        const look = pointer.inside && !still ? Math.min(1, dist / (p.size * 0.6)) : 0;
        const eyes = el.querySelector<SVGGElement>("[data-eyes]");
        // Blink now and then.
        let blink = 1;
        if (!still) {
          if (clock > c.blinkAt) {
            if (clock > c.blinkAt + 0.14) c.blinkAt = clock + rng.range(1.8, 6);
            else blink = 0.12;
          }
        }
        if (eyes) eyes.setAttribute("transform", `translate(${dist ? ((dx / dist) * 5 * look).toFixed(2) : 0} ${dist ? ((dy / dist) * 4 * look).toFixed(2) : 0}) scale(1 ${blink})`);

        const tilt = p.s;
        const scale = p.size / base;
        const rim = base * 0.075 * (1 + tilt * 0.9);
        el.style.setProperty("--rx", `${((rim / RIM) * 0.55).toFixed(2)}px`);
        el.style.setProperty("--ry", `${((rim / RIM) * 0.85).toFixed(2)}px`);
        el.style.transform = `translate3d(${(x - base / 2).toFixed(1)}px, ${(y - base / 2).toFixed(1)}px, 0) rotate(${angle.toFixed(2)}deg) scale(${(scale * (1 + sq) * Math.max(0.04, Math.abs(flipScale))).toFixed(3)}, ${(scale * (1 - sq) * (1 - tilt * 0.09)).toFixed(3)})`;
        el.style.opacity = "1";
        order.push({ i, s: c.mode === "line" ? p.s : -1 });
      }
      // Bigger (lower) coins in front; a lifted or tumbling coin above them all.
      order.sort((a, b) => b.s - a.s).forEach((o, k) => {
        const el = coinRefs.current[o.i];
        if (el) el.style.zIndex = String(k + 1);
      });
      if (inView && !document.hidden && !still) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const local = (e: PointerEvent) => {
      const b = card.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top };
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.inside = true;
      if (drag) {
        const c = state[drag.slot];
        if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 6) {
          drag.moved = true;
          c.mode = "held";
          c.angle = 0;
        }
        if (drag.moved) {
          const t = performance.now();
          const dtm = Math.max(1, t - drag.lastT) / 1000;
          drag.vx = (p.x - drag.lastX) / dtm;
          drag.vy = (p.y - drag.lastY) / dtm;
          drag.lastX = p.x;
          drag.lastY = p.y;
          drag.lastT = t;
          c.x = p.x - drag.dx;
          c.y = p.y - drag.dy;
          c.angle += drag.vx * 0.004;
        }
      }
      if (live.current.reduceMotion) return;
      wake();
    };
    const onLeave = () => {
      pointer.inside = false;
    };
    const onUp = () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      const c = state[d.slot];
      if (!d.moved) {
        poke(d.slot);
        return;
      }
      c.mode = "flung";
      c.vx = Math.max(-2600, Math.min(2600, d.vx));
      c.vy = Math.max(-2600, Math.min(2600, d.vy));
      c.spin = c.vx * 0.5;
      c.t0 = performance.now() / 1000;
      wake();
    };
    const onDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-coin]");
      if (!target) return;
      const slot = Number(target.dataset.coin);
      const c = state[slot];
      if (c.mode !== "line") return;
      const p = local(e);
      const at = place(slot);
      if (live.current.reduceMotion) {
        poke(slot);
        return;
      }
      e.preventDefault();
      drag = { slot, dx: p.x - at.x, dy: p.y - at.y, lastX: p.x, lastY: p.y, lastT: performance.now(), vx: 0, vy: 0, moved: false, startX: e.clientX, startY: e.clientY };
      c.x = at.x;
      c.y = at.y;
    };

    measure();
    const ro = new ResizeObserver(() => {
      measure();
      wake();
    });
    ro.observe(card);
    const io = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? true;
      wake();
    });
    io.observe(card);
    const onVisibility = () => wake();
    document.addEventListener("visibilitychange", onVisibility);
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);
    card.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    wake();

    return () => {
      cancelAnimationFrame(raf);
      engine.current = null;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerleave", onLeave);
      card.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [seed, crewKey]);

  const pokeRandom = () => engine.current?.poke(Math.floor((Date.now() / 997) % SLOTS));

  const ctaClass =
    "inline-flex h-11 w-fit cursor-pointer items-center rounded-full bg-foreground px-5 text-[15px] font-semibold text-background outline-none transition-[background-color,transform] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2 active:scale-[0.96] [@media(hover:hover)]:hover:bg-foreground/85";

  return (
    <section
      ref={cardRef}
      className={cn("@container relative isolate flex min-h-[26rem] w-full touch-pan-y flex-col overflow-hidden rounded-[28px] bg-surface-2 p-8 select-none sm:p-10", className)}
      {...props}
    >
      {/* On a narrow card the copy wraps before the coin line instead of running over the coins. */}
      <div className="relative z-[60] flex max-w-[min(22rem,60cqw)] flex-col gap-4">
        <h2 className="text-[clamp(2rem,5vw,3rem)] leading-[1.02] font-semibold tracking-[-0.025em] text-balance text-foreground">{title}</h2>
        <p className="text-[15px] leading-relaxed text-text-secondary">{description}</p>
        {cta.href !== undefined ? (
          <a href={cta.href} onClick={cta.onClick} className={cn(ctaClass, "mt-2")}>
            {cta.label}
          </a>
        ) : (
          <button type="button" onClick={cta.onClick} className={cn(ctaClass, "mt-2")}>
            {cta.label}
          </button>
        )}
      </div>

      <div aria-hidden="true" className="absolute inset-0">
        {slots.map((slot, i) => {
          const agent = crew[slot.agent % crew.length];
          const rim = shade(agent.color, 0.68);
          return (
            <div
              key={i}
              data-coin={i}
              ref={(el) => {
                coinRefs.current[i] = el;
              }}
              className="absolute top-0 left-0 cursor-grab opacity-0 active:cursor-grabbing"
              style={{ width: "var(--coin)", height: "var(--coin)", willChange: "transform" }}
            >
              {Array.from({ length: RIM }, (_, k) => (
                <span
                  key={k}
                  className="absolute inset-0 rounded-full"
                  style={{ background: k === RIM - 1 ? shade(agent.color, 0.5) : rim, transform: `translate(calc(var(--rx) * ${RIM - k}), calc(var(--ry) * ${RIM - k}))` }}
                />
              ))}
              <span className="absolute inset-0 overflow-hidden rounded-full" style={{ background: agent.color }}>
                <Face mood={slot.mood} />
              </span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={pokeRandom}
        className="sr-only z-[70] cursor-pointer rounded-full bg-background px-4 py-2 text-[13px] font-semibold text-foreground focus:not-sr-only focus:absolute focus:right-5 focus:bottom-5 focus:ring-2 focus:ring-ring"
      >
        Poke a coin
      </button>
    </section>
  );
}
