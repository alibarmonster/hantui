"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { nightTint, palette } from "@/lib/line-art/daynight";
import { createFigure, type Figure } from "@/lib/line-art/figures";
import { GROUND } from "@/lib/line-art/gait";
import { PEN, el, inkDefs, type Point } from "@/lib/line-art/ink";
import { runSceneLoop } from "@/lib/line-art/loop";
import { pendulum, pointerWind, rng, type Pendulum } from "@/lib/line-art/physics";

export type StreetFigure = "commuter" | "cyclist" | "child" | "shopkeeper";

export interface LineArtStreetProps extends Omit<ComponentProps<"div">, "children"> {
  /** Pins the time of day: 0 is midnight, 0.5 is noon. Leave it out to let the day run. */
  tau?: number;
  /** Seconds from dawn to nightfall while the day runs. @default 60 */
  dayLength?: number;
  /** Time of day the scene opens on. @default 0.34 */
  startTau?: number;
  /** The flat accent for awnings, flowers and the bicycle frame. @default "#c8553d" */
  accent?: string;
  /** Who is on the street: a list of figures, or how many to take from the default order. @default all four */
  figures?: StreetFigure[] | number;
  /** Let people, windows, birds and the sun react to the pointer. @default true */
  interactive?: boolean;
  /** Start paused. The Pause button toggles it from there. @default false */
  paused?: boolean;
  /** Content laid over the paper, such as a headline. */
  children?: ReactNode;
}

/** The street is drawn in these units. Figures are scaled down into it. */
const W = 520;
const TOP = -52;
const BOTTOM = 136;
const S = 0.55;
/** Pen widths in street units, matched to the figures' scaled strokes. */
const P = PEN * S;
const D = P * 0.5;
const ALL: StreetFigure[] = ["commuter", "cyclist", "child", "shopkeeper"];
const SECOND_ACCENT = "#3d4a8f";
const SECOND_ACCENT_VAR = "var(--la-accent-2)";

const TIME_NAMES = ["Midnight", "Night", "Dawn", "Morning", "Noon", "Afternoon", "Dusk", "Night", "Midnight"];
const timeName = (tau: number) => TIME_NAMES[Math.round((((tau % 1) + 1) % 1) * 8)];

export function LineArtStreet({
  tau,
  dayLength = 60,
  startTau = 0.34,
  accent = "#c8553d",
  figures,
  interactive = true,
  paused = false,
  children,
  className,
  style,
  ...props
}: LineArtStreetProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const [isPaused, setIsPaused] = useState(paused);
  const control = useRef<{ paused: boolean; setTau: (value: number) => void; wake: () => void }>({ paused, setTau: () => {}, wake: () => {} });
  const latest = useRef({ tau, dayLength, interactive });
  useEffect(() => {
    latest.current = { tau, dayLength, interactive };
    control.current.paused = isPaused;
    control.current.wake();
  });
  const cast = (typeof figures === "number" ? ALL.slice(0, Math.max(0, figures)) : (figures ?? ALL)).join(",");

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;
    svg.replaceChildren();
    const controls = control.current;
    const random = rng(235);
    const who = cast ? (cast.split(",") as StreetFigure[]) : [];

    // ---- Layers, back to front.
    const defs = el("defs", {}, svg);
    const skyGradient = el("linearGradient", { id: `${id}-sky`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    const skyTop = el("stop", { offset: 0 }, skyGradient);
    const skyLow = el("stop", { offset: 1 }, skyGradient);
    const halo = el("radialGradient", { id: `${id}-halo` }, defs);
    el("stop", { offset: 0, "stop-color": "#ffd98a", "stop-opacity": 0.95 }, halo);
    el("stop", { offset: 1, "stop-color": "#ffd98a", "stop-opacity": 0 }, halo);
    el("rect", { x: 0, y: TOP, width: W, height: GROUND - TOP, fill: `url(#${id}-sky)` }, svg);
    const stars = el("g", { fill: "#f4f1ff" }, svg);
    const starDots = Array.from({ length: 26 }, () => {
      const star = el("circle", { cx: random() * W, cy: TOP + 4 + random() * 46, r: 0.5 + random() * 0.5 }, stars);
      return { star, phase: random() * 6.28, rate: 1 + random() * 2 };
    });
    const sky = el("g", {}, svg);
    const sun = el("circle", { r: 9, fill: "#ffd77a", stroke: "currentColor", "stroke-width": P }, sky);
    const moon = el("path", { d: "M0 -8a8 8 0 1 0 6.9 12 6.4 6.4 0 1 1 -6.9 -12z", fill: "#f1eedc", stroke: "currentColor", "stroke-width": P }, sky);
    const grab = el("circle", { r: 16, fill: "transparent", style: "cursor:grab;touch-action:none" }, sky);
    const filter = inkDefs(svg, `${id}-ink`, 5);
    svg.querySelector(`#${id}-ink feDisplacementMap`)?.setAttribute("scale", String(0.45 * S + 0.1));
    const drawing = el("g", { filter }, svg);
    const scenery = el("g", {}, drawing);
    const moving = el("g", {}, drawing);
    const glow = el("g", { style: "mix-blend-mode:screen" }, svg);
    const hits = el("g", { fill: "transparent" }, svg);

    // ---- Drawing helpers, in street units.
    const stroke = { fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" } as const;
    const ink = (d: string, width = P, parent: Element = scenery) => el("path", { d, ...stroke, "stroke-width": width }, parent);
    const paper = (d: string, parent: Element = scenery) => el("path", { d, ...stroke, fill: "var(--la-paper)", "stroke-width": P }, parent);
    const flat = (d: string, color = "var(--la-accent)", parent: Element = scenery) => el("path", { d, ...stroke, fill: color, "stroke-width": P }, parent);
    const box = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}z`;
    const sign = (text: string, x: number, y: number, size = 5.4) => {
      const node = el("text", { x, y, "font-size": size, "text-anchor": "middle", fill: "currentColor", "letter-spacing": 0.9, "font-weight": 600 }, scenery);
      node.textContent = text.toUpperCase();
    };
    /** Short dashes in rows: brick courses, drawn with the detail pen and left mostly as paper. */
    const courses = (x: number, y: number, w: number, h: number) => {
      let d = "";
      for (let row = y + 3; row < y + h - 1; row += 5) for (let n = 0; n < w / 22; n++) d += `M${(x + 3 + random() * (w - 12)).toFixed(1)} ${row}h${(3 + random() * 5).toFixed(1)}`;
      ink(d, D);
    };
    const windows: { lit: boolean; pane: SVGElement }[] = [];
    /** A window: frame, mullions, a warm pane on the glow layer and a click target that toggles its light. */
    const windowAt = (x: number, y: number, w: number, h: number, columns: number, rows: number, startsLit: boolean) => {
      paper(box(x, y, w, h));
      let d = "";
      for (let c = 1; c < columns; c++) d += `M${x + (w / columns) * c} ${y}v${h}`;
      for (let r = 1; r < rows; r++) d += `M${x} ${y + (h / rows) * r}h${w}`;
      ink(d, D);
      ink(`M${x - 1.5} ${y + h + 1}h${w + 3}`);
      const pane = el("rect", { x: x - 2, y: y - 2, width: w + 4, height: h + 4, rx: 2, fill: "#ffd98a", opacity: 0 }, glow);
      const entry = { lit: startsLit, pane };
      windows.push(entry);
      const target = el("rect", { x, y, width: w, height: h, style: "cursor:pointer" }, hits);
      target.addEventListener("click", () => {
        if (!latest.current.interactive) return;
        entry.lit = !entry.lit;
        paint();
      });
    };
    const door = (x: number, w: number) => {
      paper(box(x, GROUND - 58, w, 58));
      ink(`M${x + 3} ${GROUND - 54}h${w - 6}v22h${-(w - 6)}zM${x + w - 4.5} ${GROUND - 26}v3`, D);
    };
    /** A striped awning from y to y + drop. */
    const awning = (x: number, y: number, w: number, drop: number, stripes: number) => {
      paper(`M${x} ${y}h${w}l4 ${drop}h${-(w + 8)}z`);
      for (let i = 0; i < stripes; i += 2) {
        const a = x + (w / stripes) * i;
        const b = x + (w / stripes) * (i + 1);
        const spread = (v: number) => x - 4 + ((v - x) / w) * (w + 8);
        flat(`M${a} ${y}H${b}L${spread(b)} ${y + drop}H${spread(a)}z`);
      }
    };

    // ---- Things that hang, and sway with the wind.
    const hanging: { state: Pendulum; length: number; draw: (angle: number) => void }[] = [];
    const hang = (x: number, y: number, length: number, make: (group: SVGGElement) => void) => {
      const group = el("g", {}, scenery);
      make(group);
      hanging.push({ state: { angle: 0, velocity: 0 }, length, draw: (angle) => group.setAttribute("transform", `rotate(${((angle * 180) / Math.PI).toFixed(2)} ${x} ${y})`) });
    };

    const R = -12;
    const F = 48;
    // Tram rails along the whole street.
    ink(`M0 ${GROUND + 7}H${W}M0 ${GROUND + 10}H${W}`, D);

    // A. The bakery.
    paper(box(8, R, 104, GROUND - R));
    ink(`M8 ${R + 5}h104M8 ${F}h104`);
    courses(10, R + 6, 100, F - R - 8);
    windowAt(22, 2, 28, 34, 2, 2, true);
    windowAt(70, 2, 28, 34, 2, 2, false);
    paper(box(20, F + 1.5, 80, 9));
    sign("Fernwick", 60, F + 8.2);
    awning(12, F + 13, 96, 9, 12);
    windowAt(16, F + 26, 54, 36, 1, 1, false);
    // Bread in the window: loaves, a baguette and a round.
    ink(`M22 ${GROUND - 14}q5 -8 10 0zM36 ${GROUND - 14}q6 -9 12 0zM52 ${GROUND - 14}q5 -7 10 0zM24 ${GROUND - 26}l16 -3M46 ${GROUND - 27}a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M20 ${GROUND - 14}h46M20 ${GROUND - 24}h46`, D);
    door(78, 24);

    // B. The bookshop, a little taller, with a cat in the middle window.
    paper(box(116, R - 8, 90, GROUND - R + 8));
    ink(`M116 ${R - 3}h90M116 ${F}h90`);
    courses(118, R - 2, 86, F - R);
    windowAt(124, -6, 18, 38, 1, 2, false);
    windowAt(152, -6, 18, 38, 1, 2, true);
    windowAt(180, -6, 18, 38, 1, 2, false);
    paper(`M156 32q0 -9 3 -10l1 -3l1.6 3h2l1.6 -3l1 3q3 3 2.4 10z`);
    ink(`M166.6 32q4 -1 3 -6`, D);
    paper(box(126, F + 1.5, 70, 9));
    sign("Brightloom Books", 161, F + 8.2, 4.8);
    windowAt(122, F + 16, 50, 46, 3, 2, false);
    let books = "";
    for (let shelf = 0; shelf < 2; shelf++) for (let b = 0; b < 15; b++) books += `M${124.5 + b * 3.1} ${F + 36 + shelf * 23}v${-(5 + random() * 6).toFixed(1)}`;
    ink(books, D);
    door(178, 22);

    // C. The flower stall, in front of a low garden wall.
    paper(box(210, 30, 56, GROUND - 30));
    courses(212, 32, 52, 22);
    ink(`M210 30h56`);
    paper(`M212 56h52v7q-4.3 5 -8.6 0q-4.3 5 -8.7 0q-4.3 5 -8.7 0q-4.3 5 -8.6 0q-4.3 5 -8.7 0q-4.3 5 -8.7 0z`);
    ink(`M216 63V${GROUND}M260 63V${GROUND}`);
    for (const [bx, n] of [[222, 4], [238, 5], [252, 4]] as const) {
      paper(`M${bx - 6} ${GROUND - 20}h12l-2 20h-8z`);
      let stems = "";
      for (let i = 0; i < n; i++) {
        const fx = bx - 5 + (10 / (n - 1)) * i;
        const fy = GROUND - 28 - random() * 8;
        stems += `M${bx - 3 + i * 1.5} ${GROUND - 20}L${fx.toFixed(1)} ${fy.toFixed(1)}`;
        flat(`M${(fx - 2.4).toFixed(1)} ${fy.toFixed(1)}a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0`, i % 2 ? "var(--la-accent)" : "var(--la-paper)");
      }
      ink(stems, D);
    }
    for (const rx of [226, 239, 251]) hang(rx, 63, 9, (group) => flat(`M${rx - 1.2} 63v11l1.2 -2l1.2 2v-11z`, "var(--la-accent)", group));

    // The street lamp.
    ink(`M272 ${GROUND}V40q0 -8 8 -8M269 ${GROUND}h6`);
    paper(`M276 32h9l-1.6 8h-5.8z`);
    const lampGlow = el("circle", { cx: 280.5, cy: 38, r: 34, fill: `url(#${id}-halo)`, opacity: 0 }, glow);

    // D. The tram stop.
    ink(`M286 ${GROUND}V56M348 ${GROUND}V56`);
    paper(`M280 56q37 -9 74 0v4h-74z`);
    ink(`M290 64v40h54v-40M308 64v40M326 64v40`, D);
    paper(box(294, GROUND - 16, 46, 3.5));
    ink(`M298 ${GROUND - 12}v12M336 ${GROUND - 12}v12M358 ${GROUND}V38`);
    paper(`M352 32a6 6 0 1 0 12 0a6 6 0 1 0 -12 0`);
    sign("T", 358, 34.2, 6.5);

    // E. The corner café.
    paper(box(366, R - 4, 146, GROUND - R + 4));
    ink(`M366 ${R + 1}h146M366 ${F}h146`);
    courses(368, R + 2, 142, F - R - 4);
    windowAt(380, 0, 26, 36, 2, 2, true);
    windowAt(426, 0, 26, 36, 2, 2, false);
    windowAt(472, 0, 26, 36, 2, 2, true);
    paper(box(398, F + 1.5, 82, 9));
    sign("Café Halvane", 439, F + 8.2);
    awning(372, F + 13, 134, 9, 16);
    // The awning's fringe: a row of short tabs that swing together.
    for (let i = 0; i < 12; i++) {
      const fx = 374 + i * 11.6;
      hang(fx, F + 22, 5, (group) => ink(`M${fx} ${F + 22}v3.4`, P, group));
    }
    windowAt(374, F + 26, 58, 36, 2, 1, false);
    door(440, 24);
    windowAt(472, F + 26, 34, 36, 1, 1, false);
    // A hanging sign on a bracket.
    ink(`M366 44h-13`);
    hang(357, 44, 12, (group) => {
      paper(`M350 47h14v10h-14z`, group);
      ink(`M353 44v3M361 44v3M354 52h6`, D, group);
    });
    // A bistro table and two chairs.
    ink(`M388 ${GROUND - 20}h18M397 ${GROUND - 20}V${GROUND}M393 ${GROUND}h8`);
    ink(`M378 ${GROUND - 30}v30M378 ${GROUND - 14}h9v14M378 ${GROUND - 30}q3 -3 6 0M416 ${GROUND - 30}v30M416 ${GROUND - 14}h-9v14M416 ${GROUND - 30}q-3 -3 -6 0`, D * 1.4);

    // The pavement line, drawn last so it sits over the walls' feet.
    ink(`M0 ${GROUND + 0.6}Q130 ${GROUND + 1.4} 260 ${GROUND + 0.4}T${W} ${GROUND + 0.8}`);

    // A wire between the roofs, and three birds on it.
    ink(`M112 ${R}Q240 ${R + 16} 366 ${R - 4}`, D);
    const wireY = (x: number) => {
      const t = (x - 112) / 254;
      return (1 - t) * (1 - t) * R + 2 * (1 - t) * t * (R + 16) + t * t * (R - 4);
    };
    const birds = [196, 214, 252].map((home, i) => {
      const group = el("g", {}, moving);
      el("path", { d: "M-3 0q0 -4.5 3 -4.5q2.6 0 3.2 2.4l2 0.6l-2 0.5q-0.6 3.6 -3.2 3.6q-3 0 -3 -2.6z", ...stroke, fill: "var(--la-paper)", "stroke-width": P }, group);
      el("path", { d: "M-2.6 0l-3 1.6", ...stroke, "stroke-width": D }, group);
      return { group, home, x: home, y: wireY(home), away: 0, hop: random() * 4, seed: i };
    });
    const birdTarget = el("rect", { x: 186, y: R - 6, width: 78, height: 22, style: "cursor:pointer" }, hits);
    const scatter = () => {
      if (!latest.current.interactive) return;
      for (const bird of birds) if (bird.away <= 0) bird.away = 0.001;
      loop.wake();
    };
    birdTarget.addEventListener("click", scatter);
    birdTarget.addEventListener("pointerenter", scatter);

    // ---- People.
    interface Walker {
      kind: StreetFigure;
      figure: Figure;
      x: number;
      direction: 1 | -1;
      scale: number;
      pace: number;
      wait: number;
    }
    const people: Walker[] = [];
    const accentVar = "var(--la-accent)";
    const add = (kind: StreetFigure, figure: Figure, x: number, direction: 1 | -1, scale: number, pace: number) => {
      const person = { kind, figure, x, direction, scale, pace, wait: 0 };
      people.push(person);
      // A generous, invisible area over the figure takes the click.
      const target = el("rect", { x: -figure.reach, y: 18, width: figure.reach * 2, height: 104, fill: "transparent", style: "cursor:pointer" }, figure.group);
      target.addEventListener("click", () => {
        if (!latest.current.interactive) return;
        if (loop.reduced()) {
          figure.still(true);
          window.setTimeout(() => !disposed && stillFrame(), 1200);
        } else figure.react();
      });
      return person;
    };
    let broom: SVGElement | null = null;
    let dog: SVGGElement | null = null;
    let dogLegs: SVGElement | null = null;
    let leash: SVGElement | null = null;
    let bikeGlow: SVGElement | null = null;
    if (who.includes("shopkeeper")) {
      add("shopkeeper", createFigure(moving, "courier", { accent: accentVar, bare: true }), 96, 1, S, 0);
      broom = el("path", { ...stroke, "stroke-width": P * 1.2 }, moving);
    }
    if (who.includes("child")) {
      const group = el("g", {}, moving);
      dog = el("g", {}, group);
      el("path", { d: "M-9 -9q0 -4 5 -4h9q4 0 5 -4l3 -1l1 -3l1.6 3l3.4 1.4l-1 2.6l-3 0.4q-1 6 -6 7.6h-13q-5 0 -5 -3z", ...stroke, fill: "var(--la-paper)", "stroke-width": P / 0.36 / 2.2 }, dog);
      dogLegs = el("path", { ...stroke, "stroke-width": P / 0.36 / 2.2 }, dog);
      leash = el("path", { ...stroke, "stroke-width": D }, moving);
      add("child", createFigure(moving, "courier", { accent: accentVar, bare: true }), 330, -1, S * 0.68, 0.82);
    }
    if (who.includes("commuter")) add("commuter", createFigure(moving, "commuter", { accent: SECOND_ACCENT_VAR }), 150, 1, S, 1);
    if (who.includes("cyclist")) {
      add("cyclist", createFigure(moving, "cyclist", { accent: accentVar }), 440, -1, S, 0.75);
      bikeGlow = el("circle", { r: 16, fill: `url(#${id}-halo)`, opacity: 0 }, glow);
    }

    // ---- Time of day.
    let now = latest.current.tau ?? startTau;
    let painted = -1;
    let time = 0;
    let disposed = false;
    let dragging = false;
    function paint() {
      const colors = palette(now);
      root!.style.setProperty("--la-paper", colors.paper);
      root!.style.setProperty("--la-ink", colors.ink);
      root!.style.setProperty("--la-accent", nightTint(accent, now));
      root!.style.setProperty("--la-accent-2", nightTint(SECOND_ACCENT, now));
      skyTop.setAttribute("stop-color", colors.sky[0]);
      skyLow.setAttribute("stop-color", colors.sky[1]);
      stars.setAttribute("opacity", colors.night.toFixed(3));
      // By day a lit window barely shows; at night it glows.
      for (const entry of windows) entry.pane.setAttribute("opacity", entry.lit ? (0.12 + colors.night * 0.78).toFixed(3) : "0");
      lampGlow.setAttribute("opacity", colors.night.toFixed(3));
      bikeGlow?.setAttribute("opacity", colors.night.toFixed(3));
      // The sun crosses by day and the moon by night, on the same arc.
      const t = ((now % 1) + 1) % 1;
      const along = colors.moon ? (t > 0.5 ? (t - 0.77) / 0.48 : (t + 0.23) / 0.48) : (t - 0.25) / 0.52;
      const bx = 36 + Math.min(1, Math.max(0, along)) * (W - 72);
      const by = 4 - colors.height * 40;
      sun.setAttribute("transform", `translate(${bx.toFixed(1)} ${by.toFixed(1)})`);
      moon.setAttribute("transform", `translate(${bx.toFixed(1)} ${by.toFixed(1)})`);
      grab.setAttribute("transform", `translate(${bx.toFixed(1)} ${by.toFixed(1)})`);
      sun.setAttribute("opacity", colors.moon ? "0" : "1");
      moon.setAttribute("opacity", colors.moon ? "1" : "0");
      painted = now;
      const slider = sliderRef.current;
      if (slider && !dragging && document.activeElement !== slider) slider.value = t.toFixed(3);
      slider?.setAttribute("aria-valuetext", timeName(t));
    }
    controls.setTau = (value) => {
      now = value;
      paint();
      if (loop.reduced()) stillFrame();
    };

    // ---- Layout: the street crops to its center in narrow containers.
    let view = W;
    function layout() {
      const narrow = root!.clientWidth < 520;
      view = narrow ? 300 : W;
      const x = narrow ? 118 : 0;
      svg!.setAttribute("viewBox", `${x} ${TOP} ${view} ${BOTTOM - TOP}`);
      // Fewer figures when cropped: the cyclist and the child stay home.
      for (const person of people) person.figure.group.style.display = narrow && (person.kind === "cyclist" || person.kind === "child") ? "none" : "";
      if (dog) dog.style.display = narrow ? "none" : "";
      if (leash) leash.style.display = narrow ? "none" : "";
    }

    function place(person: Walker) {
      person.figure.group.setAttribute("transform", `translate(${person.x.toFixed(2)} ${(GROUND * (1 - person.scale)).toFixed(2)}) scale(${(person.direction * person.scale).toFixed(3)} ${person.scale})`);
    }

    function drawExtras(sweep: number) {
      const keeper = people.find((person) => person.kind === "shopkeeper");
      if (keeper && broom) {
        // The broom swings from the hands; its head brushes the pavement.
        const hand: Point = [keeper.x + 4, GROUND - 28];
        const head: Point = [keeper.x + 15 + Math.sin(sweep) * 7, GROUND - 0.5];
        broom.setAttribute("d", `M${hand[0]} ${hand[1]}L${head[0].toFixed(2)} ${head[1]}M${(head[0] - 3.5).toFixed(2)} ${head[1]}h7`);
      }
      const child = people.find((person) => person.kind === "child");
      if (child && dog && dogLegs && leash) {
        const dx = child.x + child.direction * 21;
        const trot = time * 9;
        dog.setAttribute("transform", `translate(${dx.toFixed(2)} ${GROUND}) scale(${(child.direction * 0.36).toFixed(3)} 0.36)`);
        const step = (phase: number) => (Math.sin(trot + phase) * 3.4).toFixed(2);
        dogLegs.setAttribute("d", `M-6 -8l${step(0)} 8M-2 -8l${step(3.14)} 8M8 -8l${step(3.14)} 8M12 -8l${step(0)} 8M-9 -11q-5 ${(-3 + Math.sin(trot * 1.6) * 2).toFixed(2)} -6 -8`);
        leash.setAttribute("d", `M${(child.x + child.direction * 5).toFixed(2)} ${GROUND - 21}Q${(child.x + child.direction * 13).toFixed(2)} ${GROUND - 9} ${(dx + child.direction * 3.6).toFixed(2)} ${GROUND - 6.4}`);
      }
      const rider = people.find((person) => person.kind === "cyclist");
      if (rider && bikeGlow) {
        bikeGlow.setAttribute("cx", (rider.x + rider.direction * 9).toFixed(1));
        bikeGlow.setAttribute("cy", String(GROUND - 19));
      }
    }

    function stillFrame() {
      // Reduced motion: one figure mid-stride, everyone else at rest, at whatever time is set.
      people.forEach((person, i) => {
        if (i === people.findIndex((p) => p.kind === "commuter")) person.figure.step(0, 1, 0);
        else person.figure.still();
        place(person);
      });
      for (const item of hanging) item.draw(0);
      for (const bird of birds) bird.group.setAttribute("transform", `translate(${bird.home} ${wireY(bird.home) - 3.4})`);
      drawExtras(0.6);
      paint();
    }

    const wind = pointerWind(root);
    const loop = runSceneLoop({
      host: root,
      isPaused: () => controls.paused,
      still: stillFrame,
      tick: (dt, clock) => {
        time = clock;
        const fixed = latest.current.tau;
        if (fixed !== undefined) now = fixed;
        // Dawn to nightfall is 0.6 of a day.
        else if (!dragging) now = (now + (0.6 / Math.max(1, latest.current.dayLength)) * dt) % 1;
        if (Math.abs(now - painted) > 0.0015) paint();
        const gust = latest.current.interactive ? wind.read(dt) : 0;
        const breeze = gust + Math.sin(clock * 0.7) * 0.05;

        for (const person of people) {
          if (person.kind === "shopkeeper") {
            person.figure.step(dt, 0, breeze);
            place(person);
            continue;
          }
          if (person.wait > 0) {
            person.wait -= dt;
            continue;
          }
          person.x += person.figure.step(dt, person.pace, breeze) * person.scale * person.direction;
          // Off one end, a short wait, then back in from the other.
          if (person.x > W + 40 || person.x < -40) {
            person.x = person.direction === 1 ? -40 : W + 40;
            person.wait = 1.5 + random() * 4;
          }
          place(person);
        }
        drawExtras(clock * 2.6);
        for (const item of hanging) item.draw(pendulum(item.state, breeze * 9, dt, item.length, 1.6));

        // Birds hop on the wire, take off when startled and come back after a while.
        for (const bird of birds) {
          if (bird.away > 0) {
            bird.away += dt;
            const out = Math.min(1, bird.away / 1.2);
            const back = Math.min(1, Math.max(0, (bird.away - 6) / 1.4));
            const lift = out * (1 - back);
            bird.x = bird.home + lift * (40 + bird.seed * 26) * (bird.seed % 2 ? 1 : -1);
            bird.y = wireY(bird.home) - 3.4 - lift * (34 + bird.seed * 7) - Math.sin(bird.away * 18) * 1.2 * (lift > 0.05 && lift < 0.98 ? 1 : 0);
            if (back >= 1) bird.away = 0;
          } else {
            bird.hop += dt;
            const hop = bird.hop % 4 < 0.25 ? Math.sin(((bird.hop % 4) / 0.25) * Math.PI) * 1.6 : 0;
            bird.x = bird.home;
            bird.y = wireY(bird.home) - 3.4 - hop;
          }
          bird.group.setAttribute("transform", `translate(${bird.x.toFixed(2)} ${bird.y.toFixed(2)})`);
        }
        const night = palette(now).night;
        if (night > 0.05) for (const dot of starDots) dot.star.setAttribute("opacity", (0.55 + Math.sin(clock * dot.rate + dot.phase) * 0.45).toFixed(2));
      },
    });

    // ---- Dragging the sun or moon scrubs the time.
    const onGrab = (event: PointerEvent) => {
      if (!latest.current.interactive || latest.current.tau !== undefined) return;
      dragging = true;
      grab.setPointerCapture(event.pointerId);
    };
    const onDrag = (event: PointerEvent) => {
      if (!dragging) return;
      const rect = svg.getBoundingClientRect();
      const viewX = Number(svg.getAttribute("viewBox")?.split(" ")[0] ?? 0);
      const x = viewX + ((event.clientX - rect.left) / rect.width) * view;
      const along = Math.min(0.995, Math.max(0.005, (x - 36) / (W - 72)));
      now = palette(now).moon ? (0.77 + along * 0.48) % 1 : 0.25 + along * 0.52;
      paint();
      if (loop.reduced()) stillFrame();
    };
    const onRelease = () => {
      dragging = false;
    };
    grab.addEventListener("pointerdown", onGrab);
    grab.addEventListener("pointermove", onDrag);
    grab.addEventListener("pointerup", onRelease);
    grab.addEventListener("pointercancel", onRelease);

    const observer = new ResizeObserver(layout);
    observer.observe(root);
    layout();
    stillFrame();
    controls.wake = loop.wake;
    loop.wake();

    return () => {
      disposed = true;
      controls.setTau = () => {};
      controls.wake = () => {};
      observer.disconnect();
      loop.dispose();
      wind.dispose();
      svg.replaceChildren();
    };
  }, [id, cast, accent, startTau]);

  // Pausing and a pinned time are read by the loop; nudge it when they change.
  useEffect(() => {
    if (tau !== undefined) control.current.setTau(tau);
  }, [tau]);

  const day = palette(tau ?? startTau);
  return (
    <div
      ref={rootRef}
      style={{ "--la-paper": day.paper, "--la-ink": day.ink, "--la-accent": accent, "--la-accent-2": SECOND_ACCENT, ...style } as CSSProperties}
      className={cn("@container relative w-full overflow-hidden rounded-2xl bg-(--la-paper) text-(--la-ink)", className)}
      {...props}
    >
      <svg
        ref={svgRef}
        role="img"
        aria-label="A line drawing of a street: a bakery, a bookshop, a flower stall, a tram stop and a corner café, with people passing by as the day turns to night"
        className="block aspect-[520/188] w-full font-sans text-(--la-ink) @max-[32.5rem]:aspect-[300/188]"
      />
      {children ? <div className="pointer-events-none absolute inset-x-0 top-0 p-5 *:pointer-events-auto">{children}</div> : null}
      <div className="flex items-center gap-3 px-3 pb-3">
        <button
          type="button"
          aria-label={isPaused ? "Play" : "Pause"}
          onClick={() => setIsPaused((value) => !value)}
          className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-(--la-ink)/25 outline-none transition-colors hover:bg-(--la-ink)/10 focus-visible:ring-2 focus-visible:ring-(--la-ink) motion-reduce:hidden"
        >
          {isPaused ? <Play aria-hidden="true" className="size-4" fill="currentColor" strokeWidth={0} /> : <Pause aria-hidden="true" className="size-4" fill="currentColor" strokeWidth={0} />}
        </button>
        <label className="flex min-w-0 flex-1 items-center gap-3 text-xs font-medium">
          <span className="shrink-0">Time of day</span>
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={1}
            step={0.005}
            defaultValue={tau ?? startTau}
            disabled={tau !== undefined}
            aria-valuetext={timeName(tau ?? startTau)}
            onInput={(event) => control.current.setTau(Number(event.currentTarget.value))}
            className="h-10 min-w-0 flex-1 cursor-pointer accent-(--la-ink) disabled:cursor-default disabled:opacity-50"
          />
        </label>
      </div>
    </div>
  );
}