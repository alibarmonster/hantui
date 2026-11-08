"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { animate, AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import { hexToRgb } from "@/lib/color";
import { runCanvasLoop } from "@/lib/glyph/canvas-loop";
import { createRandom } from "@/lib/random";
import { bindTexture, createPass, createPingPong, halfFloatFormat, isSoftwareRenderer, type Pass, type PingPong } from "@/lib/webgl/ping-pong";

export interface InkBloomLink {
  /** Link text. */
  label: string;
  /** Destination. */
  href: string;
}

export interface InkBloomColumn {
  /** Column heading. */
  title: string;
  /** Links under it. */
  links: InkBloomLink[];
}

export interface InkBloomFooterProps extends Omit<ComponentProps<"footer">, "children"> {
  /** The giant wordmark, bottom left. @default "Fernwick" */
  wordmark?: ReactNode;
  /** Centered testimonial at the top. Pass null to leave it out. */
  quote?: { text: ReactNode; cite: ReactNode } | null;
  /** Link columns, middle right. @default Product, Company and Help */
  columns?: InkBloomColumn[];
  /** Ink colors (hex); each new stroke takes the next. @default yellow, magenta and indigo */
  inks?: string[];
  /** A watercolor wash already resting along the bottom. @default true */
  resting?: boolean;
  /** Paper color behind everything (hex). @default "#f6f1e6" */
  paper?: string;
  /** Small line bottom right, e.g. the copyright. */
  note?: ReactNode;
  /** Called with the color of each new stroke. */
  onInk?: (color: string) => void;
}

const INKS = ["#f2b705", "#e0457b", "#3b3a98"];
const DEFAULT_COLUMNS: InkBloomColumn[] = [
  { title: "Product", links: ["Notebooks", "Templates", "Pricing", "Changelog"].map((label) => ({ label, href: "#" })) },
  { title: "Company", links: ["About", "Journal", "Careers", "Press kit"].map((label) => ({ label, href: "#" })) },
  { title: "Help", links: ["Support", "Guides", "Status", "Contact"].map((label) => ({ label, href: "#" })) },
];
const MAX_STAMPS = 24;

/* ----------------------------------------------------------------------------------- shaders */

const NOISE = /* glsl */ `
float hash(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { return 0.55 * vnoise(p) + 0.28 * vnoise(p * 2.07) + 0.17 * vnoise(p * 4.31); }
`;

/** Adds water and pigment under the queued brush stamps. Deposits pass through. */
const SPLAT = /* glsl */ `
uniform sampler2D u_s0;
uniform sampler2D u_s1;
uniform vec4 u_stamps[${MAX_STAMPS}];
uniform int u_count;
uniform vec3 u_ink;
uniform float u_aspect;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
void main() {
  vec4 c = texture(u_s0, v_uv);
  for (int i = 0; i < ${MAX_STAMPS}; i++) {
    if (i >= u_count) break;
    vec4 st = u_stamps[i];
    vec2 d = v_uv - st.xy;
    d.x *= u_aspect;
    float f = smoothstep(1.0, 0.4, length(d) / st.z);
    c.r += f * st.w;
    c.gba += f * st.w * u_ink;
  }
  c.r = min(c.r, 1.4);
  o0 = c;
  o1 = texture(u_s1, v_uv);
}`;

/**
 * One simulation step. Water flows to drier neighbours through paper whose permeability comes from
 * noise (dry paper resists until a neighbour is quite wet: the branching, cauliflower edges), carrying
 * pigment with it. Water evaporates fastest at the thin wet front, so flow and pigment head for the
 * edge and settle there (dark rims). Fresh water pushing into drying pigment lifts some of it again
 * (pale back-runs).
 */
const UPDATE = /* glsl */ `
uniform sampler2D u_s0;
uniform sampler2D u_s1;
uniform vec2 u_texel;
uniform vec2 u_size;
uniform float u_dt;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
${NOISE}
float perm(vec2 uv) {
  float n = fbm(uv * u_size / 7.0);
  return mix(0.2, 1.0, smoothstep(0.28, 0.72, n));
}
void main() {
  vec4 c = texture(u_s0, v_uv);
  vec4 d = texture(u_s1, v_uv);
  float pc = perm(v_uv);
  vec2 offs[4] = vec2[](vec2(1.0, 0.0), vec2(-1.0, 0.0), vec2(0.0, 1.0), vec2(0.0, -1.0));
  float dw = 0.0;
  vec3 dp = vec3(0.0);
  vec3 rhoC = c.gba / max(c.r, 0.03);
  for (int i = 0; i < 4; i++) {
    vec2 uv2 = v_uv + offs[i] * u_texel;
    vec4 q = texture(u_s0, uv2);
    float pq = perm(uv2);
    float f = (q.r - c.r) * 0.24 * min(pc, pq);
    // Dry paper resists until the neighbour is quite wet; rougher paper resists more.
    if (c.r < 0.012 && q.r < 0.05 + 0.24 * (1.0 - pc)) f = 0.0;
    if (q.r < 0.012 && c.r < 0.05 + 0.24 * (1.0 - pq)) f = 0.0;
    dw += f;
    dp += f > 0.0 ? f * (q.gba / max(q.r, 0.03)) : f * rhoC;
  }
  float w = c.r + dw;
  vec3 s = max(c.gba + dp, 0.0);
  float front = smoothstep(0.2, 0.0, w) * step(0.0005, w);
  w = max(0.0, w - u_dt * (0.05 + 0.32 * front));
  float rate = clamp(u_dt * (0.15 + 3.0 * smoothstep(0.26, 0.0, w)), 0.0, 1.0);
  if (w < 0.003) rate = 1.0;
  vec3 dep = s * rate;
  vec3 lift = d.rgb * clamp(max(dw, 0.0) * 4.0 * step(0.04, w), 0.0, 0.3);
  o0 = vec4(w, s - dep + lift);
  o1 = vec4(d.rgb + dep - lift, 0.0);
}`;

/** Paper, the resting wash and the ink, mixed subtractively (absorbances add). */
const COMPOSITE = /* glsl */ `
uniform sampler2D u_s0;
uniform sampler2D u_s1;
uniform vec2 u_texel;
uniform vec2 u_res;
uniform vec3 u_paper;
uniform float u_time;
uniform float u_fade;
uniform float u_resting;
uniform vec4 u_quiet;
uniform vec3 u_wash0;
uniform vec3 u_wash1;
uniform vec3 u_wash2;
out vec4 fragColor;
${NOISE}
vec3 washAt(float t) {
  t = fract(t) * 3.0;
  return t < 1.0 ? mix(u_wash0, u_wash1, t) : t < 2.0 ? mix(u_wash1, u_wash2, t - 1.0) : mix(u_wash2, u_wash0, t - 2.0);
}
void main() {
  vec2 uv = v_uv;
  vec4 s = texture(u_s0, uv);
  vec3 dep = texture(u_s1, uv).rgb;
  // Deposits denser than their surroundings read as a darker rim.
  vec3 around = (texture(u_s1, uv + vec2(u_texel.x * 2.0, 0.0)).rgb + texture(u_s1, uv - vec2(u_texel.x * 2.0, 0.0)).rgb + texture(u_s1, uv + vec2(0.0, u_texel.y * 2.0)).rgb + texture(u_s1, uv - vec2(0.0, u_texel.y * 2.0)).rgb) * 0.25;
  vec3 rim = max(dep - around, 0.0) * 1.6;
  vec3 a = (s.gba * 0.8 + dep + rim) * (1.0 + 0.3 * s.r) * u_fade;
  if (u_resting > 0.0) {
    float x = uv.x;
    float line = 0.22 + 0.022 * sin(x * 6.3 + u_time * 0.12) + 0.05 * (fbm(vec2(x * 4.0, u_time * 0.03)) - 0.5);
    float depth = line - uv.y;
    float band = smoothstep(-0.002, 0.07, depth);
    float gran = fbm(uv * u_res / 26.0);
    vec3 col = washAt(x * 0.55 + u_time * 0.01 + 0.08 * fbm(uv * 3.0));
    a += col * band * (0.5 + 0.35 * gran) * u_resting;
    a += col * smoothstep(0.01, 0.0, abs(depth - 0.006)) * 0.45 * u_resting;
    float fringe = smoothstep(0.0, -0.012, depth) * smoothstep(-0.034, -0.014, depth);
    a += vec3(0.16, 0.035, 0.0) * fringe * u_resting;
  }
  // Lighter ink under the link columns so the links stay easy to read.
  float q = smoothstep(0.0, 0.035, min(min(uv.x - u_quiet.x, u_quiet.z - uv.x), min(uv.y - u_quiet.y, u_quiet.w - uv.y)));
  a *= mix(1.0, 0.32, q);
  float grain = vnoise(uv * u_res / 1.7);
  fragColor = vec4(u_paper * exp(-a) * (0.975 + 0.035 * grain), 1.0);
}`;

/** Absorbance of an ink: how much of each channel a unit of it takes out of white paper. */
const absorb = (hex: string, strength = 1): [number, number, number] => hexToRgb(hex).map((v) => -Math.log(Math.max(0.03, v / 255)) * strength) as [number, number, number];

/* --------------------------------------------------------------------------------- component */

/**
 * A site footer on warm paper where dragging in the lower half drops ink that blooms with feathered,
 * cauliflower edges behind a giant wordmark. A watercolor wash rests along the bottom with a wavy
 * waterline, a pale cyan fringe and slowly drifting color. Strokes deposit water and pigment that
 * spread for a few seconds through paper texture, darken at their rims as they dry and leave pale
 * back-runs where fresh water meets drying pigment; each stroke takes the next ink and colors mix
 * where they meet. "Clear ink" fades it all away.
 *
 * A WebGL2 simulation with half-float ping-pong targets at reduced resolution (src/lib/webgl/ping-pong),
 * composited at full resolution; it stops stepping once everything is dry, pauses offscreen and in
 * hidden tabs and caps DPR at 2. Without WebGL2 or float targets, on software GPUs and under reduced
 * motion, strokes stamp SVG bloom blobs over a static wash. A normal footer with real links that
 * stay above the ink at 4.5:1.
 */
export function InkBloomFooter({
  wordmark = "Fernwick",
  quote = { text: "I only meant to check the pricing page. Forty minutes later I was still dropping ink at the bottom of it.", cite: "A reader, probably" },
  columns = DEFAULT_COLUMNS,
  inks = INKS,
  resting = true,
  paper = "#f6f1e6",
  note = "© 2026 Fernwick Paper Co.",
  onInk,
  className,
  style,
  ...props
}: InkBloomFooterProps) {
  const id = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion();
  const footerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inkAreaRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLElement>(null);
  const blobsRef = useRef<HTMLDivElement>(null);
  const [hasInk, setHasInk] = useState(false);
  const engine = useRef<{ clear: () => void } | null>(null);
  const live = useRef({ inks, onInk, resting });
  useEffect(() => {
    live.current = { inks, onInk, resting };
  });

  useEffect(() => {
    const footer = footerRef.current;
    const canvas = canvasRef.current;
    const area = inkAreaRef.current;
    if (!footer || !canvas || !area) return;
    const rng = createRandom(`ink:${id}`);
    let strokes = 0;
    let drawing = false;
    let last: { x: number; y: number } | null = null;
    const queue: number[] = [];
    let currentInk = live.current.inks[0] ?? INKS[0];
    let activeUntil = 0;
    let addStamp: (x: number, y: number, r: number, strength: number) => void = () => {};
    let clearAll: () => void = () => {};
    let disposeGl = () => {};

    /* ------------------------------------------------------------ WebGL path */
    const gl = reduceMotion ? null : canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "low-power" });
    const format = gl && !isSoftwareRenderer(gl) ? halfFloatFormat(gl) : null;
    const passes = gl && format ? { splat: createPass(gl, SPLAT), update: createPass(gl, UPDATE), composite: createPass(gl, COMPOSITE) } : null;
    const usable = !!(gl && format && passes?.splat && passes.update && passes.composite);
    // Which renderer is in use, for CSS: the canvas or the static wash and SVG blobs.
    footer.dataset.ink = usable ? "gl" : "fallback";

    if (usable && gl && format && passes) {
      const { splat, update, composite } = passes as { splat: Pass; update: Pass; composite: Pass };
      let sim: PingPong | null = null;
      let simW = 1;
      let simH = 1;
      let width = 1;
      let height = 1;
      let time = 0;
      let lastDraw = 0;
      let fade = 1;
      const quiet = [2, 2, 2, 2];
      const paperRgb = hexToRgb(paper).map((v) => v / 255);

      const measureQuiet = () => {
        const cols = columnsRef.current;
        if (!cols) return;
        const f = footer.getBoundingClientRect();
        const b = cols.getBoundingClientRect();
        quiet[0] = (b.left - f.left - 12) / f.width;
        quiet[2] = (b.right - f.left + 12) / f.width;
        quiet[1] = 1 - (b.bottom - f.top + 12) / f.height;
        quiet[3] = 1 - (b.top - f.top - 12) / f.height;
      };

      addStamp = (x, y, r, strength) => {
        if (queue.length > MAX_STAMPS * 4 * 6) return;
        queue.push(x / width, 1 - y / height, r / height, strength);
        activeUntil = performance.now() + 12000;
        loop.wake();
      };
      clearAll = () => {
        animate(1, 0, {
          duration: 0.6,
          ease: "easeOut",
          onUpdate: (v) => {
            fade = v;
            loop.redraw();
          },
          onComplete: () => {
            sim?.clear();
            queue.length = 0;
            fade = 1;
            loop.redraw();
          },
        });
      };

      // The simulation runs at a fixed 90 steps per second, so ink spreads at the same pace on any display.
      const STEPS_PER_SECOND = 90;
      let carry = 0;
      const step = (dt: number) => {
        if (!sim) return;
        const s = sim;
        if (queue.length) {
          const n = Math.min(MAX_STAMPS, queue.length / 4);
          const stamps = new Float32Array(MAX_STAMPS * 4);
          stamps.set(queue.splice(0, n * 4));
          const ink = absorb(currentInk, 0.42);
          splat.draw(s.write, (p) => {
            bindTexture(gl, p, "u_s0", s.read.textures[0], 0);
            bindTexture(gl, p, "u_s1", s.read.textures[1], 1);
            gl.uniform4fv(p.uniform("u_stamps"), stamps);
            gl.uniform1i(p.uniform("u_count"), n);
            gl.uniform3fv(p.uniform("u_ink"), ink);
            gl.uniform1f(p.uniform("u_aspect"), width / height);
          });
          s.swap();
        }
        carry += Math.min(0.1, dt) * STEPS_PER_SECOND;
        const steps = Math.min(8, Math.floor(carry));
        carry -= steps;
        for (let k = 0; k < steps; k++) {
          update.draw(s.write, (p) => {
            bindTexture(gl, p, "u_s0", s.read.textures[0], 0);
            bindTexture(gl, p, "u_s1", s.read.textures[1], 1);
            gl.uniform2f(p.uniform("u_texel"), 1 / simW, 1 / simH);
            gl.uniform2f(p.uniform("u_size"), simW, simH);
            gl.uniform1f(p.uniform("u_dt"), 1 / STEPS_PER_SECOND);
          });
          s.swap();
        }
      };

      const draw = () => {
        if (!sim) return;
        const s = sim;
        const wash = live.current.inks.slice(0, 3);
        while (wash.length < 3) wash.push(INKS[wash.length]);
        composite.draw(null, (p) => {
          bindTexture(gl, p, "u_s0", s.read.textures[0], 0);
          bindTexture(gl, p, "u_s1", s.read.textures[1], 1);
          gl.uniform2f(p.uniform("u_texel"), 1 / simW, 1 / simH);
          gl.uniform2f(p.uniform("u_res"), canvas.width, canvas.height);
          gl.uniform3fv(p.uniform("u_paper"), paperRgb);
          gl.uniform1f(p.uniform("u_time"), time);
          gl.uniform1f(p.uniform("u_fade"), fade);
          gl.uniform1f(p.uniform("u_resting"), live.current.resting ? 1 : 0);
          gl.uniform4f(p.uniform("u_quiet"), quiet[0], quiet[1], quiet[2], quiet[3]);
          gl.uniform3fv(p.uniform("u_wash0"), absorb(wash[0], 0.42));
          gl.uniform3fv(p.uniform("u_wash1"), absorb(wash[1], 0.42));
          gl.uniform3fv(p.uniform("u_wash2"), absorb(wash[2], 0.42));
        });
      };

      const loop = runCanvasLoop({
        host: footer,
        canvas,
        // Without a resting wash there is nothing to draw once the ink is dry: stop until the next stroke.
        isPaused: () => !live.current.resting && performance.now() > activeUntil && fade === 1,
        resize: ({ width: w, height: h, dpr }) => {
          width = w;
          height = h;
          // Simulate at about a third of the display resolution; composite at full.
          const scale = Math.min(1, 420 / Math.max(w, h)) * Math.min(dpr, 1.5);
          simW = Math.max(16, Math.round(w * scale * 0.85));
          simH = Math.max(16, Math.round(h * scale * 0.85));
          if (sim) sim.resize(simW, simH);
          else sim = createPingPong(gl, simW, simH, format, 2);
          measureQuiet();
        },
        render: ({ dt }) => {
          const now = performance.now();
          const wet = now < activeUntil;
          if (dt > 0) time += dt;
          if (wet && dt > 0) step(dt);
          // While dry, only the resting wash drifts: redraw it about 12 times a second.
          if (dt > 0 && !wet && (!live.current.resting || now - lastDraw < 80)) return;
          lastDraw = now;
          draw();
        },
      });
      disposeGl = () => {
        loop.dispose();
        sim?.dispose();
        splat.dispose();
        update.dispose();
        composite.dispose();
      };
    } else {
      /* ---------------------------------------------------------- fallback path */
      addStamp = (x, y, r) => {
        const host = blobsRef.current;
        if (!host || host.childElementCount > 160) return;
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        const size = r * 3.2;
        svg.setAttribute("viewBox", "-50 -50 100 100");
        svg.setAttribute("aria-hidden", "true");
        Object.assign(svg.style, { position: "absolute", left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px`, overflow: "visible", opacity: "0", transition: "opacity 600ms ease-out", mixBlendMode: "multiply" });
        // A flat wash of the ink with a darker rim, roughened into a bloom by the turbulence filter.
        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("r", String(28 + rng.range(-4, 6)));
        circle.setAttribute("fill", currentInk);
        circle.setAttribute("fill-opacity", "0.34");
        circle.setAttribute("stroke", currentInk);
        circle.setAttribute("stroke-opacity", "0.6");
        circle.setAttribute("stroke-width", "2.5");
        circle.setAttribute("filter", `url(#${id}-bloom)`);
        svg.appendChild(circle);
        host.appendChild(svg);
        requestAnimationFrame(() => (svg.style.opacity = "0.62"));
      };
      clearAll = () => {
        const host = blobsRef.current;
        if (!host) return;
        host.style.transition = "opacity 600ms ease-out";
        host.style.opacity = "0";
        window.setTimeout(() => {
          host.replaceChildren();
          host.style.transition = "";
          host.style.opacity = "1";
        }, 620);
      };
    }

    /* ------------------------------------------------------------ input */
    const local = (e: PointerEvent) => {
      const b = footer.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top };
    };
    const stampAlong = (to: { x: number; y: number }) => {
      const from = last ?? to;
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      const spacing = usable ? 4.5 : 22;
      const n = Math.max(1, Math.floor(dist / spacing));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        addStamp(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, rng.range(20, 32), rng.range(0.26, 0.48));
      }
      last = to;
    };
    const begin = (p: { x: number; y: number }) => {
      drawing = true;
      last = null;
      const list = live.current.inks.length ? live.current.inks : INKS;
      currentInk = list[strokes % list.length];
      strokes += 1;
      live.current.onInk?.(currentInk);
      setHasInk(true);
      stampAlong(p);
    };
    let pending: { x: number; y: number; id: number; timer: number } | null = null;
    let holdBlock = false;
    const onTouchMove = (e: TouchEvent) => {
      if (holdBlock) e.preventDefault();
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as Element).closest("a, button, input, textarea, select")) return;
      const p = local(e);
      if (e.pointerType === "touch") {
        // On touch, a vertical drag keeps scrolling the page. A horizontal drag, or a 150ms hold, draws.
        pending = {
          ...p,
          id: e.pointerId,
          timer: window.setTimeout(() => {
            if (!pending) return;
            holdBlock = true;
            begin({ x: pending.x, y: pending.y });
            pending = null;
          }, 150),
        };
        return;
      }
      area.setPointerCapture(e.pointerId);
      begin(p);
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (pending && e.pointerId === pending.id) {
        const dx = p.x - pending.x;
        const dy = p.y - pending.y;
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          window.clearTimeout(pending.timer);
          const start = { x: pending.x, y: pending.y };
          pending = null;
          begin(start);
        } else if (Math.abs(dy) > 8) {
          window.clearTimeout(pending.timer);
          pending = null;
        }
      }
      if (drawing) stampAlong(p);
    };
    const onUp = () => {
      if (pending) window.clearTimeout(pending.timer);
      pending = null;
      drawing = false;
      holdBlock = false;
      last = null;
    };
    area.addEventListener("pointerdown", onDown);
    area.addEventListener("pointermove", onMove);
    area.addEventListener("pointerup", onUp);
    area.addEventListener("pointercancel", onUp);
    area.addEventListener("touchmove", onTouchMove, { passive: false });
    engine.current = { clear: () => clearAll() };

    return () => {
      engine.current = null;
      if (pending) window.clearTimeout(pending.timer);
      area.removeEventListener("pointerdown", onDown);
      area.removeEventListener("pointermove", onMove);
      area.removeEventListener("pointerup", onUp);
      area.removeEventListener("pointercancel", onUp);
      area.removeEventListener("touchmove", onTouchMove);
      disposeGl();
    };
  }, [id, paper, reduceMotion]);

  const clear = () => {
    engine.current?.clear();
    setHasInk(false);
  };

  const halo = { textShadow: `0 0 6px ${paper}, 0 0 14px ${paper}, 0 0 2px ${paper}` } as CSSProperties;
  const [w0, w1, w2] = [inks[0] ?? INKS[0], inks[1] ?? INKS[1], inks[2] ?? INKS[2]];

  return (
    <footer ref={footerRef} className={cn("group/ink @container relative isolate w-full overflow-hidden text-[#1c1917]", className)} style={{ backgroundColor: paper, ...style }} {...props}>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden size-full group-data-[ink=gl]/ink:block" />

      {/* Fallback: a static wash and SVG bloom blobs. */}
      <svg aria-hidden="true" className="absolute size-0">
        <defs>
          <filter id={`${id}-bloom`} x="-40%" y="-40%" width="180%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="26" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <linearGradient id={`${id}-wash`} x1="0" x2="1">
            <stop offset="0%" stopColor={w0} />
            <stop offset="50%" stopColor={w1} />
            <stop offset="100%" stopColor={w2} />
          </linearGradient>
        </defs>
      </svg>
      {resting ? (
        <svg aria-hidden="true" viewBox="0 0 1000 200" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 hidden h-[24%] w-full overflow-visible group-data-[ink=fallback]/ink:block">
          <path d="M-60 40 L0 40 C120 18 220 52 340 34 S560 14 680 38 S880 58 1000 30 L1060 30 V280 H-60Z" fill={`url(#${id}-wash)`} opacity="0.42" filter={`url(#${id}-bloom)`} />
          <path d="M0 40 C120 18 220 52 340 34 S560 14 680 38 S880 58 1000 30" fill="none" stroke="#7fd6e6" strokeOpacity="0.55" strokeWidth="3" filter={`url(#${id}-bloom)`} />
        </svg>
      ) : null}
      <div ref={blobsRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" />

      <div className="relative px-6 pt-16 pb-8 @3xl:px-12 @3xl:pt-20">
        {quote ? (
          <figure className="mx-auto max-w-2xl text-center">
            <blockquote className="font-display text-[clamp(1.35rem,3.2cqi,2rem)] leading-snug text-balance" style={halo}>
              “{quote.text}”
            </blockquote>
            <figcaption className="mt-4 text-[14px] text-[#57534e]" style={halo}>
              {quote.cite}
            </figcaption>
          </figure>
        ) : null}

        {/* The ink area: everything from here down. Links stay clickable; anywhere else draws. */}
        <div ref={inkAreaRef} className="relative mt-16 touch-pan-y select-none @3xl:mt-24">
          <div className="grid gap-10 @3xl:grid-cols-[1fr_auto] @3xl:items-start">
            <div style={halo}>
              <p className="font-display text-[clamp(1.75rem,4cqi,2.5rem)] leading-tight font-bold">Leave a mark.</p>
              <p className="mt-2 text-[15px] text-[#57534e]">Drag anywhere down here to drop ink.</p>
              <AnimatePresence>
                {hasInk ? (
                  <motion.button
                    type="button"
                    onClick={clear}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[#8a827c] bg-[#f6f1e6]/80 px-3.5 text-[13px] font-semibold text-[#1c1917] outline-none hover:bg-[#ece6d8] focus-visible:ring-2 focus-visible:ring-[#c2410c] active:scale-[0.96]"
                  >
                    <Eraser className="size-3.5" aria-hidden="true" />
                    Clear ink
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </div>
            <nav ref={columnsRef} aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-8 @lg:grid-cols-3">
              {columns.map((col) => (
                <div key={col.title}>
                  <p className="text-[11px] font-semibold tracking-[0.06em] text-[#57534e] uppercase" style={halo}>
                    {col.title}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <a href={link.href} className="rounded-sm text-[15px] text-[#1c1917] underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#c2410c]" style={halo}>
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <div className="mt-20 flex flex-col gap-4 @3xl:mt-28 @3xl:flex-row @3xl:items-end @3xl:justify-between">
            <p className="font-display text-[clamp(3.5rem,15cqi,11rem)] leading-[0.8] font-bold tracking-[-0.03em] text-[#1c1917]">{wordmark}</p>
            {note ? (
              <p className="text-[13px] text-[#57534e] @3xl:pb-3" style={halo}>
                {note}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
