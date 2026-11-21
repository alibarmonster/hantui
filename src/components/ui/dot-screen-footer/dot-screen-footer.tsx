"use client";

import { useEffect, useRef, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { runCanvasLoop, type CanvasLoop } from "@/lib/glyph/canvas-loop";
import { sampleSource } from "@/lib/glyph/sample-image";

export interface DotScreenFooterColumn {
  /** Column heading. Also names the column's navigation landmark. */
  title: string;
  /** Links in the column. */
  links: { label: string; href: string }[];
}

export interface DotScreenFooterPalette {
  /** Background. */
  ground?: string;
  /** Text and dots at rest. */
  ink?: string;
  /** Color dots take on as they are pushed, and the second plate. */
  warm?: string;
}

export interface DotScreenFooterProps extends Omit<ComponentProps<"footer">, "children"> {
  /** The word printed as a halftone screen across the bottom. @default "Studio" */
  wordmark?: string;
  /** Name shown in the brand block. @default the wordmark */
  brand?: ReactNode;
  /** Muted line under the brand, such as a copyright and city. */
  meta?: ReactNode;
  /** Link columns. Three fit the layout best. @default [] */
  columns?: DotScreenFooterColumn[];
  /** Show the Back to top button; pass a string to change its label. @default true */
  backToTop?: boolean | string;
  /** Color preset: dark grounds (ink, terracotta, cobalt, forest, plum, midnight, oxblood) or light ones (paper, riso, mint, blush, butter). @default "ink" */
  tone?: "ink" | "paper" | "terracotta" | "cobalt" | "forest" | "plum" | "midnight" | "oxblood" | "riso" | "mint" | "blush" | "butter";
  /** Colors that override the preset, as any CSS colors. */
  palette?: DotScreenFooterPalette;
  /** Distance between dots in px. Kept at 4 or more so the dot count stays bounded. @default 6 */
  gap?: number;
  /** How far from the pointer dots are pushed, in px. @default 80 */
  radius?: number;
  /** Share of the cap height cut off below the bottom edge, 0 to 0.6. @default 0.2 */
  crop?: number;
  /** Screen angle in degrees. 15 and 45 read as print. @default 0 */
  angle?: number;
  /** Dot shape: round dots, squares, or a line screen whose stroke width follows coverage. @default "round" */
  shape?: "round" | "square" | "line";
  /** 2 adds an offset second plate in the warm color, for a misregistered two-color print. @default 1 */
  plates?: 1 | 2;
  /** Strength of the print grain over the footer, 0 to 1. @default 0.35 */
  grain?: number;
  /** Let the pointer part the dots and clicks send a shock ring. @default true */
  interactive?: boolean;
  /** Font family for the wordmark. A heavy grotesk reads best. @default the sans font */
  fontFamily?: string;
  /** Font weight for the wordmark. @default 800 */
  fontWeight?: number;
  /** Font family for the small text. @default the mono font */
  monoFamily?: string;
  /** Height of the wordmark area, as a definite CSS length. @default fitted to the word */
  height?: string | number;
}

/** Name of a color preset. */
export type DotScreenFooterTone = NonNullable<DotScreenFooterProps["tone"]>;

/** Color presets: ground, ink for text and resting dots, warm for pushed dots and the second plate. */
const TONES: Record<DotScreenFooterTone, Required<DotScreenFooterPalette>> = {
  ink: { ground: "#141312", ink: "#f3efe6", warm: "#ff6a1a" },
  paper: { ground: "#f2ecdf", ink: "#141312", warm: "#d8321c" },
  terracotta: { ground: "#a3442a", ink: "#fbeee2", warm: "#ffd08a" },
  cobalt: { ground: "#1b3fd6", ink: "#eef2ff", warm: "#ffd84a" },
  forest: { ground: "#17301f", ink: "#eef0e0", warm: "#f2b632" },
  plum: { ground: "#2e1630", ink: "#f7e8ef", warm: "#ff7a5c" },
  midnight: { ground: "#0e1a2f", ink: "#e7edf8", warm: "#4fd8b8" },
  oxblood: { ground: "#4a1214", ink: "#f8e7da", warm: "#f59e5b" },
  riso: { ground: "#f6f0e2", ink: "#123f8c", warm: "#f0458f" },
  mint: { ground: "#d9efe2", ink: "#0f2a1d", warm: "#e2482f" },
  blush: { ground: "#f5ddd5", ink: "#2b1411", warm: "#2f56c9" },
  butter: { ground: "#f3e39b", ink: "#1d1a10", warm: "#d7381f" },
};

/** Every preset name, in the order above. */
export const DOT_SCREEN_FOOTER_TONES = Object.keys(TONES) as DotScreenFooterTone[];

/** Warmth is quantized to this many colors, so dots are filled one batch per color. */
const BUCKETS = 8;
const SECOND_PLATE_ANGLE = 75;

/** A small seeded generator (mulberry32) for the grain tile. */
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

interface Field {
  count: number;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  hx: Float32Array;
  hy: Float32Array;
  /** Coverage of the letter over the dot's cell, 0 to 1. */
  cover: Float32Array;
  /** 0 for the main plate, 1 for the second. */
  plate: Uint8Array;
  bucket: Uint8Array;
}

export function DotScreenFooter({
  wordmark = "Studio",
  brand,
  meta,
  columns = [],
  backToTop = true,
  tone = "ink",
  palette,
  gap = 6,
  radius = 80,
  crop = 0.2,
  angle = 0,
  shape = "round",
  plates = 1,
  grain = 0.35,
  interactive = true,
  fontFamily,
  fontWeight = 800,
  monoFamily,
  height,
  className,
  style,
  ...props
}: DotScreenFooterProps) {
  const footerRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const colors = { ...TONES[tone], ...palette };
  const cell = Math.max(4, gap);
  const cut = Math.min(0.6, Math.max(0, crop));

  // The grain tile is generated once, from a fixed seed.
  useEffect(() => {
    const target = grainRef.current;
    if (!target) return;
    const tile = document.createElement("canvas");
    tile.width = tile.height = 256;
    const ctx = tile.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(256, 256);
    const random = seededRandom(237);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = Math.floor(random() * 256);
      image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    target.style.backgroundImage = `url(${tile.toDataURL()})`;
  }, []);

  useEffect(() => {
    const footer = footerRef.current;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!footer || !host || !canvas || !ctx) return;

    let field: Field | null = null;
    let fills: string[] = [];
    let width = 0;
    let areaHeight = 0;
    let asleep = true;
    let disposed = false;
    let relayoutTimer = 0;
    const pointer = { x: 0, y: 0, active: false };
    const rings: { x: number; y: number; born: number }[] = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    /** Ink mixed toward warm in BUCKETS steps, resolved through a 1px canvas so any CSS color works. */
    function resolveFills() {
      const probe = document.createElement("canvas");
      probe.width = probe.height = 1;
      const p = probe.getContext("2d", { willReadFrequently: true });
      const computed = getComputedStyle(footer!);
      const ink = computed.getPropertyValue("--dsf-ink").trim() || "#fff";
      const warm = computed.getPropertyValue("--dsf-warm").trim() || "#f60";
      if (!p) return Array.from({ length: BUCKETS }, () => ink);
      return Array.from({ length: BUCKETS }, (_, i) => {
        p.globalAlpha = 1;
        p.fillStyle = ink;
        p.fillRect(0, 0, 1, 1);
        p.globalAlpha = i / (BUCKETS - 1);
        p.fillStyle = warm;
        p.fillRect(0, 0, 1, 1);
        const [r, g, b] = p.getImageData(0, 0, 1, 1).data;
        return `rgb(${r} ${g} ${b})`;
      });
    }

    /** Sets the word once on an offscreen mask per plate and turns its coverage into dots. */
    function layout() {
      if (disposed) return;
      width = host!.clientWidth;
      if (width < 8) return;
      const family = getComputedStyle(host!).fontFamily;
      const measure = document.createElement("canvas").getContext("2d");
      if (!measure) return;
      measure.font = `${fontWeight} 100px ${family}`;
      const metrics = measure.measureText(wordmark);
      const inkWidth = Math.max(1, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
      // The word is set a little wider than the container, so it bleeds off both sides.
      const size = (100 * width * 1.02) / inkWidth;
      measure.font = `${fontWeight} ${size}px ${family}`;
      const capHeight = measure.measureText("H").actualBoundingBoxAscent || size * 0.72;
      const fitted = capHeight * (1 - cut) + size * 0.06;
      if (height === undefined) host!.style.height = `${Math.ceil(fitted)}px`;
      areaHeight = host!.clientHeight || Math.ceil(fitted);
      const left = (width - inkWidth * (size / 100)) / 2 + metrics.actualBoundingBoxLeft * (size / 100);
      const baseline = areaHeight + capHeight * cut;

      const side = Math.ceil(Math.hypot(width, areaHeight)) + cell * 2;
      const cells = Math.ceil(side / cell);
      const mask = document.createElement("canvas");
      mask.width = mask.height = side;
      const m = mask.getContext("2d", { willReadFrequently: true });
      if (!m) return;

      const found: number[] = [];
      const plateAngles = plates === 2 ? [angle, SECOND_PLATE_ANGLE] : [angle];
      plateAngles.forEach((degrees, plate) => {
        const theta = (degrees * Math.PI) / 180;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        // Draw the word turned back by the screen angle, so the screen's grid is square to the mask.
        m.setTransform(1, 0, 0, 1, 0, 0);
        m.clearRect(0, 0, side, side);
        m.translate(side / 2, side / 2);
        m.rotate(-theta);
        m.translate(-width / 2, -areaHeight / 2);
        m.font = `${fontWeight} ${size}px ${family}`;
        m.fillStyle = "#000";
        m.fillText(wordmark, left, baseline);
        // Each cell's alpha is the share of it the letter covers (averaged while downsampling).
        const sample = sampleSource(mask, side, side, cells, cells, "fill");
        const shiftX = plate === 1 ? cell * 0.35 : 0;
        const shiftY = plate === 1 ? cell * 0.25 : 0;
        for (let row = 0; row < sample.rows; row++) {
          for (let col = 0; col < sample.cols; col++) {
            const cover = sample.alpha[row * sample.cols + col];
            if (cover < 0.06) continue;
            const gx = (col + 0.5) * (side / sample.cols) - side / 2;
            const gy = (row + 0.5) * (side / sample.rows) - side / 2;
            const x = gx * cos - gy * sin + width / 2 + shiftX;
            const y = gx * sin + gy * cos + areaHeight / 2 + shiftY;
            if (x < -cell || x > width + cell || y < -cell || y > areaHeight + cell) continue;
            found.push(x, y, cover, plate);
          }
        }
      });

      const count = found.length / 4;
      const next: Field = {
        count,
        x: new Float32Array(count),
        y: new Float32Array(count),
        vx: new Float32Array(count),
        vy: new Float32Array(count),
        hx: new Float32Array(count),
        hy: new Float32Array(count),
        cover: new Float32Array(count),
        plate: new Uint8Array(count),
        bucket: new Uint8Array(count),
      };
      for (let i = 0; i < count; i++) {
        next.x[i] = next.hx[i] = found[i * 4];
        next.y[i] = next.hy[i] = found[i * 4 + 1];
        next.cover[i] = found[i * 4 + 2];
        next.plate[i] = found[i * 4 + 3];
      }
      field = next;
      fills = resolveFills();
      host!.dataset.ready = "true";
      loop?.redraw();
    }

    function simulate(dt: number, now: number) {
      const f = field;
      if (!f) return false;
      const steps = Math.min(3, dt * 60);
      const damping = Math.pow(0.84, steps);
      const reach = radius * radius;
      let moving = pointer.active;
      for (let r = rings.length - 1; r >= 0; r--) if (now - rings[r].born > 900) rings.splice(r, 1);
      if (rings.length) moving = true;
      for (let i = 0; i < f.count; i++) {
        let vx = f.vx[i] + (f.hx[i] - f.x[i]) * 0.05 * steps;
        let vy = f.vy[i] + (f.hy[i] - f.y[i]) * 0.05 * steps;
        if (pointer.active) {
          const dx = f.x[i] - pointer.x;
          const dy = f.y[i] - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < reach && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const push = (1 - d / radius) ** 2 * 2.4 * steps;
            vx += (dx / d) * push;
            vy += (dy / d) * push;
          }
        }
        for (let r = 0; r < rings.length; r++) {
          const ring = rings[r];
          const age = now - ring.born;
          const dx = f.x[i] - ring.x;
          const dy = f.y[i] - ring.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const band = 1 - Math.abs(d - age * 0.9) / 26;
          if (band > 0) {
            const push = band * (1 - age / 900) * 1.7 * steps;
            vx += (dx / d) * push;
            vy += (dy / d) * push;
          }
        }
        vx *= damping;
        vy *= damping;
        f.vx[i] = vx;
        f.vy[i] = vy;
        f.x[i] += vx * steps;
        f.y[i] += vy * steps;
        if (!moving && (Math.abs(vx) > 0.02 || Math.abs(vy) > 0.02 || Math.abs(f.x[i] - f.hx[i]) > 0.05 || Math.abs(f.y[i] - f.hy[i]) > 0.05)) moving = true;
      }
      return moving;
    }

    function draw(dpr: number) {
      const f = field;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, width + 2, areaHeight + 2);
      if (!f) return;
      for (let i = 0; i < f.count; i++) {
        const dx = f.x[i] - f.hx[i];
        const dy = f.y[i] - f.hy[i];
        // Fully warm once a dot is about 28px from home.
        f.bucket[i] = Math.min(BUCKETS - 1, Math.floor((Math.sqrt(dx * dx + dy * dy) / 28) * BUCKETS));
      }
      const plateCount = plates === 2 ? 2 : 1;
      for (let plate = plateCount - 1; plate >= 0; plate--) {
        const theta = ((plate === 1 ? SECOND_PLATE_ANGLE : angle) * Math.PI) / 180;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        ctx!.globalAlpha = plate === 1 ? 0.42 : 1;
        // One path and one fill per color.
        for (let bucket = 0; bucket < BUCKETS; bucket++) {
          if (plate === 1 && bucket > 0) break;
          ctx!.beginPath();
          let any = false;
          for (let i = 0; i < f.count; i++) {
            if (f.plate[i] !== plate || (plate === 0 && f.bucket[i] !== bucket)) continue;
            any = true;
            const x = f.x[i];
            const y = f.y[i];
            const cover = f.cover[i];
            if (shape === "round") {
              // Area-true: the dot's area follows the coverage, so tone stays even.
              const r = Math.sqrt(cover) * cell * 0.56;
              ctx!.moveTo(x + r, y);
              ctx!.arc(x, y, r, 0, Math.PI * 2);
            } else {
              const halfW = shape === "square" ? (Math.sqrt(cover) * cell) / 2 : cell / 2 + 0.3;
              const halfH = shape === "square" ? halfW : cover * cell * 0.46;
              const ax = cos * halfW;
              const ay = sin * halfW;
              const bx = -sin * halfH;
              const by = cos * halfH;
              ctx!.moveTo(x - ax - bx, y - ay - by);
              ctx!.lineTo(x + ax - bx, y + ay - by);
              ctx!.lineTo(x + ax + bx, y + ay + by);
              ctx!.lineTo(x - ax + bx, y - ay + by);
              ctx!.closePath();
            }
          }
          if (!any) continue;
          ctx!.fillStyle = plate === 1 ? fills[BUCKETS - 1] : fills[bucket];
          ctx!.fill();
        }
      }
      ctx!.globalAlpha = 1;
    }

    const loop: CanvasLoop = runCanvasLoop({
      host,
      canvas,
      isPaused: () => asleep,
      render: (frame) => {
        if (frame.dt > 0 && !frame.still) {
          // Once every dot is home and nothing is pushing, the loop goes back to sleep.
          if (!simulate(frame.dt, performance.now())) {
            asleep = true;
            loop.wake();
          }
        }
        draw(frame.dpr);
      },
      resize: () => {
        // Re-set the word after the size settles, not on every resize tick.
        if (host.clientWidth === width) return;
        window.clearTimeout(relayoutTimer);
        relayoutTimer = window.setTimeout(layout, field ? 140 : 0);
      },
    });

    const wake = () => {
      if (!asleep || reduced.matches) return;
      asleep = false;
      loop.wake();
    };
    const place = (event: PointerEvent | MouseEvent) => {
      const rect = host.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onMove = (event: PointerEvent) => {
      if (!interactive || reduced.matches) return;
      const at = place(event);
      pointer.x = at.x;
      pointer.y = at.y;
      pointer.active = true;
      wake();
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onClick = (event: MouseEvent) => {
      if (!interactive || reduced.matches) return;
      // Links and buttons keep their clicks to themselves.
      if ((event.target as Element).closest("a, button")) return;
      const at = place(event);
      rings.push({ x: at.x, y: at.y, born: performance.now() });
      wake();
    };

    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerdown", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointercancel", onLeave);
    host.addEventListener("pointerup", onLeave);
    footer.addEventListener("click", onClick);
    layout();
    // The web font may arrive late: set the word again once fonts are ready.
    void document.fonts?.ready.then(() => {
      if (!disposed) layout();
    });

    return () => {
      disposed = true;
      window.clearTimeout(relayoutTimer);
      loop.dispose();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointercancel", onLeave);
      host.removeEventListener("pointerup", onLeave);
      footer.removeEventListener("click", onClick);
    };
  }, [wordmark, cell, radius, cut, angle, shape, plates, interactive, fontWeight, fontFamily, height, colors.ink, colors.warm]);

  function toTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    // Focus follows to the top of the page, so the keyboard continues from there.
    const target = document.querySelector<HTMLElement>("main") ?? document.body;
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
      target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
    }
    target.focus({ preventScroll: true });
  }

  const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-(--dsf-ink) focus-visible:ring-offset-2 focus-visible:ring-offset-(--dsf-ground)";
  const letters = Math.max(1, Array.from(wordmark).length);

  return (
    <footer
      ref={footerRef}
      style={
        {
          "--dsf-ground": colors.ground,
          "--dsf-ink": colors.ink,
          "--dsf-warm": colors.warm,
          "--dsf-mono": monoFamily ?? "var(--font-mono), ui-monospace, monospace",
          ...style,
        } as CSSProperties
      }
      className={cn("@container relative isolate w-full overflow-hidden bg-(--dsf-ground) text-(--dsf-ink)", className)}
      {...props}
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 px-5 pt-10 font-(family-name:--dsf-mono) text-[10.5px] tracking-[0.18em] uppercase @[45rem]:grid-cols-[1.25fr_1fr_1fr_1fr] @[45rem]:px-8 @[45rem]:pt-12">
        <div className="col-span-2 @[45rem]:col-span-1">
          <p className="font-semibold">{brand ?? wordmark}</p>
          {meta ? <p className="mt-2 leading-5 opacity-80">{meta}</p> : null}
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p aria-hidden="true" className="opacity-75">
              {column.title}
            </p>
            <ul className="mt-1">
              {column.links.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <a
                    href={link.href}
                    className={cn(
                      "group/link relative inline-flex min-h-10 items-center rounded-sm",
                      "after:absolute after:inset-x-0 after:bottom-2.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none",
                      focusRing,
                    )}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-4 px-5 @[45rem]:px-8">
        <span aria-hidden="true" className="h-px flex-1 bg-(--dsf-ink) opacity-[0.16]" />
        {backToTop ? (
          <button
            type="button"
            onClick={toTop}
            className={cn("inline-flex h-10 cursor-pointer items-center gap-2 rounded-sm px-1 font-(family-name:--dsf-mono) text-[10.5px] tracking-[0.18em] uppercase", focusRing)}
          >
            {typeof backToTop === "string" ? backToTop : "Back to top"}
            <ArrowUp aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
          </button>
        ) : null}
      </div>

      <span className="sr-only">{wordmark}</span>
      <div
        ref={hostRef}
        aria-hidden="true"
        style={{ height: height ?? "clamp(96px, 22cqw, 420px)", fontFamily: fontFamily ?? "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
        className="group/screen relative mt-6 w-full touch-pan-y overflow-hidden select-none"
      >
        {/* Shown until the canvas has drawn, and for good if canvas is unavailable: the word through a CSS dot mask. */}
        <span
          className="absolute inset-x-0 bottom-0 block translate-y-[18%] text-center leading-[0.8] whitespace-nowrap text-(--dsf-ink) group-data-[ready=true]/screen:hidden"
          style={{
            fontWeight,
            fontSize: `calc(100cqw / ${(letters * 0.6).toFixed(2)})`,
            maskImage: "radial-gradient(circle, #000 42%, transparent 46%)",
            maskSize: `${cell}px ${cell}px`,
            WebkitMaskImage: "radial-gradient(circle, #000 42%, transparent 46%)",
            WebkitMaskSize: `${cell}px ${cell}px`,
          }}
        >
          {wordmark}
        </span>
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      </div>

      <div ref={grainRef} aria-hidden="true" style={{ opacity: Math.min(1, Math.max(0, grain)) * 0.5 }} className="pointer-events-none absolute inset-0 mix-blend-overlay" />
    </footer>
  );
}
