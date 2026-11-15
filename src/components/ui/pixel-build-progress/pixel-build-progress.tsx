"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { runCanvasLoop } from "@/lib/glyph/canvas-loop";
import { createPixelBuffer, drawSprite, spriteSheet, type SpriteSheet } from "@/lib/pixel-art/sprites";

export interface PixelBuildMessage {
  /** The caption shows while progress is below this value (in the same units as `max`). */
  until: number;
  /** Caption text. */
  text: string;
}

export interface PixelBuildPalette {
  /** Sky, top to bottom. */
  sky?: [string, string, string];
  /** The two brick tones. */
  brick?: [string, string];
  /** Mortar between bricks. */
  mortar?: string;
  /** Ground strip. */
  ground?: string;
  /** Workers' vests. */
  vest?: string;
  /** Workers' hard hats and the crane. */
  helmet?: string;
}

export interface PixelBuildProgressProps extends Omit<ComponentProps<"div">, "children"> {
  /** Progress, from 0 to `max`. The wall follows it, adding bricks one at a time. @default 0 */
  value?: number;
  /** Value that counts as complete. @default 100 */
  max?: number;
  /** Play a scripted run of about 30 seconds: build, stall at 99%, finish. Ignores `value`. @default false */
  autoplay?: boolean;
  /** Progress is unknown: workers shuttle bricks back and forth and the wall does not advance. @default false */
  indeterminate?: boolean;
  /** Captions by progress range, in ascending order of `until`. The last one shows from there on. @default installing, almost there, the 99% stall and done */
  messages?: PixelBuildMessage[];
  /** While `value` sits exactly here, the workers sit down and wait. Autoplay stalls at 99 by itself. */
  stallAt?: number;
  /** After finishing, crumble the wall and start the next update. In controlled use the next build starts once `value` drops below `max`. @default false */
  loop?: boolean;
  /** Number of the current update, shown in the first caption from the second update on. @default 1 */
  updateIndex?: number;
  /** How many updates there are in total, for the caption. @default 47 */
  updateTotal?: number;
  /** Size of one scene pixel: 2, 3 or 4 screen pixels. Narrow containers step down by themselves. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Colors to override in the scene. */
  palette?: PixelBuildPalette;
  /** Called once each time progress reaches `max`. */
  onComplete?: () => void;
}

const W = 240;
const H = 40;
const GROUND = 34;
const BRICK_W = 6;
const BRICK_H = 3;
const ROWS = 6;
const COLS = 34;
const WALL_X = 6;
const WALL_TOP = GROUND - ROWS * BRICK_H;
const TOTAL = COLS * ROWS;
const PILE_X = 214;
const SCALE = { sm: 2, md: 3, lg: 4 } as const;

const COLORS = {
  k: "#1d2130",
  s: "#f2c29b",
  h: "#ffc94d",
  v: "#f47b20",
  p: "#33507a",
  b: "#b5533c",
  g: "#8a93a6",
  m: "#f4f4f5",
} as const;

// Worker frames, 8×10, facing right. One character per pixel.
const WORKER_FRAMES: string[][] = [
  /* 0 walk a */ ["..hhhh..", ".hhhhhh.", "..ssss..", "..ssks..", ".vvvvv..", ".vvvvvs.", ".vvvvv..", "..pppp..", "..p..p..", ".kk..kk."],
  /* 1 walk b */ ["..hhhh..", ".hhhhhh.", "..ssss..", "..ssks..", ".vvvvv..", "svvvvv..", ".vvvvv..", "..pppp..", "...pp...", "...kk..."],
  /* 2 walk c */ ["..hhhh..", ".hhhhhh.", "..ssss..", "..ssks..", ".vvvvv..", ".vvvvvs.", ".vvvvv..", "..pppp..", ".p....p.", "kk....kk"],
  /* 3 carry a */ ["..hhhh..", ".hhhhhh.", "..ssss..", "..ssks..", ".vvvvvbb", ".vvvvsbb", ".vvvvv..", "..pppp..", "..p..p..", ".kk..kk."],
  /* 4 carry b */ ["..hhhh..", ".hhhhhh.", "..ssss..", "..ssks..", ".vvvvvbb", ".vvvvsbb", ".vvvvv..", "..pppp..", "...pp...", "...kk..."],
  /* 5 hammer up */ ["..hhhh.g", ".hhhhhhg", "..ssss.k", "..ssksk.", ".vvvvs..", ".vvvvv..", ".vvvvv..", "..pppp..", "..p..p..", ".kk..kk."],
  /* 6 hammer down */ ["..hhhh..", ".hhhhhh.", "..ssss..", "..ssks..", ".vvvvskg", ".vvvvv.g", ".vvvvv..", "..pppp..", "..p..p..", ".kk..kk."],
  /* 7 sit */ ["........", "........", "..hhhh..", ".hhhhhh.", "..ssss..", "..ssks..", ".vvvvv..", ".vvvvvs.", ".vvpppp.", ".kkpppkk"],
  /* 8 sit, mug up */ ["........", "........", "..hhhh..", ".hhhhhh.", "..ssss..", "..ssksm.", ".vvvvvs.", ".vvvvv..", ".vvpppp.", ".kkpppkk"],
  /* 9 sit, foot up */ ["........", "........", "..hhhh..", ".hhhhhh.", "..ssss..", "..ssks..", ".vvvvv..", ".vvvvvs.", ".vvppppk", ".kkppp.k"],
  /* 10 asleep */ ["........", "........", "........", "..hhhh..", ".hhhhhh.", "..ssss..", "..skks..", ".vvvvv..", ".vvpppp.", ".kkpppkk"],
  /* 11 cheer */ ["s.hhhh.s", "shhhhhhs", "v.ssss.v", ".vssksv.", ".vvvvv..", "..vvvv..", "..vvvv..", "..pppp..", "..p..p..", ".kk..kk."],
];

const CLOUD_FRAMES = [
  ["...wwww.....", ".wwwwwwww...", "wwwwwwwwwww.", ".wwwwwwwwwww", "............"],
  ["..www.......", ".wwwwwww....", "wwwwwwwww...", "............", "............"],
];

const DIGITS: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  "%": ["101", "001", "010", "100", "101"],
  ok: ["....1", "...1.", "1.1..", ".1...", "....."],
};

const DEFAULT_SKY: [string, string, string] = ["#8fd0ff", "#a9dcff", "#c6e9ff"];
const DEFAULT_BRICK: [string, string] = ["#b5533c", "#9c4530"];

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

/** Where the scripted run wants progress to be, t seconds in. */
function scripted(t: number) {
  if (t < 8) return (t / 8) * 40;
  if (t < 18) return 40 + ((t - 8) / 10) * 58;
  if (t < 19) return 98 + (t - 18);
  if (t < 25) return 99;
  return 100;
}

function captionFor(percent: number, messages: PixelBuildMessage[] | undefined, cycle: number, total: number) {
  const list = messages ?? [
    { until: 40, text: cycle > 1 ? `Installing update ${cycle} of ${total}` : "Installing update…" },
    { until: 99, text: "Almost there…" },
    { until: 100, text: "99%. Any minute now." },
    { until: Infinity, text: "Done!" },
  ];
  return (list.find((message) => percent < message.until) ?? list[list.length - 1])?.text ?? "";
}

export function PixelBuildProgress({
  value = 0,
  max = 100,
  autoplay = false,
  indeterminate = false,
  messages,
  stallAt,
  loop = false,
  updateIndex = 1,
  updateTotal = 47,
  size = "md",
  palette,
  onComplete,
  className,
  ...props
}: PixelBuildProgressProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Whole percent on screen. It changes at most a hundred times per build, never per frame. */
  const [percent, setPercent] = useState(() => (autoplay ? 0 : Math.round((Math.min(Math.max(value, 0), max) / max) * 100)));
  /** Updates finished since mount, added to `updateIndex`. */
  const [loops, setLoops] = useState(0);
  const cycle = updateIndex + loops;
  const caption = indeterminate ? "Working…" : captionFor((percent / 100) * max, messages, cycle, updateTotal);

  const latest = useRef({ value, max, autoplay, indeterminate, stallAt, loop, onComplete });
  useEffect(() => {
    latest.current = { value, max, autoplay, indeterminate, stallAt, loop, onComplete };
  });
  const redraw = useRef<() => void>(() => {});
  useEffect(() => {
    redraw.current();
  }, [value, max, indeterminate, autoplay]);

  const sky = palette?.sky ?? DEFAULT_SKY;
  const brick = palette?.brick ?? DEFAULT_BRICK;
  const mortar = palette?.mortar ?? "#e2d3bd";
  const ground = palette?.ground ?? "#c79a5b";
  const vest = palette?.vest ?? COLORS.v;
  const helmet = palette?.helmet ?? COLORS.h;
  const sceneKey = [...sky, ...brick, mortar, ground, vest, helmet].join("|");

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const buffer = createPixelBuffer(W, H);
    if (!host || !canvas || !ctx || !buffer) return;
    const b = buffer.ctx;
    const colors = sceneKey.split("|");
    const [sky0, sky1, sky2, brick0, brick1, mortarColor, groundColor, vestColor, helmetColor] = colors;
    const workers: SpriteSheet = spriteSheet(WORKER_FRAMES, { ...COLORS, v: vestColor, h: helmetColor });
    const clouds = spriteSheet(CLOUD_FRAMES, { w: "#ffffff" });
    const random = seededRandom(230);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Scene state. Everything here lives outside React.
    let scale = SCALE[size];
    let view = W;
    let compact = false;
    let shown = latest.current.autoplay ? 0 : (Math.min(Math.max(latest.current.value, 0), latest.current.max) / latest.current.max) * 100;
    let clock = 0;
    let time = 0;
    let doneFor = -1;
    let crumbling = -1;
    let waitingForReset = false;
    let wasStalled = false;
    let jumpUntil = 0;
    let lastPercent = -1;
    /** Seconds the carriers have spent walking. They only walk while there is work. */
    let walk = 0;
    // Fallen bricks: position, velocity, time until each pops, bounces left.
    const fx = new Float32Array(TOTAL);
    const fy = new Float32Array(TOTAL);
    const fvx = new Float32Array(TOTAL);
    const fvy = new Float32Array(TOTAL);
    const fpop = new Float32Array(TOTAL);
    const fstate = new Uint8Array(TOTAL);
    const dust: { x: number; y: number; age: number }[] = [];

    const brickCell = (index: number) => {
      const col = Math.floor(index / ROWS);
      const row = index % ROWS;
      // Running bond: every other course is shifted half a brick.
      return { x: WALL_X + col * BRICK_W + (row % 2 ? BRICK_W / 2 : 0), y: GROUND - (row + 1) * BRICK_H, tone: (col * 7 + row * 3) % 5 < 2 ? 1 : 0 };
    };

    function text(glyphs: string[], x: number, y: number, color: string) {
      b.fillStyle = color;
      let cursor = x;
      for (const glyph of glyphs) {
        const rows = DIGITS[glyph];
        if (!rows) continue;
        for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) if (rows[r][c] === "1") b.fillRect(cursor + c, y + r, 1, 1);
        cursor += rows[0].length + 1;
      }
    }

    function startCrumble() {
      crumbling = 0;
      dust.length = 0;
      for (let i = 0; i < TOTAL; i++) {
        const cell = brickCell(i);
        fx[i] = cell.x;
        fy[i] = cell.y;
        fvx[i] = (random() - 0.5) * 60;
        fvy[i] = -20 - random() * 45;
        fpop[i] = random() * 1.9;
        fstate[i] = 0;
      }
    }

    function advance(dt: number) {
      const now = latest.current;
      time += dt;
      const target = now.autoplay ? scripted(clock) : (Math.min(Math.max(now.value, 0), now.max) / now.max) * 100;
      const stalled = !now.indeterminate && (now.autoplay ? clock >= 19 && clock < 25 : now.stallAt !== undefined && now.value === now.stallAt && Math.abs(shown - target) < 0.5);
      if (wasStalled && !stalled) jumpUntil = time + 0.45;
      wasStalled = stalled;
      if (now.indeterminate || (!stalled && doneFor < 0 && crumbling < 0 && !waitingForReset)) walk += dt;

      if (crumbling >= 0) {
        crumbling += dt;
        for (let i = 0; i < TOTAL; i++) {
          if (fstate[i] === 0) {
            if (crumbling < fpop[i]) continue;
            fstate[i] = 1;
          }
          if (fstate[i] === 4) continue;
          fvy[i] += 170 * dt;
          fx[i] += fvx[i] * dt;
          fy[i] += fvy[i] * dt;
          if (fy[i] >= GROUND - 2) {
            fy[i] = GROUND - 2;
            if (fstate[i] === 1 && dust.length < 28) dust.push({ x: fx[i], y: GROUND - 1, age: 0 });
            fvy[i] *= -0.38;
            fvx[i] *= 0.55;
            fstate[i] += 1;
          }
        }
        for (const puff of dust) puff.age += dt;
        if (crumbling > 3.6) {
          crumbling = -1;
          doneFor = -1;
          shown = 0;
          clock = 0;
          waitingForReset = !now.autoplay;
          setLoops((n) => n + 1);
        }
        return stalled;
      }

      if (waitingForReset) {
        // The next build starts once the caller's value has gone back below max.
        if (target < 100) waitingForReset = false;
        return stalled;
      }
      if (now.autoplay && !(doneFor >= 0 && !now.loop)) clock += dt;
      if (!now.indeterminate) {
        // Bricks go on one at a time: progress never jumps more than a quarter of the wall per second.
        const stepLimit = 26 * dt;
        shown += Math.min(Math.max(target - shown, -stepLimit * 3), stepLimit);
      }
      if (shown >= 99.999 && doneFor < 0) {
        shown = 100;
        doneFor = 0;
        now.onComplete?.();
      } else if (shown < 99.999 && doneFor >= 0 && !now.autoplay) {
        doneFor = -1;
      }
      if (doneFor >= 0) {
        doneFor += dt;
        if (now.loop && doneFor > 2.4) startCrumble();
      }
      return stalled;
    }

    function draw(stalled: boolean, still: boolean) {
      const now = latest.current;
      const placed = crumbling >= 0 ? TOTAL : Math.min(TOTAL, Math.floor((shown / 100) * TOTAL + 0.0001));
      const frontCol = Math.min(COLS, Math.floor(placed / ROWS));
      const frontX = WALL_X + frontCol * BRICK_W;
      const done = doneFor >= 0 && crumbling < 0;
      const building = !done && !stalled && crumbling < 0 && !waitingForReset && !still;

      // Sky, sun and clouds.
      b.fillStyle = sky0;
      b.fillRect(0, 0, W, 12);
      b.fillStyle = sky1;
      b.fillRect(0, 12, W, 11);
      b.fillStyle = sky2;
      b.fillRect(0, 23, W, GROUND - 23);
      b.fillStyle = "#ffe07a";
      b.fillRect(17, 4, 5, 7);
      b.fillRect(16, 5, 7, 5);
      b.fillStyle = "#fff3c4";
      b.fillRect(18, 5, 2, 2);
      const drift = still ? 0 : time;
      drawSprite(b, clouds, 0, ((40 + drift * 4) % (W + 14)) - 14, 3);
      drawSprite(b, clouds, 1, ((150 + drift * 2.6) % (W + 14)) - 14, 9);
      drawSprite(b, clouds, 1, ((90 + drift * 3.3) % (W + 14)) - 14, 1);

      // Power poles and their wire.
      b.fillStyle = "#6b4a2f";
      for (const x of [86, 168]) {
        b.fillRect(x, 9, 1, GROUND - 9);
        b.fillRect(x - 2, 10, 5, 1);
      }
      b.fillStyle = "#3d3a45";
      for (let x = 0; x < W; x += 2) b.fillRect(x, 11 + (Math.abs(((x + 80) % 82) - 41) < 20 ? 1 : 0), 1, 1);

      // The small green building at the far right.
      b.fillStyle = "#2f8f57";
      b.fillRect(222, 13, 16, GROUND - 13);
      b.fillStyle = "#3fae6b";
      b.fillRect(223, 14, 14, GROUND - 14);
      b.fillStyle = "#24774a";
      b.fillRect(221, 12, 18, 2);
      b.fillStyle = "#d9f7e4";
      for (let y = 17; y < 29; y += 5) for (let x = 225; x < 236; x += 4) b.fillRect(x, y, 2, 2);
      b.fillStyle = "#1d2130";
      b.fillRect(229, 29, 3, 5);

      // Ground.
      b.fillStyle = groundColor;
      b.fillRect(0, GROUND, W, H - GROUND);
      b.fillStyle = "rgb(0 0 0 / 0.14)";
      b.fillRect(0, GROUND, W, 1);
      for (let x = 3; x < W; x += 11) b.fillRect(x + ((x * 7) % 5), GROUND + 2 + ((x * 3) % 3), 2, 1);

      // The wall: mortar first, then bricks in two batches, one per tone.
      if (crumbling < 0 && placed > 0) {
        b.fillStyle = mortarColor;
        const full = Math.floor(placed / ROWS);
        if (full > 0) b.fillRect(WALL_X, WALL_TOP, full * BRICK_W, ROWS * BRICK_H);
        if (placed % ROWS) b.fillRect(WALL_X + full * BRICK_W, GROUND - (placed % ROWS) * BRICK_H, BRICK_W, (placed % ROWS) * BRICK_H);
      }
      for (let tone = 0; tone < 2; tone++) {
        b.fillStyle = tone ? brick1 : brick0;
        for (let i = 0; i < placed; i++) {
          const cell = brickCell(i);
          if (cell.tone !== tone) continue;
          if (crumbling >= 0) {
            if (fstate[i] === 0) b.fillRect(cell.x, cell.y, BRICK_W - 1, BRICK_H - 1);
            else b.fillRect(Math.round(fx[i]), Math.round(fy[i]), 4, 2);
          } else {
            const right = Math.min(cell.x + BRICK_W - 1, WALL_X + (frontCol + 1) * BRICK_W - 1);
            b.fillRect(cell.x, cell.y, right - cell.x, BRICK_H - 1);
          }
        }
      }
      b.fillStyle = "rgb(120 110 100 / 0.5)";
      for (const puff of dust) {
        if (puff.age > 0.5) continue;
        const spread = Math.round(puff.age * 8);
        b.fillRect(Math.round(puff.x) - spread, puff.y - Math.round(puff.age * 4), 1, 1);
        b.fillRect(Math.round(puff.x) + 2 + spread, puff.y - 1 - Math.round(puff.age * 3), 1, 1);
      }

      // The pile of bricks the carriers fetch from.
      b.fillStyle = brick1;
      b.fillRect(PILE_X - 5, GROUND - 2, 9, 2);
      b.fillStyle = brick0;
      b.fillRect(PILE_X - 3, GROUND - 4, 6, 2);

      const site = crumbling < 0 && !done;
      const scaffoldX = Math.min(frontX + 1, PILE_X - 22);
      if (site) {
        // Scaffold at the build front.
        b.fillStyle = "#6f7890";
        b.fillRect(scaffoldX, WALL_TOP - 3, 1, GROUND - WALL_TOP + 3);
        b.fillRect(scaffoldX + 9, WALL_TOP - 3, 1, GROUND - WALL_TOP + 3);
        b.fillStyle = "#b98a4f";
        b.fillRect(scaffoldX - 1, WALL_TOP + 7, 12, 1);
        b.fillRect(scaffoldX - 1, GROUND - 5, 12, 1);
        // Crane: mast, jib, cable and a brick on the hook.
        if (!compact) {
          const mast = Math.min(scaffoldX + 16, W - 30);
          b.fillStyle = helmetColor;
          b.fillRect(mast, 3, 2, GROUND - 3);
          b.fillRect(mast - 24, 3, 32, 1);
          b.fillRect(mast - 2, 5, 6, 3);
          b.fillStyle = "#1d2130";
          for (let y = 6; y < GROUND; y += 4) b.fillRect(mast, y, 2, 1);
          b.fillRect(mast - 24, 4, 1, 1);
          const hookX = Math.max(mast - 22, Math.min(frontX + 2, mast - 6));
          const nextRow = placed % ROWS;
          const landing = GROUND - (nextRow + 1) * BRICK_H - 1;
          const cycleT = building ? (time * 0.9) % 1 : 0.4;
          const hookY = 5 + (landing - 5) * Math.min(1, cycleT * 1.4);
          b.fillRect(hookX + 1, 4, 1, Math.max(1, Math.round(hookY) - 4));
          b.fillStyle = brick0;
          b.fillRect(hookX - 1, Math.round(hookY), 5, 2);
        }
      }

      // Workers.
      const jumping = time < jumpUntil;
      const hop = (phase: number) => (done || jumping ? -Math.round(Math.abs(Math.sin(time * 9 + phase)) * 2) : 0);
      const pose = (index: number, x: number, y: number, frame: number, flip = false) => drawSprite(b, workers, frame, x, y + hop(index), { flip });
      const beat = Math.floor(time * 4) % 2;
      const feet = GROUND - 10;
      // The mason hammers at the front.
      const masonX = Math.max(1, Math.min(frontX - 7, W - 30));
      if (done || jumping) pose(0, masonX, feet, 11);
      else if (stalled) pose(0, masonX, feet, 10);
      else pose(0, masonX, feet, still ? 6 : 5 + beat, false);
      // Carriers walk bricks from the pile to the front and come back empty.
      const count = compact ? 1 : 2;
      const dropX = Math.min(scaffoldX + 12, PILE_X - 12);
      const span = Math.max(8, PILE_X - 8 - dropX);
      for (let i = 0; i < count; i++) {
        const t = (i * 0.5 + (still ? 0.2 : walk * 0.11)) % 1;
        const toFront = t < 0.5;
        const along = toFront ? t * 2 : (t - 0.5) * 2;
        const x = toFront ? PILE_X - 8 - along * span : dropX + along * span;
        const step = Math.floor(time * 7 + i) % 4;
        if (done || jumping) pose(1 + i, x, feet, 11);
        else if (stalled) pose(1 + i, x, feet, i === 0 ? 7 + (Math.floor(time * 0.8) % 2) : 7 + (Math.floor(time * 3) % 2) * 2);
        else if (toFront || now.indeterminate) pose(1 + i, x, feet, still ? 3 : 3 + (step % 2), toFront);
        else pose(1 + i, x, feet, still ? 0 : [0, 1, 2, 1][step]);
      }
      if (!compact && site) {
        // One more on the scaffold, and a foreman by the building.
        if (stalled) pose(3, scaffoldX + 1, WALL_TOP - 3, 7);
        else pose(3, scaffoldX + 1, WALL_TOP - 3, done || jumping ? 11 : still ? 6 : 5 + (1 - beat), true);
      }
      if (!compact) {
        const foremanX = 196 + (still ? 0 : Math.round(Math.sin(time * 0.5) * 5));
        if (done || jumping) pose(4, foremanX, feet, 11);
        else if (stalled) pose(4, foremanX, feet, 7);
        else pose(4, foremanX, feet, still ? 0 : [0, 1, 2, 1][Math.floor(time * 3) % 4], Math.cos(time * 0.5) < 0);
      }
      // Zzz over the sleeper.
      if (stalled && !still) {
        b.fillStyle = "#1d2130";
        const rise = Math.floor(time * 2) % 3;
        for (let i = 0; i <= rise; i++) {
          const zx = masonX + 8 + i * 3;
          const zy = feet - 1 - i * 3;
          b.fillRect(zx, zy, 3, 1);
          b.fillRect(zx + 1, zy + 1, 1, 1);
          b.fillRect(zx, zy + 2, 3, 1);
        }
      }

      // The sign rides above the front with the percent, or a check when done.
      if (!now.indeterminate && crumbling < 0) {
        const glyphs = done ? ["ok"] : [...String(Math.min(99, Math.floor(shown))), "%"];
        const width = glyphs.reduce((sum, glyph) => sum + (DIGITS[glyph]?.[0].length ?? 0) + 1, 0) + 3;
        const signX = Math.max(1, Math.min(frontX - Math.floor(width / 2), W - width - 1));
        b.fillStyle = "#1d2130";
        b.fillRect(signX + Math.floor(width / 2), 10, 1, WALL_TOP - 9);
        b.fillRect(signX, 1, width, 9);
        b.fillStyle = done ? "#d9f7e4" : "#ffffff";
        b.fillRect(signX + 1, 2, width - 2, 7);
        text(glyphs, signX + 2, 3, done ? "#24774a" : "#1d2130");
      }

      // Blit: a whole number of screen pixels per scene pixel, following the build front when cropped.
      const camera = Math.round(Math.max(0, Math.min(W - view, frontX - view / 2)));
      ctx!.imageSmoothingEnabled = false;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.drawImage(buffer!.canvas, camera, 0, view, H, 0, 0, view, H);

      const whole = now.indeterminate ? lastPercent : Math.round(Math.min(100, Math.max(0, crumbling >= 0 ? 100 : shown)));
      if (whole !== lastPercent) {
        lastPercent = whole;
        setPercent(whole);
      }
    }

    const loopHandle = runCanvasLoop({
      host,
      canvas,
      resize: (frame) => {
        // Pick the largest whole-number scale that still shows a useful stretch of the site, then
        // size the canvas in scene pixels; CSS scales it up with image-rendering: pixelated.
        scale = SCALE[size];
        while (scale > 1 && frame.width / scale < 96) scale -= 1;
        view = Math.max(40, Math.min(W, Math.floor(frame.width / scale)));
        compact = frame.width < 360;
        canvas.width = view;
        canvas.height = H;
        canvas.style.width = `${view * scale}px`;
        canvas.style.height = `${H * scale}px`;
        host.style.height = `${H * scale}px`;
      },
      render: (frame) => {
        if (frame.still) {
          // Reduced motion: a still scene at the current value.
          const now = latest.current;
          if (!now.autoplay) shown = (Math.min(Math.max(now.value, 0), now.max) / now.max) * 100;
          crumbling = -1;
          draw(false, true);
          return;
        }
        const stalled = advance(frame.dt);
        draw(stalled, false);
      },
    });
    redraw.current = () => {
      loopHandle.wake();
      loopHandle.redraw();
    };

    // Under reduced motion the frame loop is off, so a scripted run steps once a second instead.
    const stepper = window.setInterval(() => {
      if (!reduced.matches || !latest.current.autoplay) return;
      clock += 1;
      if (clock > 28) {
        if (!latest.current.loop) clock = 28;
        else {
          clock = 0;
          setLoops((n) => n + 1);
        }
      }
      const before = shown;
      shown = scripted(clock);
      if (shown >= 100 && before < 100) latest.current.onComplete?.();
      loopHandle.redraw();
    }, 1000);

    return () => {
      window.clearInterval(stepper);
      redraw.current = () => {};
      loopHandle.dispose();
    };
  }, [size, sceneKey]);

  const scale = SCALE[size];
  return (
    <div className={cn("flex w-full flex-col items-center gap-4", className)} {...props}>
      <div
        role="progressbar"
        aria-label="Update progress"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={indeterminate ? undefined : Math.round((percent / 100) * max)}
        aria-valuetext={caption}
        style={{ maxWidth: W * scale + 16 }}
        className="w-full rounded-full bg-[#f6eedd] p-2 shadow-[inset_0_2px_3px_rgb(255_255_255/0.9),inset_0_-2px_4px_rgb(120_90_40/0.18),0_10px_24px_-12px_rgb(60_40_10/0.4)]"
      >
        <div ref={hostRef} style={{ height: H * scale }} className="relative flex w-full justify-center overflow-hidden rounded-full bg-[#a9dcff] shadow-[inset_0_2px_6px_rgb(0_0_0/0.28)]">
          <canvas ref={canvasRef} aria-hidden="true" className="block [image-rendering:pixelated]" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_2px_6px_rgb(0_0_0/0.28)]" />
        </div>
      </div>
      <p aria-live="polite" className="min-h-5 text-center text-sm font-medium text-foreground">
        {caption}
      </p>
    </div>
  );
}
