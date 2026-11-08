"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type KeyboardEvent } from "react";
import { animate, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { RollingDigits } from "@/components/ui/rolling-digits/rolling-digits";

export interface MergeFilterOption {
  /** Stable value reported in the selection. */
  value: string;
  /** Text on the chip and in the pill. */
  label: string;
  /** Results this option matches on its own; used for the count when there is no `getCount`. */
  count?: number;
}

export interface MergeFilterChipsProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange"> {
  /** The chips, in their resting order. */
  options: MergeFilterOption[];
  /** Selected values, in the order they joined the pill. Controlled when set. */
  value?: string[];
  /** Initial selection when uncontrolled. @default [] */
  defaultValue?: string[];
  /** Called with the new selection after a chip joins or leaves the pill. */
  onValueChange?: (value: string[]) => void;
  /** Number of results for a selection. Wins over `total` and the per-option `count`s. */
  getCount?: (selected: string[]) => number;
  /** Results with nothing selected. Without `getCount`, a selection shows the sum of its options' `count`s. @default the sum of every `count` */
  total?: number;
  /** Word after the count. @default "results" */
  unit?: string;
  /** Most chips that can sit in the pill at once; the rest are disabled until one leaves. */
  max?: number;
  /** Accessible name of the group. @default "Filters" */
  label?: string;
}

const LAYOUT = { type: "spring", stiffness: 300, damping: 32, mass: 1 } as const;
const WIPE = { duration: 0.32, ease: [0.22, 1, 0.36, 1] } as const;

type Moving = Record<string, "in" | "out">;

/**
 * Filter chips that melt into a dark results pill. Selecting a chip slides it into the pill: its
 * fill wipes from white to dark in the direction it travels, a gooey neck bridges it to the pill and
 * fuses, and the count rolls to the new number. Clicking a label in the pill stretches the neck until
 * it snaps, and the chip lands back at the front of the row. Hovering a chip wobbles its outline.
 *
 * Two copies of the same row share one layout animation: a goo-filtered layer of plain shapes (the
 * pill and the moving chip bodies) under a crisp, unfiltered layer of text and buttons.
 */
export function MergeFilterChips({
  options,
  value,
  defaultValue = [],
  onValueChange,
  getCount,
  total,
  unit = "results",
  max,
  label = "Filters",
  className,
  ...props
}: MergeFilterChipsProps) {
  const id = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion();
  const [internal, setInternal] = useState<string[]>(defaultValue);
  const selected = (value ?? internal).filter((v) => options.some((o) => o.value === v));
  const [moving, setMoving] = useState<Moving>({});
  // Resting order of the row. A chip that leaves the pill moves to the front and stays there.
  const [rowOrder, setRowOrder] = useState<string[]>(() => options.map((o) => o.value));
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const goo = useRef<SVGFEColorMatrixElement>(null);
  const wobble = useRef<SVGFEDisplacementMapElement>(null);
  const wobbling = useRef<{ el: HTMLElement; stop: () => void } | null>(null);

  const byValue = new Map(options.map((o) => [o.value, o]));
  const active = selected.map((v) => byValue.get(v)!);
  const ordered = [...rowOrder.filter((v) => byValue.has(v)), ...options.map((o) => o.value).filter((v) => !rowOrder.includes(v))];
  const inactive = ordered.filter((v) => !selected.includes(v)).map((v) => byValue.get(v)!);
  const full = max !== undefined && selected.length >= max;

  const sum = (list: MergeFilterOption[]) => list.reduce((s, o) => s + (o.count ?? 0), 0);
  const count = getCount ? getCount(selected) : selected.length ? sum(active) : (total ?? sum(options));

  const commit = (next: string[]) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  const toggle = (v: string) => {
    const joining = !selected.includes(v);
    if (joining && full) return;
    pendingFocus.current = v;
    if (!joining) setRowOrder([v, ...ordered.filter((o) => o !== v)]);
    if (!reduceMotion) setMoving((m) => ({ ...m, [v]: joining ? "in" : "out" }));
    commit(joining ? [...selected, v] : selected.filter((s) => s !== v));
  };

  const settle = (v: string) => setMoving((m) => {
    if (!(v in m)) return m;
    const next = { ...m };
    delete next[v];
    return next;
  });

  // Focus follows a chip into and out of the pill, so keyboard users keep their place.
  useEffect(() => {
    const v = pendingFocus.current;
    if (!v) return;
    pendingFocus.current = null;
    buttons.current.get(v)?.focus({ preventScroll: true });
  });

  // A sharper alpha threshold on dense screens keeps the goo edge crisp without stair-steps at 1x.
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    goo.current?.setAttribute("values", dpr >= 1.5 ? "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" : "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7");
  }, []);

  // Fade whichever edge of the row has more chips beyond it.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => {
      const left = el.scrollLeft > 2;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      const mask = `linear-gradient(90deg, ${left ? "transparent" : "#000"} 0, #000 ${left ? "32px" : "0"}, #000 calc(100% - ${right ? "32px" : "0px"}), ${right ? "transparent" : "#000"} 100%)`;
      el.style.maskImage = mask;
      el.style.setProperty("-webkit-mask-image", mask);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  /** Wobbles one chip's outline for ~300ms through the shared displacement filter. */
  const startWobble = (outline: HTMLElement | null) => {
    if (reduceMotion || !outline || !wobble.current) return;
    wobbling.current?.stop();
    outline.style.filter = `url(#${id}-wobble)`;
    const controls = animate(0, 1, {
      duration: 0.3,
      ease: "linear",
      onUpdate: (t) => wobble.current?.setAttribute("scale", (Math.sin(t * Math.PI) * 5 * (1 - t * 0.3)).toFixed(2)),
      onComplete: () => {
        outline.style.filter = "";
        wobble.current?.setAttribute("scale", "0");
      },
    });
    wobbling.current = {
      el: outline,
      stop: () => {
        controls.stop();
        outline.style.filter = "";
      },
    };
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const list = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-merge-chip]")];
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? list.length - 1 : Math.min(list.length - 1, Math.max(0, at + (event.key === "ArrowRight" ? 1 : -1)));
    if (list[next]) {
      event.preventDefault();
      list[next].focus();
      list[next].scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  const layout = reduceMotion ? { duration: 0 } : LAYOUT;
  const countText = (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <RollingDigits value={count} animateOnMount={false} className="font-semibold" />
      <span className="opacity-60">{unit}</span>
    </span>
  );

  /** The same row twice: plain dark shapes for the goo, then the crisp text and buttons on top. */
  const row = (blob: boolean) => (
    <LayoutGroup id={`${id}-${blob ? "blob" : "text"}`}>
      <div className="flex items-center gap-2" aria-hidden={blob || undefined}>
        <motion.div
          layout
          transition={{ layout }}
          // The crisp pill sits above the row, so a chip on its way in passes over the chips it overtakes.
          className={cn("flex h-10 shrink-0 items-center gap-2.5 pr-1.5 pl-4 text-[14px]", blob ? "bg-foreground" : "relative z-10 text-background", !active.length && "pr-4")}
          style={{ borderRadius: 999 }}
        >
          <motion.span layout="position" transition={{ layout }} className={cn(blob && "invisible")}>
            {countText}
          </motion.span>
          {active.length ? <motion.span layout="position" transition={{ layout }} aria-hidden="true" className={cn("h-4 w-px", blob ? "invisible" : "bg-background/35")} /> : null}
          {active.map((o) =>
            blob ? (
              <motion.span
                key={o.value}
                layoutId={`${id}-b-${o.value}`}
                transition={{ layout }}
                className="flex h-8 items-center bg-foreground px-3 font-medium"
                style={{ borderRadius: 999 }}
              >
                <span className="invisible">{o.label}</span>
              </motion.span>
            ) : (
              <motion.button
                key={o.value}
                layoutId={`${id}-t-${o.value}`}
                transition={{ layout }}
                type="button"
                data-merge-chip=""
                ref={(el: HTMLButtonElement | null) => {
                  if (el) buttons.current.set(o.value, el);
                }}
                aria-label={`Remove ${o.label}`}
                onClick={() => toggle(o.value)}
                className="relative flex h-8 cursor-pointer items-center px-3 font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                style={{ borderRadius: 999 }}
              >
                <span className="transition-opacity duration-150 [@media(hover:hover)]:hover:opacity-70">{o.label}</span>
                {moving[o.value] === "in" ? (
                  // The chip's white face, peeled away from the leading edge as it travels into the pill.
                  <motion.span
                    aria-hidden="true"
                    initial={{ clipPath: "inset(0 0 0 0%)" }}
                    animate={{ clipPath: "inset(0 0 0 100%)" }}
                    transition={WIPE}
                    onAnimationComplete={() => settle(o.value)}
                    className="absolute inset-0 flex items-center rounded-full border-2 border-foreground bg-background px-[10px] text-foreground"
                  >
                    {o.label}
                  </motion.span>
                ) : null}
              </motion.button>
            ),
          )}
        </motion.div>
        {inactive.map((o) =>
          blob ? (
            <motion.span
              key={o.value}
              layoutId={`${id}-b-${o.value}`}
              // The body stays dark while it pulls away, so the neck stretches, thins and snaps.
              transition={{ layout, opacity: { duration: 0.3, delay: 0.14, ease: "easeIn" } }}
              initial={moving[o.value] === "out" ? { opacity: 1 } : false}
              animate={{ opacity: 0 }}
              className="flex h-10 shrink-0 items-center bg-foreground px-4 text-[14px] font-medium"
              style={{ borderRadius: 999 }}
            >
              <span className="invisible">{o.label}</span>
            </motion.span>
          ) : (
            <Chip
              key={o.value}
              layoutId={`${id}-t-${o.value}`}
              layout={layout}
              option={o}
              disabled={full}
              leaving={moving[o.value] === "out"}
              onSettle={() => settle(o.value)}
              onToggle={() => toggle(o.value)}
              onWobble={startWobble}
              buttonRef={(el) => {
                if (el) buttons.current.set(o.value, el);
              }}
            />
          ),
        )}
      </div>
    </LayoutGroup>
  );

  return (
    <div role="group" aria-label={label} className={cn("relative w-full max-w-full", className)} onKeyDown={onKeyDown} {...props}>
      <svg aria-hidden="true" className="absolute size-0">
        <filter id={`${id}-goo`} colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix ref={goo} in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
        </filter>
        <filter id={`${id}-wobble`} x="-10%" y="-40%" width="120%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045 0.09" numOctaves="1" seed="7" result="noise" />
          <feDisplacementMap ref={wobble} in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <motion.div ref={scroller} layoutScroll className="no-scrollbar overflow-x-auto overscroll-x-contain">
        <div className="relative w-max px-1 py-2">
          <div className="absolute inset-0 px-1 py-2" style={reduceMotion ? undefined : { filter: `url(#${id}-goo)` }}>
            {row(true)}
          </div>
          <div className="relative">{row(false)}</div>
        </div>
      </motion.div>
      <span role="status" aria-live="polite" className="sr-only">
        {count} {unit}
      </span>
    </div>
  );
}

interface ChipProps {
  layoutId: string;
  layout: object;
  option: MergeFilterOption;
  disabled: boolean;
  leaving: boolean;
  onSettle: () => void;
  onToggle: () => void;
  onWobble: (outline: HTMLElement | null) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}

/** An outlined chip in the row. A chip just out of the pill wipes from dark back to white as it lands. */
function Chip({ layoutId, layout, option, disabled, leaving, onSettle, onToggle, onWobble, buttonRef }: ChipProps) {
  const outline = useRef<HTMLSpanElement>(null);
  return (
    <motion.button
      layoutId={layoutId}
      transition={{ layout }}
      ref={buttonRef}
      type="button"
      data-merge-chip=""
      aria-pressed="false"
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onToggle}
      onPointerEnter={(e) => {
        // Only a real hover: not a chip sliding under a resting cursor.
        if (e.pointerType === "mouse" && (e.movementX !== 0 || e.movementY !== 0)) onWobble(outline.current);
      }}
      className={cn(
        "relative flex h-10 shrink-0 cursor-pointer items-center px-4 text-[14px] font-medium whitespace-nowrap text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.96]",
        disabled && "cursor-not-allowed opacity-45",
      )}
      style={{ borderRadius: 999 }}
    >
      {/* The face and outline wobble on hover; the label sits above, unfiltered. */}
      <span ref={outline} aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-foreground bg-background" />
      <span className="relative">{option.label}</span>
      {leaving ? (
        // The dark body it wore in the pill, peeled away from the leading (right) edge as it lands.
        <motion.span
          aria-hidden="true"
          initial={{ clipPath: "inset(0 0% 0 0)" }}
          animate={{ clipPath: "inset(0 100% 0 0)" }}
          transition={{ ...WIPE, delay: 0.05 }}
          onAnimationComplete={onSettle}
          className="absolute inset-0 flex items-center rounded-full bg-foreground px-4 text-background"
        >
          {option.label}
        </motion.span>
      ) : null}
    </motion.button>
  );
}
