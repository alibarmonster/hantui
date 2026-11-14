/**
 * Ink: a tiny, dependency-free SVG drawing kit for line art. Thin, slightly wobbly strokes in
 * `currentColor` over paper-colored fills, so a scene inverts cleanly at night by changing two
 * CSS colors. Browser only: call these from effects.
 */

export type Point = readonly [x: number, y: number];

/** Pen width in figure units (a figure is about 95 units tall). */
export const PEN = 1.35;
/** Width of the detail pen, for mullions, brick courses and other fine marks. */
export const DETAIL_PEN = PEN * 0.5;
/** Day colors. Night swaps them through CSS variables. */
export const INK = "#1c1c1c";
export const PAPER = "#fdfcf8";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Creates an SVG element, sets its attributes and appends it to `parent` when given. */
export function el<K extends keyof SVGElementTagNameMap>(name: K, attributes: Record<string, string | number> = {}, parent?: Element): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, name);
  for (const key in attributes) node.setAttribute(key, String(attributes[key]));
  parent?.appendChild(node);
  return node;
}

/**
 * Adds the one wobble filter a drawing needs and returns its `url(#…)` reference: light
 * turbulence displaces the strokes by under half a unit and a hair of blur softens them, so
 * lines read as ink on paper, not as vectors. Keep it on the drawing group only.
 */
export function inkDefs(svg: SVGSVGElement, id: string, seed = 3) {
  const defs = el("defs", {}, svg);
  const filter = el("filter", { id, x: "-5%", y: "-5%", width: "110%", height: "110%" }, defs);
  el("feTurbulence", { type: "fractalNoise", baseFrequency: 0.6, numOctaves: 1, seed, result: "noise" }, filter);
  el("feDisplacementMap", { in: "SourceGraphic", in2: "noise", scale: 0.45, xChannelSelector: "R", yChannelSelector: "G", result: "moved" }, filter);
  el("feGaussianBlur", { in: "moved", stdDeviation: 0.12 }, filter);
  return `url(#${id})`;
}

const STROKE = { fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" } as const;

/** An open ink line. */
export function line(parent: Element, d = "", width = PEN) {
  return el("path", { d, ...STROKE, "stroke-width": width }, parent);
}

/** A closed outline filled with paper, so it hides what is behind it. */
export function shape(parent: Element, d = "", width = PEN) {
  return el("path", { d, ...STROKE, fill: "var(--la-paper)", "stroke-width": width }, parent);
}

/** A solid ink fill. */
export function blot(parent: Element, d = "") {
  return el("path", { d, fill: "currentColor", stroke: "currentColor", "stroke-width": PEN * 0.5, "stroke-linejoin": "round" }, parent);
}

/** A flat color fill with an ink outline. One or two of these per scene, in small areas. */
export function paint(parent: Element, color: string, d = "", width = PEN) {
  return el("path", { d, ...STROKE, fill: color, "stroke-width": width }, parent);
}

const n = (value: number) => value.toFixed(2);

/** A smooth open path through points (quadratic segments through the midpoints). */
export function through(points: readonly Point[]) {
  if (points.length < 2) return "";
  let d = `M${n(points[0][0])} ${n(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i][0] + points[i + 1][0]) / 2;
    const my = (points[i][1] + points[i + 1][1]) / 2;
    d += `Q${n(points[i][0])} ${n(points[i][1])} ${n(mx)} ${n(my)}`;
  }
  const last = points[points.length - 1];
  return `${d}L${n(last[0])} ${n(last[1])}`;
}

/** A straight polyline. */
export function poly(points: readonly Point[], close = false) {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${n(x)} ${n(y)}`).join("") + (close ? "Z" : "");
}

/** The points of a curve pushed sideways by `offset` (positive is to the left of travel). */
function offsetPoints(points: readonly Point[], offset: number): Point[] {
  return points.map((point, i) => {
    const before = points[Math.max(0, i - 1)];
    const after = points[Math.min(points.length - 1, i + 1)];
    const dx = after[0] - before[0];
    const dy = after[1] - before[1];
    const length = Math.hypot(dx, dy) || 1;
    return [point[0] + (dy / length) * offset, point[1] - (dx / length) * offset] as const;
  });
}

export interface Limb {
  /** Redraws the limb through its joints, root first. */
  set(joints: readonly Point[]): void;
  group: SVGGElement;
}

/**
 * A limb drawn the way a pen would: two open strokes, one down each side of a curve through the
 * joints, with round caps and a paper fill between them. `fill` paints the inside a flat color.
 */
export function limb(parent: Element, width: number, fill = "var(--la-paper)"): Limb {
  const group = el("g", {}, parent);
  const inside = el("path", { fill, stroke: "none" }, group);
  const left = line(group);
  const right = line(group);
  return {
    group,
    set(joints) {
      const a = offsetPoints(joints, width / 2);
      const b = offsetPoints(joints, -width / 2);
      const da = through(a);
      const db = through(b);
      left.setAttribute("d", da);
      right.setAttribute("d", db);
      inside.setAttribute("d", `${da}${through([...b].reverse()).replace("M", "L")}Z`);
    },
  };
}
