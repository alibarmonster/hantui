"use client";

import { Fragment, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, type ComponentProps, type CSSProperties, type Ref } from "react";
import { useReducedMotion } from "motion/react";
import { createRandom, type Random } from "@/lib/random";

export interface MisprintPalette {
  /** Cyan plate. */
  cyan: string;
  /** Magenta plate. */
  magenta: string;
  /** Yellow plate. */
  yellow: string;
  /** Sticker label colors, picked per sticker. */
  stickers: string[];
  /** Sticker outline and hard shadow. */
  outline: string;
}

export interface MisprintTextHandle {
  /** Scatters the paragraph, leaves a few stray words, then prints it again from the start. */
  replay: () => void;
}

export interface MisprintTextProps extends Omit<ComponentProps<"p">, "children" | "ref"> {
  /** The paragraph. Words are split on whitespace and stay real, selectable text. */
  text: string;
  /** The same seed always gives the same print, stickers and glitches. @default "misprint" */
  seed?: string | number;
  /** Print word by word the first time the text scrolls into view. Off shows it printed until `replay()`. @default true */
  autoplay?: boolean;
  /** Small flicks, bursts and the odd stuck band after printing. @default true */
  idleGlitch?: boolean;
  /** Share of words that land as a stack of sticker labels, 0–1. @default 0.125 */
  stickers?: number;
  /** Print speed multiplier. @default 1 */
  speed?: number;
  /** Plates multiply on light paper or screen on dark paper. Text color comes from the parent. @default "light" */
  tone?: "light" | "dark";
  /** Plate and sticker colors. */
  palette?: Partial<MisprintPalette>;
  /** Imperative handle with `replay()`. */
  ref?: Ref<MisprintTextHandle>;
}

const PALETTES: Record<"light" | "dark", MisprintPalette> = {
  light: { cyan: "#00a0d8", magenta: "#e5007d", yellow: "#ffd100", stickers: ["#ffd100", "#ff3d9a", "#2f6bff", "#22b573"], outline: "#111111" },
  dark: { cyan: "#2ad4ff", magenta: "#ff4fa8", yellow: "#ffe14a", stickers: ["#ffd100", "#ff3d9a", "#3d7bff", "#22c07a"], outline: "#000000" },
};

/** Ticks per second: the print steps like a press, not a smooth tween. */
const TPS = 24;
/** How long a word's arrival effects last, in ticks. */
const LIFE = 16;

type Kind = "shatter" | "ghost" | "sticker";

interface WordPlan {
  at: number;
  kind: Kind;
  pieces: number;
  ghosts: number;
  stickers: number;
  peelAt: number;
  interlace: boolean;
  debris: number;
  rng: Random;
}

interface Glitch {
  word: number;
  type: "flick" | "slip" | "ghost";
  start: number;
  length: number;
}

interface Tear {
  start: number;
  length: number;
  top: number;
  height: number;
  shift: number;
  split: boolean;
}

const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

/**
 * A paragraph that prints like a misregistered press. Words land a few ticks apart: some shatter
 * into flat-colored pieces that settle, some arrive as offset colored duplicates that snap on, and
 * about one in eight lands as a stack of skewed sticker labels that jitter and peel away. Cyan,
 * magenta and yellow plates close onto the key text, some words slip in strips, ink debris fades
 * around fresh words and now and then a band of the paragraph tears sideways. After printing it
 * glitches occasionally; `replay()` scatters it and prints it again. Seeded, so every print of the
 * same seed is identical.
 *
 * The words are real text (selectable, read once by screen readers); every effect is an aria-hidden
 * layer driven by one stepped rAF loop. Reduced motion and no-script both show the printed text.
 */
export function MisprintText({
  text,
  seed = "misprint",
  autoplay = true,
  idleGlitch = true,
  stickers = 0.125,
  speed = 1,
  tone = "light",
  palette,
  ref,
  className,
  style,
  ...props
}: MisprintTextProps) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLParagraphElement>(null);
  const bodyRef = useRef<HTMLSpanElement>(null);
  const tearRef = useRef<HTMLSpanElement>(null);
  const engine = useRef<{ replay: () => void; wake: () => void } | null>(null);
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const colors = { ...PALETTES[tone], ...palette };
  // Read by the loop each tick, so changing them never restarts the print.
  const settings = useRef({ speed, idleGlitch, colors, tone });
  useEffect(() => {
    settings.current = { speed, idleGlitch, colors, tone };
    engine.current?.wake();
  });

  useImperativeHandle(ref, () => ({ replay: () => engine.current?.replay() }), []);

  // Hide unprinted words before the first paint; without scripts (or under reduced motion) they stay visible.
  useLayoutEffect(() => {
    if (!autoplay || reduceMotion) return;
    bodyRef.current?.querySelectorAll<HTMLElement>("[data-k]").forEach((el) => (el.style.opacity = "0"));
  }, [autoplay, reduceMotion, words]);

  useEffect(() => {
    const root = rootRef.current;
    const body = bodyRef.current;
    const tearLayer = tearRef.current;
    if (!root || !body || !tearLayer) return;
    const pal = () => settings.current.colors;
    // Each word is a box (moved as a whole when scattering) holding the key text and its effect layers.
    const boxes = [...body.querySelectorAll<HTMLElement>("[data-w]")];
    const keys = boxes.map((el) => el.querySelector<HTMLElement>("[data-k]")!);
    const fxs = boxes.map((el) => el.querySelector<HTMLElement>("[data-fx]")!);
    const tearWords = [...tearLayer.querySelectorAll<HTMLElement>("[data-t]")];
    const plates = () => [pal().cyan, pal().magenta, pal().yellow];
    // Solid pieces and duplicates skip yellow on light paper, where it would all but disappear.
    const inks = () => (settings.current.tone === "dark" ? plates() : [pal().cyan, pal().magenta]);

    const showAll = () => {
      keys.forEach((el, i) => {
        el.style.opacity = "1";
        boxes[i].style.transform = "";
        fxs[i].replaceChildren();
        tearWords[i].style.opacity = "1";
      });
      body.style.clipPath = "";
      tearLayer.style.visibility = "hidden";
    };
    if (reduceMotion) {
      showAll();
      engine.current = { replay: () => {}, wake: () => {} };
      return () => {
        engine.current = null;
      };
    }

    /* ------------------------------------------------------------ plan (seeded) */

    const rng = createRandom(seed);
    let cursor = 0;
    const plan: WordPlan[] = words.map((word, i) => {
      const r = rng.fork(`w${i}`);
      const at = cursor;
      cursor += 1 + r.int(0, 2);
      // Small pauses at commas and sentence ends.
      if (/[,;:]$/.test(word)) cursor += 4;
      if (/[.!?]["')\]]*$/.test(word)) cursor += 8;
      const kind: Kind = r.next() < stickers ? "sticker" : r.chance(0.55) ? "shatter" : "ghost";
      return { at, kind, pieces: r.int(3, 8), ghosts: r.int(1, 2), stickers: r.int(1, 3), peelAt: 3 + r.int(0, 1), interlace: r.chance(0.16), debris: r.int(1, 4), rng: r };
    });
    const printLength = cursor + LIFE;
    const tearRng = rng.fork("tears");
    const tears: Tear[] = Array.from({ length: tearRng.int(2, 4) }, () => makeTear(tearRng, tearRng.int(4, Math.max(5, cursor - 4)), tearRng.int(3, 6)));

    /* ------------------------------------------------------------ effects (DOM) */

    const layer = (i: number, css: Partial<CSSStyleDeclaration>, content = words[i]) => {
      const el = document.createElement("span");
      el.textContent = content;
      Object.assign(el.style, { position: "absolute", left: "0", top: "0", whiteSpace: "nowrap", pointerEvents: "none", ...css });
      fxs[i].appendChild(el);
      return el;
    };

    interface Fx {
      pieces: { el: HTMLElement; dx: number; dy: number; rot: number }[];
      ghosts: { el: HTMLElement; dx: number; dy: number }[];
      plates: { el: HTMLElement; dx: number; dy: number }[];
      stickers: { el: HTMLElement; rot: number; dx: number; dy: number }[];
      strips: HTMLElement[];
      debris: HTMLElement[];
    }
    const live = new Map<number, Fx>();

    const buildFx = (i: number) => {
      const p = plan[i];
      const r = p.rng.fork("fx");
      const fx: Fx = { pieces: [], ghosts: [], plates: [], stickers: [], strips: [], debris: [] };
      // CMY plates start off register and close onto the key text.
      plates().forEach((color) => fx.plates.push({ el: layer(i, { color, mixBlendMode: "var(--mp-blend)", opacity: "0.9" }), dx: r.range(-0.12, 0.12), dy: r.range(-0.08, 0.08) }));
      if (p.kind === "shatter") {
        const cuts = [0, ...Array.from({ length: p.pieces - 1 }, () => r.range(8, 92)).sort((a, b) => a - b), 100];
        for (let k = 0; k < p.pieces; k++) {
          const [x0, x1] = [cuts[k], cuts[k + 1]];
          const j = () => r.range(-6, 6);
          const clip = `polygon(${x0 + j()}% -10%, ${x1 + j()}% -10%, ${x1 + j()}% ${50 + j()}%, ${x1 + j()}% 110%, ${x0 + j()}% 110%, ${x0 + j()}% ${50 + j()}%)`;
          fx.pieces.push({ el: layer(i, { color: r.pick([...inks(), "currentColor"]), clipPath: clip }), dx: r.range(-0.7, 0.7), dy: r.range(-0.6, 0.6), rot: r.range(-28, 28) });
        }
      } else if (p.kind === "ghost") {
        for (let k = 0; k < p.ghosts; k++) fx.ghosts.push({ el: layer(i, { color: r.pick(inks()), mixBlendMode: "var(--mp-blend)" }), dx: r.range(0.2, 0.45) * r.pick([-1, 1]), dy: r.range(-0.22, 0.22) });
      } else {
        for (let k = 0; k < p.stickers; k++) {
          const el = layer(i, {
            left: "-0.2em",
            top: "-0.08em",
            padding: "0 0.2em",
            background: r.pick(pal().stickers),
            color: "#ffffff",
            fontWeight: "800",
            border: `0.08em solid ${pal().outline}`,
            borderRadius: "0.08em",
            boxShadow: `0.12em 0.12em 0 ${pal().outline}`,
            zIndex: String(2 + k),
          });
          fx.stickers.push({ el, rot: r.range(-9, 9), dx: (k - (p.stickers - 1) / 2) * 0.12, dy: -k * 0.08 });
        }
      }
      // Ink debris around the fresh word: halftone patches and slivers.
      for (let k = 0; k < p.debris; k++) {
        const halftone = r.chance(0.55);
        const size = r.range(0.35, 0.8);
        fx.debris.push(
          layer(
            i,
            halftone
              ? { width: `${size}em`, height: `${size}em`, left: `${r.range(-40, 110)}%`, top: `${r.range(-60, 90)}%`, color: r.pick(plates()), backgroundImage: "radial-gradient(currentColor 34%, transparent 36%)", backgroundSize: "0.18em 0.18em" }
              : { width: `${r.range(0.4, 1.3)}em`, height: "0.07em", left: `${r.range(-30, 100)}%`, top: `${r.range(-20, 110)}%`, background: r.pick([...plates(), "currentColor"]), transform: `rotate(${r.range(-35, 35)}deg)` },
            "",
          ),
        );
      }
      live.set(i, fx);
      return fx;
    };

    const addStrips = (i: number, fx: Fx) => {
      if (fx.strips.length) return;
      for (let k = 0; k < 4; k++) fx.strips.push(layer(i, { clipPath: `inset(${k * 25}% 0 ${100 - (k + 1) * 25}% 0)`, color: "currentColor" }));
    };

    const dropFx = (i: number) => {
      fxs[i].replaceChildren();
      live.delete(i);
    };

    const setWord = (i: number, visible: boolean, transform = "") => {
      keys[i].style.opacity = visible ? "1" : "0";
      boxes[i].style.transform = transform;
      tearWords[i].style.opacity = visible ? "1" : "0";
    };

    /** Draws word i at `k` ticks after it started landing. */
    const drawArrival = (i: number, k: number, tick: number) => {
      const p = plan[i];
      if (k >= LIFE) {
        if (live.has(i)) dropFx(i);
        setWord(i, true);
        return;
      }
      const fx = live.get(i) ?? buildFx(i);
      const reveal = p.kind === "shatter" ? 6 : p.kind === "ghost" ? 3 : 1;
      const slipping = p.interlace && k >= reveal && k < reveal + 4;
      setWord(i, k >= reveal && !slipping);
      // Shattered pieces fly in and settle.
      const t = ease(k / 5);
      fx.pieces.forEach((pc) => {
        pc.el.style.opacity = k < reveal ? "1" : "0";
        pc.el.style.transform = `translate(${pc.dx * (1 - t)}em, ${pc.dy * (1 - t)}em) rotate(${pc.rot * (1 - t)}deg)`;
      });
      // Offset duplicates snap on.
      fx.ghosts.forEach((g) => {
        const s = 1 - Math.min(1, k / 3);
        g.el.style.opacity = k < reveal ? "0.95" : "0";
        g.el.style.transform = `translate(${g.dx * s}em, ${g.dy * s}em)`;
      });
      // CMY plates close onto the key text, then lift off.
      const close = 1 - Math.min(1, k / 6);
      fx.plates.forEach((pl) => {
        pl.el.style.opacity = k < 7 ? "0.9" : k < 8 ? "0.4" : "0";
        pl.el.style.transform = `translate(${pl.dx * close}em, ${pl.dy * close}em)`;
      });
      // Stickers jitter for a few ticks, then peel away and leave the plain word.
      fx.stickers.forEach((st, n) => {
        const peel = Math.max(0, (k - p.peelAt - n * 0.5) / 4);
        const jitter = k < p.peelAt ? p.rng.fork(`j${tick}:${n}`).range(-2.5, 2.5) : 0;
        st.el.style.opacity = peel >= 1 ? "0" : "1";
        st.el.style.transform = `translate(${st.dx + peel * 0.5}em, ${st.dy - peel * 0.9}em) rotate(${st.rot + jitter + peel * 24}deg) scale(${1 - peel * 0.15})`;
        st.el.style.transformOrigin = "0% 100%";
      });
      // Interlaced words slip sideways in strips for a few frames.
      if (slipping) addStrips(i, fx);
      fx.strips.forEach((s, n) => {
        s.style.opacity = slipping ? "1" : "0";
        s.style.transform = slipping ? `translateX(${p.rng.fork(`s${tick}:${n}`).range(-0.35, 0.35)}em)` : "";
      });
      fx.debris.forEach((d) => (d.style.opacity = String(Math.max(0, 1 - k / 10))));
    };

    /* ------------------------------------------------------------ band tears */

    const drawTear = (tear: Tear | null, tick: number) => {
      if (!tear) {
        body.style.clipPath = "";
        tearLayer.style.visibility = "hidden";
        return;
      }
      const top = tear.top * 100;
      const bottom = (tear.top + tear.height) * 100;
      const jitter = createRandom(`${seed}:tear:${tick}`).range(-0.15, 0.15);
      // Cut the band out of the paragraph (even-odd hole) and show it, shifted, from the copy.
      body.style.clipPath = `polygon(evenodd, -30% -60%, 130% -60%, 130% 160%, -30% 160%, -30% -60%, -30% ${top}%, 130% ${top}%, 130% ${bottom}%, -30% ${bottom}%, -30% ${top}%)`;
      tearLayer.style.visibility = "visible";
      tearLayer.style.clipPath = `inset(${top}% -30% ${100 - bottom}% -30%)`;
      tearLayer.style.transform = `translateX(${tear.shift + jitter}em)`;
      tearLayer.style.textShadow = tear.split ? `-0.1em 0 ${pal().cyan}, 0.1em 0 ${pal().magenta}, 0 0.06em ${pal().yellow}` : "";
    };

    function makeTear(r: Random, start: number, length: number): Tear {
      const height = r.range(0.12, 0.3);
      return { start, length, top: r.range(0, 1 - height), height, shift: r.range(0.45, 1.1) * r.pick([-1, 1]), split: r.chance(0.5) };
    }

    /* ------------------------------------------------------------ timeline */

    type Phase = "waiting" | "printing" | "idle" | "scatter";
    let phase: Phase = autoplay ? "waiting" : "idle";
    let printStart = 0;
    let scatterStart = 0;
    let replays = 0;
    let tick = 0;
    let elapsed = 0;
    let lastElapsed = 0;
    let elapsedTicks = 0;
    let last = 0;
    let raf = 0;
    let inView = false;
    let glitches: Glitch[] = [];
    let idleTear: Tear | null = null;
    let idleRng = rng.fork("idle");
    let nextIdle = 0;
    let scatter: { dx: number; dy: number; rot: number; stray: boolean; sticker: boolean }[] = [];

    if (!autoplay) showAll();

    const scheduleIdle = (from: number) => {
      nextIdle = from + idleRng.int(30, 84);
    };

    const step = () => {
      if (phase === "printing") {
        const local = tick - printStart;
        plan.forEach((p, i) => {
          const k = local - p.at;
          if (k < 0) setWord(i, false);
          else if (k < LIFE + 1) drawArrival(i, k, tick);
        });
        drawTear(tears.find((t) => local >= t.start && local < t.start + t.length) ?? null, tick);
        if (local >= printLength) {
          phase = "idle";
          plan.forEach((_, i) => drawArrival(i, LIFE, tick));
          drawTear(null, tick);
          scheduleIdle(tick);
        }
      } else if (phase === "idle" && settings.current.idleGlitch) {
        if (tick >= nextIdle) {
          const roll = idleRng.next();
          if (roll < 0.08) {
            // A rare stuck band: holds ~0.4–0.6s, then snaps back.
            idleTear = makeTear(idleRng, tick, idleRng.int(10, 14));
          } else {
            const count = roll < 0.65 ? 1 : idleRng.int(3, 6);
            for (let n = 0; n < count; n++) {
              const word = idleRng.int(0, words.length - 1);
              glitches.push({ word, type: count === 1 ? "flick" : idleRng.pick(["slip", "ghost"] as const), start: tick, length: count === 1 ? idleRng.int(1, 2) : idleRng.int(4, 6) });
            }
          }
          scheduleIdle(tick);
        }
        drawTear(idleTear && tick < idleTear.start + idleTear.length ? idleTear : null, tick);
        if (idleTear && tick >= idleTear.start + idleTear.length) idleTear = null;
        glitches = glitches.filter((g) => {
          const k = tick - g.start;
          const fx = live.get(g.word) ?? buildFx(g.word);
          if (k >= g.length) {
            dropFx(g.word);
            setWord(g.word, true);
            return false;
          }
          const r = createRandom(`${seed}:g${g.start}:${g.word}:${k}`);
          if (g.type === "slip") {
            addStrips(g.word, fx);
            setWord(g.word, false);
            fx.strips.forEach((s) => (s.style.transform = `translateX(${r.range(-0.3, 0.3)}em)`));
          } else {
            fx.plates.forEach((pl) => (pl.el.style.transform = `translate(${r.range(-0.14, 0.14)}em, ${r.range(-0.06, 0.06)}em)`));
            fx.ghosts.forEach((gh) => (gh.el.style.opacity = g.type === "ghost" ? "0.9" : "0"));
          }
          fx.pieces.forEach((pc) => (pc.el.style.opacity = "0"));
          fx.stickers.forEach((st) => (st.el.style.opacity = "0"));
          fx.debris.forEach((d) => (d.style.opacity = "0"));
          return true;
        });
      } else if (phase === "scatter") {
        const k = tick - scatterStart;
        const t = ease(k / 12);
        scatter.forEach((s, i) => {
          const fade = s.stray ? (k < 22 ? 1 : Math.max(0, 1 - (k - 22) / 6)) : Math.max(0, 1 - k / 9);
          keys[i].style.opacity = String(fade);
          boxes[i].style.transform = s.stray ? `translate(${s.dx * t * 0.4}em, ${s.dy * t * 0.4}em) rotate(${s.rot * t * 0.3}deg)` : `translate(${s.dx * t}em, ${s.dy * t}em) rotate(${s.rot * t}deg)`;
          tearWords[i].style.opacity = "0";
          if (s.sticker && k === 1) {
            fxs[i].replaceChildren();
            layer(i, { left: "-0.2em", padding: "0 0.2em", background: pal().stickers[i % pal().stickers.length], color: "#fff", fontWeight: "800", border: `0.08em solid ${pal().outline}`, boxShadow: `0.12em 0.12em 0 ${pal().outline}` });
          }
          if (s.sticker && k === 5) fxs[i].replaceChildren();
        });
        if (k >= 30) {
          scatter.forEach((_, i) => {
            setWord(i, false);
            fxs[i].replaceChildren();
          });
          live.clear();
          phase = "printing";
          printStart = tick + 2;
        }
      }
    };

    const loop = (now: number) => {
      raf = 0;
      if (!running()) return;
      elapsed += last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      elapsedTicks += (elapsed - lastElapsed) * TPS * Math.max(0.1, settings.current.speed);
      lastElapsed = elapsed;
      const next = Math.floor(elapsedTicks);
      // Jumping several ticks (a slow frame) just draws the latest state.
      if (next !== tick) {
        tick = next;
        step();
      }
      raf = requestAnimationFrame(loop);
    };
    const running = () => inView && !document.hidden && (phase === "printing" || phase === "scatter" || (phase === "idle" && settings.current.idleGlitch));
    const wake = () => {
      if (!raf && running()) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? false;
      if (inView && phase === "waiting") {
        phase = "printing";
        printStart = tick + 1;
      }
      wake();
    });
    io.observe(root);
    const onVisibility = () => wake();
    document.addEventListener("visibilitychange", onVisibility);

    engine.current = {
      wake,
      replay: () => {
        const r = createRandom(`${seed}:scatter:${replays++}`);
        const strays = new Set(Array.from({ length: Math.min(words.length, r.int(3, 5)) }, () => r.int(0, words.length - 1)));
        scatter = words.map((_, i) => ({ dx: r.range(-3, 3), dy: r.range(-2.2, 2.2), rot: r.range(-40, 40), stray: strays.has(i), sticker: r.chance(0.25) }));
        live.forEach((_, i) => dropFx(i));
        glitches = [];
        idleTear = null;
        idleRng = rng.fork("idle");
        drawTear(null, tick);
        phase = "scatter";
        scatterStart = tick;
        wake();
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      engine.current = null;
      showAll();
    };
  }, [words, seed, autoplay, stickers, reduceMotion]);

  const vars = {
    "--mp-blend": tone === "dark" ? "screen" : "multiply",
    ...style,
  } as CSSProperties;

  const wordsOf = (copy: boolean) =>
    words.map((word, i) => (
      <Fragment key={i}>
        <span {...(copy ? { "data-t": "" } : { "data-w": "" })} className="relative inline-block">
          {copy ? word : <span data-k="">{word}</span>}
          {copy ? null : <span data-fx="" aria-hidden="true" className="pointer-events-none absolute inset-0 select-none" />}
        </span>
        {i < words.length - 1 ? " " : null}
      </Fragment>
    ));

  return (
    <p ref={rootRef} className={className} style={vars} {...props}>
      <span className="relative block">
        <span ref={bodyRef} className="block">
          {wordsOf(false)}
        </span>
        {/* A copy of the key text, shown only inside a torn band. */}
        <span ref={tearRef} aria-hidden="true" className="pointer-events-none absolute inset-0 block select-none" style={{ visibility: "hidden" }}>
          {wordsOf(true)}
        </span>
      </span>
    </p>
  );
}
