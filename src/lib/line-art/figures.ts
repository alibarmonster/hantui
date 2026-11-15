import { gait, joint, standing, GROUND, type GaitPose } from "@/lib/line-art/gait";
import { DETAIL_PEN, PEN, el, limb, line, paint, poly, shape, type Point } from "@/lib/line-art/ink";
import { pendulum, type Pendulum } from "@/lib/line-art/physics";

/**
 * Faceless, open-stroke figures in figure space (about 95 units tall, feet on y = 120, facing
 * +x). Each is one <g>: place it with a single transform. Poses come from the gait solver; hanging
 * things are pendulums; reactions are short keyed arm moves.
 */

export type FigureKind = "commuter" | "courier" | "jogger" | "cyclist";

export interface Figure {
  group: SVGGElement;
  /** Advances the figure by `dt` seconds at `factor` times its usual pace, with `wind` on its loose ends. Returns how far it travelled, in figure units, so feet and wheels never slip. */
  step(dt: number, factor: number, wind: number): number;
  /** Starts the figure's reaction: a tipped hat, a wave, a look at a watch or a rung bell. */
  react(): void;
  /** Draws a still pose. `reacting` holds the reaction at its peak. */
  still(reacting?: boolean): void;
  /** True while a reaction is playing. */
  busy(): boolean;
  /** What the reaction is, for labels: "tips a hat". */
  reaction: string;
  /** Rough half-width of the figure, for hit areas. */
  reach: number;
}

export interface FigureOptions {
  /** Flat accent for one small area: the scarf, the cap, the vest or the frame. */
  accent?: string;
  /** Leave out what the figure carries (the parcel, the briefcase and scarf), for a plain passer-by. */
  bare?: boolean;
}

const UPPER = 16;
const FORE = 15;
const circle = (cx: number, cy: number, r: number) => `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
const ease = (t: number) => t * t * (3 - 2 * t);
/** 0 → 1 → 0 over a reaction: quick in, hold, quick out. */
const envelope = (t: number, length: number) => ease(Math.min(1, Math.max(0, t / 0.3))) * ease(Math.min(1, Math.max(0, (length - t) / 0.35)));

const REACTIONS = {
  commuter: { label: "tips a hat", length: 1.5 },
  courier: { label: "waves", length: 1.7 },
  jogger: { label: "checks a watch", length: 1.7 },
  cyclist: { label: "rings the bell", length: 1.1 },
} as const;

function walker(parent: Element, kind: Exclude<FigureKind, "cyclist">, accent: string, bare: boolean): Figure {
  const group = el("g", {}, parent);
  const running = kind === "jogger";
  const options = running ? { stride: 40, duty: 0.36, lift: 7 } : { stride: 26, duty: 0.62 };
  const cadence = running ? 1.3 : 0.95;
  const lean = running ? 6 : 1.6;
  const torsoLength = 30;

  // Far side first, so the near side draws over it.
  const farArm = limb(group, 4.2);
  const farLeg = limb(group, 5.4);
  const farFoot = line(group);
  const bag = kind === "commuter" && !bare ? shape(group) : null;
  const bagHandle = bag ? line(group, "", DETAIL_PEN) : null;
  const parcel = kind === "courier" && !bare ? shape(group) : null;
  const parcelTape = parcel ? line(group, "", DETAIL_PEN) : null;
  const torso = kind === "jogger" ? paint(group, accent) : shape(group);
  const nearLeg = limb(group, 5.4);
  const nearFoot = line(group);
  const scarf = kind === "commuter" && !bare ? limb(group, 3.4, accent) : null;
  const head = shape(group);
  const hat = kind === "commuter" ? shape(group) : kind === "courier" ? paint(group, accent) : line(group);
  const nearArm = limb(group, 4.2);
  const watch = kind === "jogger" ? line(group, "", PEN * 1.6) : null;

  let phase = 0.1;
  let reactionAt = -1;
  const scarfSwing: Pendulum = { angle: -0.4, velocity: 0 };
  const bagSwing: Pendulum = { angle: 0, velocity: 0 };
  const reaction = REACTIONS[kind];

  function draw(pose: GaitPose, moving: number, wind: number, dt: number) {
    const hip = pose.hip;
    const shoulder: Point = [hip[0] + lean, hip[1] - torsoLength];
    const headAt: Point = [shoulder[0] + 1.6, shoulder[1] - 9.5];
    const w = reactionAt >= 0 ? envelope(reactionAt, reaction.length) : 0;

    // Legs and feet.
    for (const [leg, legLimb, footLine] of [[pose.far, farLeg, farFoot], [pose.near, nearLeg, nearFoot]] as const) {
      legLimb.set([leg.hip, leg.knee, leg.ankle]);
      footLine.setAttribute("d", poly([[leg.ankle[0] - 1.5, leg.ankle[1] + 2.4], leg.toe]));
    }

    // Torso: a coat with a hem, or a short running top.
    const hem = running ? 1 : 6;
    const [sx, sy] = shoulder;
    const [hx, hy] = hip;
    torso.setAttribute(
      "d",
      `M${sx - 6.5} ${sy + 1.5}Q${sx} ${sy - 3.5} ${sx + 6.5} ${sy + 1.5}L${hx + 8} ${hy + hem}Q${hx} ${hy + hem + 2} ${hx - 8} ${hy + hem}Z`,
    );

    // Arms swing against the legs. A reaction takes the near arm to a target with IK.
    const arm = (angle: number, bend: number): [Point, Point] => {
      const elbow: Point = [sx + Math.sin(angle) * UPPER, sy + 2 + Math.cos(angle) * UPPER];
      return [elbow, [elbow[0] + Math.sin(angle + bend) * FORE, elbow[1] + Math.cos(angle + bend) * FORE]];
    };
    const amplitude = (running ? 0.75 : 0.42) * moving;
    const bend = running ? 1.35 : 0.22;
    const [farElbow, farHand] = arm(amplitude * pose.swing, bend + Math.max(0, pose.swing) * 0.3 * moving);
    farArm.set([[sx, sy + 2], farElbow, farHand]);
    // The courier's near arm holds the parcel instead of swinging.
    let [nearElbow, nearHand] = parcel ? arm(0.25, 1.25) : arm(-amplitude * pose.swing, bend + Math.max(0, -pose.swing) * 0.3 * moving);
    if (w > 0) {
      const t = reactionAt;
      const target: Point =
        kind === "commuter"
          ? [headAt[0] + 9, headAt[1] - 5]
          : kind === "courier"
            ? [sx + 15 + Math.sin(t * 11) * 4, sy - 15]
            : [sx + 10, sy + 9];
      nearHand = [nearHand[0] + (target[0] - nearHand[0]) * w, nearHand[1] + (target[1] - nearHand[1]) * w];
      nearElbow = joint([sx, sy + 2], nearHand, UPPER, FORE, 1);
    }
    nearArm.set([[sx, sy + 2], nearElbow, nearHand]);

    // Head, looking down a little while checking a watch.
    const nod = kind === "jogger" ? w * 1.6 : 0;
    const hxp = headAt[0] + nod;
    const hyp = headAt[1] + nod;
    head.setAttribute("d", circle(hxp, hyp, 7));
    if (kind === "commuter") {
      // A brimmed hat that lifts off the head when tipped.
      const up = w * 4.5;
      hat.setAttribute("d", `M${hxp - 9.5} ${hyp - 4 - up}L${hxp + 10} ${hyp - 5 - up}M${hxp - 6} ${hyp - 4.3 - up}Q${hxp} ${hyp - 14 - up} ${hxp + 6.5} ${hyp - 4.8 - up}Z`);
    } else if (kind === "courier") {
      hat.setAttribute("d", `M${hxp - 6.6} ${hyp - 2.5}Q${hxp} ${hyp - 12} ${hxp + 6.8} ${hyp - 3}L${hxp + 12.5} ${hyp - 2}L${hxp + 6.8} ${hyp - 1.2}Z`);
    } else {
      hat.setAttribute("d", `M${hxp - 6.8} ${hyp - 2}L${hxp + 6.8} ${hyp - 3.2}`);
    }

    // Loose ends: the scarf trails behind and the briefcase swings from the far hand.
    if (scarf) {
      const a = pendulum(scarfSwing, -(0.5 + moving * 2.4) + wind * 9, dt, 9, 3);
      const root: Point = [sx - 3.5, sy + 1.5];
      const mid: Point = [root[0] + Math.sin(a) * 8, root[1] + Math.cos(a) * 8];
      scarf.set([root, mid, [mid[0] + Math.sin(a * 1.45) * 8, mid[1] + Math.cos(a * 1.45) * 8]]);
    }
    if (bag && bagHandle) {
      const a = pendulum(bagSwing, -pose.swing * 2.4 * moving + wind * 6, dt, 10, 2.6);
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const at = (x: number, y: number): Point => [farHand[0] + x * cos - y * sin, farHand[1] + x * sin + y * cos];
      bag.setAttribute("d", poly([at(-7, 3), at(7, 3), at(7, 13), at(-7, 13)], true));
      bagHandle.setAttribute("d", poly([at(-3, 3), at(-3, 0.5), at(3, 0.5), at(3, 3)]));
    }
    if (parcel && parcelTape) {
      const px = sx + 2;
      const py = sy + 12;
      parcel.setAttribute("d", poly([[px, py], [px + 13, py - 1], [px + 13.5, py + 9], [px + 0.5, py + 10]], true));
      parcelTape.setAttribute("d", poly([[px + 6.5, py - 0.5], [px + 7, py + 9.5]]));
    }
    if (watch) watch.setAttribute("d", poly([[nearHand[0] - 2.2, nearHand[1] - 3], [nearHand[0] + 1.2, nearHand[1] - 4.4]]));
  }

  return {
    group,
    reaction: reaction.label,
    reach: 16,
    step(dt, factor, wind) {
      const before = phase;
      phase += cadence * factor * dt;
      if (reactionAt >= 0) {
        reactionAt += dt;
        if (reactionAt > reaction.length) reactionAt = -1;
      }
      draw(gait(phase, options), Math.min(1, factor), wind, dt);
      return ((phase - before) * options.stride) / options.duty;
    },
    react() {
      reactionAt = 0;
    },
    still(reacting = false) {
      reactionAt = reacting ? reaction.length / 2 : -1;
      scarfSwing.angle = -0.25;
      scarfSwing.velocity = 0;
      bagSwing.angle = 0;
      bagSwing.velocity = 0;
      draw(standing(), 0, 0, 0);
      reactionAt = -1;
    },
    busy: () => reactionAt >= 0,
  };
}

function cyclist(parent: Element, accent: string): Figure {
  const group = el("g", {}, parent);
  const R = 13;
  const rear: Point = [-18, GROUND - R];
  const front: Point = [20, GROUND - R];
  const bracket: Point = [-1, GROUND - R + 1.5];
  const saddle: Point = [-8, 80];
  const bars: Point = [14, 79];
  const headTube: Point = [13, 86];
  const hip: Point = [-7, 77.5];
  const shoulder: Point = [6.5, 55];
  const headAt: Point = [11, 46.5];
  const CRANK = 6.5;

  const farArm = limb(group, 4);
  const farLeg = limb(group, 5.2);
  const farPedal = line(group);
  // Wheels turn as groups, spokes and all.
  const wheels = [rear, front].map((hub) => {
    const wheel = el("g", {}, group);
    shape(wheel, circle(hub[0], hub[1], R));
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      line(wheel, poly([[hub[0] - Math.cos(a) * (R - 1), hub[1] - Math.sin(a) * (R - 1)], [hub[0] + Math.cos(a) * (R - 1), hub[1] + Math.sin(a) * (R - 1)]]), DETAIL_PEN);
    }
    return { wheel, hub };
  });
  // Frame: one flat accent, the rest ink.
  paint(group, accent, poly([bracket, [saddle[0] + 1, saddle[1] + 3], headTube], true), PEN);
  line(group, poly([rear, bracket]) + poly([rear, [saddle[0] + 1, saddle[1] + 3]]) + poly([headTube, front]) + poly([headTube, bars]) + poly([[bars[0] - 2, bars[1] - 1], [bars[0] + 3, bars[1] + 1.5]]));
  line(group, poly([[saddle[0] - 4, saddle[1]], [saddle[0] + 4, saddle[1] - 0.6]]), PEN * 1.5);
  const cranks = line(group);
  const lamp = paint(group, "var(--la-glow, #f6c453)", circle(headTube[0] + 3.5, headTube[1] - 2, 1.8), DETAIL_PEN);
  lamp.setAttribute("data-lamp", "");
  const torso = shape(group);
  const nearLeg = limb(group, 5.2);
  const nearPedal = line(group);
  const head = shape(group);
  const helmet = paint(group, accent);
  const nearArm = limb(group, 4);
  const bell = line(group, "", DETAIL_PEN);

  let distance = 0;
  let reactionAt = -1;
  const reaction = REACTIONS.cyclist;

  function draw() {
    // Rolling without slipping: the wheel's angle is the distance travelled over its radius.
    const wheelAngle = (distance / R) * (180 / Math.PI);
    for (const { wheel, hub } of wheels) wheel.setAttribute("transform", `rotate(${wheelAngle.toFixed(2)} ${hub[0]} ${hub[1]})`);
    const crankAngle = (distance / R) * 0.42;
    const pedal = (offset: number): Point => [bracket[0] + Math.cos(crankAngle + offset) * CRANK, bracket[1] + Math.sin(crankAngle + offset) * CRANK];
    const near = pedal(0);
    const far = pedal(Math.PI);
    cranks.setAttribute("d", poly([far, near]));
    for (const [foot, legLimb, pedalLine] of [[far, farLeg, farPedal], [near, nearLeg, nearPedal]] as const) {
      const ankle: Point = [foot[0] - 1.5, foot[1] - 3];
      legLimb.set([hip, joint(hip, ankle, 21, 21, -1), ankle]);
      pedalLine.setAttribute("d", poly([[foot[0] - 3.5, foot[1]], [foot[0] + 4, foot[1] - 0.6]]));
    }
    torso.setAttribute("d", `M${hip[0] - 5.5} ${hip[1] + 2}Q${hip[0] - 5} ${shoulder[1] + 4} ${shoulder[0] - 3} ${shoulder[1] - 2}Q${shoulder[0] + 3} ${shoulder[1] - 3} ${shoulder[0] + 5} ${shoulder[1] + 3}L${hip[0] + 6} ${hip[1] + 3}Z`);
    head.setAttribute("d", circle(headAt[0], headAt[1], 6.8));
    helmet.setAttribute("d", `M${headAt[0] - 7} ${headAt[1] - 1.5}Q${headAt[0]} ${headAt[1] - 12} ${headAt[0] + 7.4} ${headAt[1] - 1}Z`);
    const grip: Point = [bars[0] + 0.5, bars[1]];
    const start: Point = [shoulder[0] + 1, shoulder[1] + 2];
    farArm.set([start, joint(start, grip, 15, 14, -1), grip]);
    // Ringing the bell: the thumb works and three short marks flash by the bars.
    const w = reactionAt >= 0 ? envelope(reactionAt, reaction.length) : 0;
    const press: Point = [grip[0] - 1.5 + Math.sin(reactionAt * 24) * 0.8 * w, grip[1] - 1.5 * w];
    nearArm.set([start, joint(start, press, 15, 14, -1), press]);
    const flash = w > 0 && Math.floor(reactionAt * 9) % 2 === 0;
    bell.setAttribute("d", flash ? `M${bars[0] + 5} ${bars[1] - 5}l3 -3M${bars[0] + 6.5} ${bars[1] - 1.5}l4 -0.6M${bars[0] + 2.5} ${bars[1] - 7}l1 -4` : "");
  }

  return {
    group,
    reaction: reaction.label,
    reach: 34,
    step(dt, factor) {
      const moved = 118 * factor * dt;
      distance += moved;
      if (reactionAt >= 0) {
        reactionAt += dt;
        if (reactionAt > reaction.length) reactionAt = -1;
      }
      draw();
      return moved;
    },
    react() {
      reactionAt = 0;
    },
    still(reacting = false) {
      reactionAt = reacting ? 0.34 : -1;
      draw();
      reactionAt = -1;
    },
    busy: () => reactionAt >= 0,
  };
}

/** Builds a figure inside `parent`. It draws nothing until its first `step` or `still`. */
export function createFigure(parent: Element, kind: FigureKind, options: FigureOptions = {}): Figure {
  const accent = options.accent ?? "#c8553d";
  return kind === "cyclist" ? cyclist(parent, accent) : walker(parent, kind, accent, options.bare ?? false);
}
