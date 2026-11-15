"use client";

import { useEffect, useId, useRef, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { createFigure, type FigureKind } from "@/lib/line-art/figures";
import { GROUND } from "@/lib/line-art/gait";
import { DETAIL_PEN, el, inkDefs, line, paint, poly, shape, through, type Point } from "@/lib/line-art/ink";
import { runSceneLoop } from "@/lib/line-art/loop";
import { pointerWind, rng } from "@/lib/line-art/physics";

export interface InkWalkerCardProps extends Omit<ComponentProps<"div">, "children" | "title" | "prop"> {
  /** Who walks across the strip. @default "commuter" */
  figure?: FigureKind;
  /** The one thing standing on the strip. @default "lamp" */
  prop?: "lamp" | "bench" | "mailbox";
  /** Day ink on paper, night ink on indigo, or "auto" to follow the page's dark mode. @default "auto" */
  tone?: "day" | "night" | "auto";
  /** Pace multiplier. 1 is a natural walk. @default 1 */
  speed?: number;
  /** The one flat color, used for the scarf, cap, running top or bicycle frame. @default "#c8553d" */
  accent?: string;
  /** Short title above the strip. */
  title?: ReactNode;
  /** Muted line under the title. */
  description?: ReactNode;
  /** Called when the figure reacts to a click or key press. */
  onReact?: (figure: FigureKind) => void;
}

/** The strip is this many figure units tall: ground at 120, a little room below. */
const VIEW_H = 132;
const NAMES: Record<FigureKind, string> = { commuter: "commuter", courier: "courier", jogger: "jogger", cyclist: "cyclist" };
const PROP_ACTION = { lamp: "Light the lamp", bench: "Shake the tree over the bench", mailbox: "Post a letter" } as const;

export function InkWalkerCard({
  figure = "commuter",
  prop = "lamp",
  tone = "auto",
  speed = 1,
  accent = "#c8553d",
  title,
  description,
  onReact,
  className,
  style,
  ...props
}: InkWalkerCardProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const stripRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const figureButton = useRef<HTMLButtonElement>(null);
  const propButton = useRef<HTMLButtonElement>(null);
  const actions = useRef({ react: () => {}, gag: () => {} });
  const latest = useRef({ speed, onReact });
  useEffect(() => {
    latest.current = { speed, onReact };
  });

  useEffect(() => {
    const strip = stripRef.current;
    const svg = svgRef.current;
    if (!strip || !svg) return;
    svg.replaceChildren();
    const filter = inkDefs(svg, `${id}-ink`, 4);
    const drawing = el("g", { filter }, svg);
    const backdrop = el("g", {}, drawing);
    const propGroup = el("g", {}, drawing);
    const walker = createFigure(drawing, figure, { accent });
    const wind = pointerWind(strip);
    const random = rng(236);
    const marks = Array.from({ length: 14 }, () => [random(), random()] as const);

    let width = 300;
    let scale = 1;
    let x = 40;
    let pace = 1;
    let hovering = false;
    let gagAt = -1;
    let lit = false;
    let stillTimer = 0;
    const propX = () => width * 0.72;

    // The prop: one object, drawn once per layout. Its moving part is redrawn by the gag.
    let gagPart: SVGElement | null = null;
    function layout() {
      const rect = strip!.getBoundingClientRect();
      scale = rect.height / VIEW_H;
      width = Math.max(120, rect.width / scale);
      svg!.setAttribute("viewBox", `0 0 ${width.toFixed(1)} ${VIEW_H}`);
      backdrop.replaceChildren();
      propGroup.replaceChildren();
      // Ground: one long line that is not quite straight, and a few stray marks.
      const ground: Point[] = [];
      for (let gx = -4; gx <= width + 4; gx += width / 9) ground.push([gx, GROUND + 0.8 + Math.sin(gx * 0.07) * 0.5]);
      line(backdrop, through(ground));
      for (const [mx, my] of marks) line(backdrop, poly([[mx * width, GROUND + 3 + my * 5], [mx * width + 4 + my * 6, GROUND + 3 + my * 5]]), DETAIL_PEN);
      const px = propX();
      if (prop === "lamp") {
        line(propGroup, `M${px} ${GROUND}L${px} 34Q${px} 22 ${px + 11} 22`);
        line(propGroup, poly([[px - 3, GROUND], [px + 3, GROUND]]));
        gagPart = paint(propGroup, "var(--la-glow)", `M${px + 5} 22h12l-2.4 10h-7.2z`);
        gagPart.setAttribute("fill-opacity", lit ? "1" : "0");
        line(propGroup, poly([[px + 9, 32], [px + 13, 32]]), DETAIL_PEN);
      } else if (prop === "bench") {
        shape(propGroup, `M${px - 16} ${GROUND - 16}h34v4h-34z`);
        line(propGroup, `M${px - 14} ${GROUND - 12}v12M${px + 16} ${GROUND - 12}v12M${px - 15} ${GROUND - 16}L${px - 17} ${GROUND - 31}M${px + 17} ${GROUND - 16}L${px + 19} ${GROUND - 31}`);
        shape(propGroup, `M${px - 18} ${GROUND - 33}h38v4h-38z`);
        // A branch reaching in from above, where a leaf waits.
        line(propGroup, `M${px + 44} 6Q${px + 22} 12 ${px + 4} 26M${px + 18} 16l-5 -6M${px + 30} 11l-3 7`, DETAIL_PEN * 1.4);
        gagPart = paint(propGroup, accent, "");
      } else {
        line(propGroup, poly([[px, GROUND], [px, GROUND - 26]]));
        paint(propGroup, accent, `M${px - 9} ${GROUND - 46}q9 -9 18 0v20h-18z`);
        line(propGroup, poly([[px - 5, GROUND - 39], [px + 5, GROUND - 39]]), DETAIL_PEN * 1.6);
        gagPart = shape(propGroup, "", DETAIL_PEN * 1.4);
      }
      const button = propButton.current;
      if (button) button.style.transform = `translateX(${(px * scale - 22).toFixed(1)}px)`;
    }

    function drawGag(dt: number) {
      if (gagAt < 0 || !gagPart) return;
      gagAt += dt;
      const px = propX();
      if (prop === "lamp") {
        // A flicker, then it settles on or off.
        const flicker = gagAt < 0.45 ? (Math.floor(gagAt * 22) % 2 ? 0.9 : 0.15) : lit ? 1 : 0;
        gagPart.setAttribute("fill-opacity", String(flicker));
        if (gagAt > 0.5) gagAt = -1;
      } else if (prop === "bench") {
        // The leaf lets go and sways down onto the seat.
        const t = Math.min(1, gagAt / 1.6);
        const lx = px + 6 + Math.sin(t * 9) * 5 * (1 - t);
        const ly = 26 + (GROUND - 44) * t * t * (3 - 2 * t);
        gagPart.setAttribute("d", `M${lx.toFixed(2)} ${ly.toFixed(2)}q4 -4 8 0q-4 4 -8 0z`);
        if (gagAt > 3.2) {
          gagPart.setAttribute("d", "");
          gagAt = -1;
        }
      } else {
        // A letter drops into the slot.
        const t = Math.min(1, gagAt / 0.7);
        const ly = GROUND - 62 + 21 * t * t;
        gagPart.setAttribute("d", t < 1 ? `M${px - 4} ${ly.toFixed(2)}h8v${Math.max(0.5, 6 * (1 - t)).toFixed(2)}h-8z` : "");
        if (t >= 1) gagAt = -1;
      }
    }

    function place() {
      walker.group.setAttribute("transform", `translate(${x.toFixed(2)} 0)`);
      const button = figureButton.current;
      if (button) button.style.transform = `translateX(${(x * scale - 24).toFixed(1)}px)`;
    }

    const loop = runSceneLoop({
      host: strip,
      tick: (dt) => {
        // Hovering slows the walk; the pointer's speed is wind on the scarf and the bag.
        pace += ((hovering ? 0.35 : 1) - pace) * Math.min(1, dt * 5);
        x += walker.step(dt, pace * latest.current.speed, wind.read(dt));
        if (x > width + 44) x = -44;
        place();
        drawGag(dt);
      },
      still: () => {
        x = Math.min(width * 0.36, width - 60);
        walker.still();
        place();
      },
    });

    const observer = new ResizeObserver(() => {
      layout();
      if (loop.reduced()) {
        walker.still();
        x = Math.min(width * 0.36, width - 60);
      }
      place();
    });
    observer.observe(strip);
    layout();
    if (loop.reduced()) walker.still();
    else walker.step(0, 1, 0);
    place();

    const onEnter = (event: PointerEvent) => {
      hovering = event.pointerType === "mouse";
    };
    const onLeave = () => {
      hovering = false;
    };
    strip.addEventListener("pointerenter", onEnter);
    strip.addEventListener("pointerleave", onLeave);

    actions.current = {
      react: () => {
        latest.current.onReact?.(figure);
        if (!loop.reduced()) {
          walker.react();
          return;
        }
        // Reduced motion: swap to the reaction pose for a moment, then back.
        walker.still(true);
        window.clearTimeout(stillTimer);
        stillTimer = window.setTimeout(() => walker.still(), 1200);
      },
      gag: () => {
        if (prop === "lamp") lit = !lit;
        if (loop.reduced()) {
          if (prop === "lamp") gagPart?.setAttribute("fill-opacity", lit ? "1" : "0");
          return;
        }
        gagAt = 0;
      },
    };

    return () => {
      actions.current = { react: () => {}, gag: () => {} };
      window.clearTimeout(stillTimer);
      observer.disconnect();
      loop.dispose();
      wind.dispose();
      strip.removeEventListener("pointerenter", onEnter);
      strip.removeEventListener("pointerleave", onLeave);
      svg.replaceChildren();
    };
  }, [figure, prop, accent, id]);

  const hit = "absolute inset-y-1 left-0 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-(--la-ink) focus-visible:ring-offset-2 focus-visible:ring-offset-(--la-paper)";

  return (
    <div
      style={{ "--la-glow": "#f6c453", ...style } as CSSProperties}
      className={cn(
        "@container w-full max-w-md overflow-hidden rounded-2xl border border-(--la-ink)/15 bg-(--la-paper) text-(--la-ink)",
        tone === "night" ? "[--la-ink:#e9e6f2] [--la-paper:#1d2140]" : "[--la-ink:#1c1c1c] [--la-paper:#fdfcf8]",
        tone === "auto" && "dark:[--la-ink:#e9e6f2] dark:[--la-paper:#1d2140]",
        className,
      )}
      {...props}
    >
      {title || description ? (
        <div className="px-5 pt-5">
          {title ? <h3 className="text-base font-semibold tracking-tight">{title}</h3> : null}
          {description ? <p className="mt-1 text-sm leading-5 opacity-75">{description}</p> : null}
        </div>
      ) : null}
      <div ref={stripRef} className="relative mt-2 h-[clamp(112px,34cqw,180px)] w-full overflow-hidden">
        <svg
          ref={svgRef}
          role="img"
          aria-label={`A line drawing of a ${NAMES[figure]} passing a ${prop}`}
          preserveAspectRatio="xMinYMax meet"
          className="absolute inset-0 size-full text-(--la-ink) [&_path]:[vector-effect:non-scaling-stroke]"
        />
        <button ref={propButton} type="button" aria-label={PROP_ACTION[prop]} onClick={() => actions.current.gag()} className={cn(hit, "w-11")} />
        <button ref={figureButton} type="button" aria-label={`Say hi to the ${NAMES[figure]}`} onClick={() => actions.current.react()} className={cn(hit, "w-12")} />
      </div>
    </div>
  );
}
