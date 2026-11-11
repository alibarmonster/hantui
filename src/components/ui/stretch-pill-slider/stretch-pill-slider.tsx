"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type KeyboardEvent, type PointerEvent } from "react";
import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion, useTransform, type AnimationPlaybackControls } from "motion/react";
import { RollingDigits } from "@/components/ui/rolling-digits/rolling-digits";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

export interface StretchPillSliderProps
  extends Omit<ComponentProps<"div">, "defaultValue" | "onChange" | "children"> {
  /** Controlled value. */
  value?: number;
  /** Initial value when uncontrolled. @default min */
  defaultValue?: number;
  /** Called whenever the value changes, while dragging and from the keyboard. */
  onValueChange?: (value: number) => void;
  /** Called once a change is finished: pointer released or key pressed. */
  onValueCommit?: (value: number) => void;
  /** Lowest value. @default 0 */
  min?: number;
  /** Highest value. @default 100 */
  max?: number;
  /** Distance between values; the pill snaps to each step on release. @default 1 */
  step?: number;
  /** Formats the value for the pill's label and for screen readers, e.g. (v) => `${v} days`. The first number in the result rolls. */
  formatValue?: (value: number) => string;
  /** Label at the right end of the track. @default formatValue(max) */
  maxLabel?: string;
  /** Track height: 40, 48 or 56px (medium grows to 52px on touch screens). @default "md" */
  size?: "sm" | "md" | "lg";
  /** Pill color: the foreground color or the primary accent. @default "ink" */
  tone?: "ink" | "accent";
  /** Disables pointer and keyboard input. @default false */
  disabled?: boolean;
  /** Renders a hidden input with this name, so the value is submitted with a form. */
  name?: string;
}

/** Room past the end of the track for the rubber band, in px. */
const SLACK = 8;
/** Padding, gap and grip around the label inside the pill, in px. */
const CHROME = 16 + 14 + 3 + 12;
/** Half-width of the area around the pill's edge that counts as grabbing the grip, in px. */
const GRIP_ZONE = 28;

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
const decimals = (n: number) => (String(n).split(".")[1] ?? "").length;
/** Resistance past an end: approaches SLACK and never passes it. */
const rubber = (distance: number) => (SLACK * distance) / (distance + 24);

const sizes = {
  sm: "h-10 text-[13px]",
  md: "h-12 text-sm [@media(pointer:coarse)]:h-[52px]",
  lg: "h-14 text-[15px]",
} as const;

const tones = {
  ink: "bg-foreground text-background",
  accent: "bg-primary text-primary-foreground",
} as const;

/** The formatted value with its first number rolling and the rest (the unit) standing still. */
function ValueLabel({ text }: { text: string }) {
  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match || match.index === undefined) return <>{text}</>;
  return (
    <>
      {text.slice(0, match.index)}
      <RollingDigits value={Number(match[0])} decimals={decimals(Number(match[0]))} format={{ useGrouping: false }} animateOnMount={false} stagger={0} />
      {text.slice(match.index + match[0].length)}
    </>
  );
}

export function StretchPillSlider({
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  formatValue = (v) => String(v),
  maxLabel,
  size = "md",
  tone = "ink",
  disabled = false,
  name,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: StretchPillSliderProps) {
  const [internal, setInternal] = useState(() => defaultValue ?? min);
  const current = clamp(value ?? internal, min, max);
  const [dragging, setDragging] = useState(false);
  const reduceMotion = useReducedMotion();

  const trackRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const maxLabelRef = useRef<HTMLSpanElement>(null);
  const controls = useRef<AnimationPlaybackControls | null>(null);
  const drag = useRef<{ offset: number; value: number } | null>(null);

  const text = formatValue(current);
  const endText = maxLabel ?? formatValue(max);
  const ratio = (v: number) => (v - min) / (max - min || 1);

  /** 0 at min, 1 at max: where the pill's right edge sits between its own label width and the full track. */
  const progress = useMotionValue(ratio(current));
  /** Rubber-band stretch past either end, in px. */
  const over = useMotionValue(0);
  /** Narrowest the pill gets: its label plus padding and grip. Estimated until measured. */
  const minWidth = useMotionValue(text.length * 8.5 + CHROME);
  const trackWidth = useMotionValue(0);
  const maxLabelWidth = useMotionValue(0);

  // How far the pill's right edge sits from the right end of its layer, as CSS, so the first
  // paint is right before anything is measured. The layer is the track plus SLACK.
  const inset = useTransform(() => `calc((100% - ${SLACK}px - ${minWidth.get()}px) * ${1 - progress.get()} + ${SLACK - over.get()}px)`);
  const clipPath = useMotionTemplate`inset(0 ${inset} 0 0 round 9999px)`;
  const gripTransform = useMotionTemplate`translateX(calc(-1 * ${inset}))`;

  // The max label fades out as the pill's edge closes in on it.
  const maxLabelShown = useTransform(() => {
    const width = trackWidth.get();
    if (!width) return progress.get() >= 1 ? 0 : 1;
    const edge = minWidth.get() + progress.get() * (width - minWidth.get()) + over.get();
    return clamp((width - 16 - maxLabelWidth.get() - edge) / 28, 0, 1);
  });
  const maxLabelFilter = useTransform(() => `blur(${((1 - maxLabelShown.get()) * 4).toFixed(2)}px)`);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const label = labelRef.current;
    const end = maxLabelRef.current;
    if (!track || !label || !end) return;
    const measure = () => {
      trackWidth.set(track.clientWidth);
      minWidth.set(label.offsetWidth + CHROME);
      maxLabelWidth.set(end.offsetWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(label);
    observer.observe(end);
    return () => observer.disconnect();
  }, [trackWidth, minWidth, maxLabelWidth]);

  const settle = useCallback(
    (to: number) => {
      controls.current?.stop();
      if (reduceMotion) {
        progress.jump(to);
        over.jump(0);
        return;
      }
      controls.current = animate(progress, to, spring.snappy);
      animate(over, 0, spring.snappy);
    },
    [reduceMotion, progress, over],
  );

  // Follow the value when it changes from outside (controlled updates, keyboard), but never fight a drag.
  const target = ratio(current);
  useEffect(() => {
    if (!drag.current) settle(target);
  }, [target, settle]);

  useEffect(() => () => controls.current?.stop(), []);

  const snap = (raw: number) => {
    const stepped = Math.round((raw - min) / step) * step + min;
    return clamp(Number(stepped.toFixed(decimals(step))), min, max);
  };

  const commit = (next: number) => {
    if (next === current) return;
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  /** Where the pill's edge is asked to be, as unclamped progress, for a pointer at clientX. */
  function progressAt(clientX: number, offset: number) {
    const rect = trackRef.current!.getBoundingClientRect();
    const span = Math.max(1, rect.width - minWidth.get());
    return { raw: (clientX - rect.left + offset - minWidth.get()) / span, span, rect };
  }

  function follow(clientX: number) {
    if (!drag.current) return;
    const { raw, span } = progressAt(clientX, drag.current.offset);
    controls.current?.stop();
    progress.set(clamp(raw, 0, 1));
    over.set(raw > 1 ? rubber((raw - 1) * span) : raw < 0 ? -rubber(-raw * span) : 0);
    const next = snap(min + clamp(raw, 0, 1) * (max - min));
    if (next !== drag.current.value) {
      drag.current.value = next;
      commit(next);
    }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || event.button !== 0) return;
    const { raw, span, rect } = progressAt(event.clientX, 0);
    const edge = rect.left + minWidth.get() + progress.get() * span;
    const onGrip = Math.abs(event.clientX - edge) <= GRIP_ZONE;
    event.currentTarget.setPointerCapture(event.pointerId);
    sliderRef.current?.focus({ preventScroll: true });
    drag.current = { offset: onGrip ? edge - event.clientX : 0, value: current };
    setDragging(true);
    if (onGrip) return;
    // A press away from the grip springs the edge to the pointer; moving then takes over 1:1.
    const next = snap(min + clamp(raw, 0, 1) * (max - min));
    drag.current.value = next;
    commit(next);
    controls.current?.stop();
    if (reduceMotion) progress.jump(clamp(raw, 0, 1));
    else controls.current = animate(progress, clamp(raw, 0, 1), spring.snappy);
  }

  function endDrag() {
    if (!drag.current) return;
    const final = drag.current.value;
    drag.current = null;
    setDragging(false);
    settle(ratio(final));
    onValueCommit?.(final);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const big = Math.max(step, snap(min + (max - min) / 10) - min);
    const targets: Record<string, number> = {
      ArrowRight: current + step,
      ArrowUp: current + step,
      ArrowLeft: current - step,
      ArrowDown: current - step,
      PageUp: current + big,
      PageDown: current - big,
      Home: min,
      End: max,
    };
    if (!(event.key in targets) || disabled) return;
    event.preventDefault();
    const next = snap(targets[event.key]);
    commit(next);
    onValueCommit?.(next);
  }

  return (
    <div
      ref={trackRef}
      data-dragging={dragging || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={(event) => follow(event.clientX)}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={cn(
        "group/slider relative w-full min-w-40 cursor-pointer touch-pan-y rounded-full bg-muted font-medium select-none",
        sizes[size],
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      {...props}
    >
      <motion.span
        ref={maxLabelRef}
        aria-hidden="true"
        style={{ opacity: maxLabelShown, filter: maxLabelFilter }}
        className="absolute top-1/2 right-4 -translate-y-1/2 whitespace-nowrap text-muted-foreground tabular-nums motion-reduce:filter-none!"
      >
        {endText}
      </motion.span>

      {/* The focusable slider. Its shadow and focus ring are filters, so they follow the clipped pill inside. */}
      <div
        ref={sliderRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        aria-valuetext={text}
        aria-orientation="horizontal"
        aria-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
        style={{ right: -SLACK }}
        className={cn(
          "absolute inset-y-0 left-0 outline-none transition-[filter] duration-200",
          "[--lift:drop-shadow(0_1px_1px_rgb(0_0_0/0.08))] [filter:var(--lift)]",
          "group-data-dragging/slider:[--lift:drop-shadow(0_6px_10px_rgb(0_0_0/0.22))]",
          "focus-visible:[filter:drop-shadow(2px_0_0_var(--ring))_drop-shadow(-2px_0_0_var(--ring))_drop-shadow(0_2px_0_var(--ring))_drop-shadow(0_-2px_0_var(--ring))]",
        )}
      >
        <motion.div style={{ clipPath }} className={cn("absolute inset-0", tones[tone])}>
          <span ref={labelRef} aria-hidden="true" className="absolute top-1/2 left-4 -translate-y-1/2 whitespace-nowrap">
            <ValueLabel text={text} />
          </span>
          <motion.span aria-hidden="true" style={{ transform: gripTransform }} className="group/grip pointer-events-none absolute inset-0">
            <span className="pointer-events-auto absolute inset-y-0 right-0 flex w-10 cursor-grab items-center justify-end pr-3 group-data-dragging/slider:cursor-grabbing">
              <span className="h-4 w-[3px] rounded-full bg-current opacity-55 transition-[transform,opacity] duration-150 group-hover/grip:scale-x-[1.34] group-hover/grip:opacity-80 group-data-dragging/slider:scale-x-[1.34] group-data-dragging/slider:opacity-80" />
            </span>
          </motion.span>
        </motion.div>
      </div>

      {name ? <input type="hidden" name={name} value={current} disabled={disabled} /> : null}
    </div>
  );
}
