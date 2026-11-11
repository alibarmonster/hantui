"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, useSpring, type Variants } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { duration, ease, spring } from "@/lib/motion";

export interface TimeSlot {
  /** 24-hour time, "HH:mm". */
  time: string;
  /** False dims the slot and stops it being picked. */
  available: boolean;
}

export interface NotchDateTimePickerProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange" | "children"> {
  /** Controlled value. */
  value?: Date;
  /** Initial value when uncontrolled. Without one the pills show placeholders. */
  defaultValue?: Date;
  /** Called with the new date and time once both are known. */
  onValueChange?: (value: Date) => void;
  /** Earliest day that can be picked. */
  min?: Date;
  /** Latest day that can be picked. */
  max?: Date;
  /** Return true for days that cannot be picked. */
  isDateUnavailable?: (date: Date) => boolean;
  /** Slots for a day. Days with no available slot cannot be picked and are skipped by the day arrows. Defaults to every `step` minutes from `startTime` to `endTime`. */
  getSlots?: (date: Date) => TimeSlot[];
  /** Minutes between default slots. @default 30 */
  step?: number;
  /** First default slot, "HH:mm". @default "09:00" */
  startTime?: string;
  /** Last default slot, "HH:mm". @default "17:30" */
  endTime?: string;
  /** First day of the week: 0 is Sunday, 1 is Monday. @default 1 */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Locale for every label. Fixed by you, never read from the browser, so server and client match. @default "en-US" */
  locale?: string;
  /** 12-hour or 24-hour times. @default "h12" */
  hourCycle?: "h12" | "h23";
  /** Controlled open state. */
  open?: boolean;
  /** Whether the popover starts open when uncontrolled. @default false */
  defaultOpen?: boolean;
  /** Called when the popover opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Controlled popover mode. */
  mode?: "date" | "time";
  /** Mode the popover starts in when uncontrolled. @default "date" */
  defaultMode?: "date" | "time";
  /** Called when the popover switches between the calendar and the time slots. */
  onModeChange?: (mode: "date" | "time") => void;
  /** Text on the date pill before a day is picked. @default "Pick a date" */
  datePlaceholder?: string;
  /** Text on the time pill before a time is picked. @default "Pick a time" */
  timePlaceholder?: string;
}

type Mode = "date" | "time";

const SURFACE = "#1c1c1e";
/** How far each pill moves aside when the bar splits, in px. */
const SPLIT = 5;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const timeOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
};
const withTime = (day: Date, time: string) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutesOf(time) / 60), minutesOf(time) % 60);

const noop = () => () => {};
/** Today as an ISO day on the client and null on the server, so "today" never causes a hydration mismatch. */
function useToday() {
  return useSyncExternalStore(noop, () => iso(new Date()), () => null);
}

// The resting values are identical in both motion modes: they are server-rendered as inline styles.
const REST = { opacity: 1, y: 0, x: 0, filter: "blur(0px)" };

/** A label that blur-swaps when its text changes. */
function Swap({ text, className, children }: { text: string; className?: string; children?: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const variants: Variants = reduceMotion
    ? { initial: { ...REST, opacity: 0 }, animate: REST, exit: { ...REST, opacity: 0 } }
    : { initial: { ...REST, opacity: 0, y: 5, filter: "blur(5px)" }, animate: REST, exit: { ...REST, opacity: 0, y: -5, filter: "blur(5px)" } };
  return (
    <span className={cn("inline-grid *:[grid-area:1/1]", className)}>
      <AnimatePresence initial={false}>
        <motion.span key={text} variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: duration.quick, ease: ease.out }} className="whitespace-nowrap">
          {children ?? text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function NotchDateTimePicker({
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  isDateUnavailable,
  getSlots,
  step = 30,
  startTime = "09:00",
  endTime = "17:30",
  weekStartsOn = 1,
  locale = "en-US",
  hourCycle = "h12",
  open,
  defaultOpen = false,
  onOpenChange,
  mode,
  defaultMode = "date",
  onModeChange,
  datePlaceholder = "Pick a date",
  timePlaceholder = "Pick a time",
  className,
  onKeyDown,
  ...props
}: NotchDateTimePickerProps) {
  const id = useId();
  const reduceMotion = useReducedMotion();
  const todayIso = useToday();

  const [internalValue, setInternalValue] = useState<Date | null>(defaultValue ?? null);
  const current = value ?? internalValue;
  /** A day picked before any time is known. */
  const [draftDay, setDraftDay] = useState<Date | null>(null);
  const day = current ? startOfDay(current) : draftDay;
  const time = current ? timeOf(current) : null;

  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  const [internalMode, setInternalMode] = useState<Mode>(defaultMode);
  const activeMode = mode ?? internalMode;

  const [viewMonth, setViewMonth] = useState<Date | null>(null);
  const [monthDirection, setMonthDirection] = useState(1);
  const [dayDirection, setDayDirection] = useState(1);
  const [focusDay, setFocusDay] = useState<string | null>(null);
  const [focusSlot, setFocusSlot] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLButtonElement>(null);
  const timeRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  /** Set by user actions that should pull focus into the popover (or back to a pill) after the next render. */
  const wantFocus = useRef<"popover" | Mode | null>(null);

  // ---- Formatting
  const format = useMemo(() => {
    const parts = (options: Intl.DateTimeFormatOptions) => {
      const formatter = new Intl.DateTimeFormat(locale, options);
      return (d: Date) => Object.fromEntries(formatter.formatToParts(d).map((p) => [p.type, p.value])) as Record<string, string>;
    };
    const short = parts({ weekday: "short", day: "numeric", month: "short" });
    const long = parts({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const clock = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", hourCycle });
    const month = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
    const narrow = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    const weekdayName = new Intl.DateTimeFormat(locale, { weekday: "long" });
    return {
      /** "Wed, 11 Nov" */
      pill: (d: Date) => `${short(d).weekday}, ${short(d).day} ${short(d).month}`,
      /** "Wednesday, 11 November 2026" */
      full: (d: Date) => `${long(d).weekday}, ${long(d).day} ${long(d).month} ${long(d).year}`,
      weekday: (d: Date) => long(d).weekday,
      dayMonth: (d: Date) => `${long(d).day} ${long(d).month}`,
      month: (d: Date) => month.format(d),
      /** The clock text and its AM/PM suffix, if any. */
      clock: (slot: string) => {
        const pieces = clock.formatToParts(withTime(new Date(2000, 0, 1), slot));
        const period = pieces.find((p) => p.type === "dayPeriod")?.value ?? "";
        const text = pieces.filter((p) => p.type !== "dayPeriod").map((p) => p.value).join("").trim();
        return { text, period, label: period ? `${text} ${period}` : text };
      },
      weekdays: Array.from({ length: 7 }, (_, i) => {
        // 2 January 2000 was a Sunday.
        const d = new Date(2000, 0, 2 + ((weekStartsOn + i) % 7));
        return { narrow: narrow.format(d), long: weekdayName.format(d) };
      }),
    };
  }, [locale, hourCycle, weekStartsOn]);

  // ---- Availability
  const defaultSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const size = Math.max(1, step);
    for (let m = minutesOf(startTime); m <= minutesOf(endTime); m += size) slots.push({ time: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`, available: true });
    return slots;
  }, [step, startTime, endTime]);
  const slotsFor = useCallback((d: Date) => (getSlots ? getSlots(d) : defaultSlots), [getSlots, defaultSlots]);
  const dayDisabled = useCallback(
    (d: Date) =>
      (min !== undefined && d < startOfDay(min)) ||
      (max !== undefined && d > startOfDay(max)) ||
      (isDateUnavailable?.(d) ?? false) ||
      !slotsFor(d).some((slot) => slot.available),
    [min, max, isDateUnavailable, slotsFor],
  );
  /** The next day that can be picked in a direction, or null within about two months. */
  const stepDay = useCallback(
    (from: Date, direction: 1 | -1) => {
      for (let i = 1; i <= 62; i++) {
        const candidate = addDays(from, direction * i);
        if (!dayDisabled(candidate)) return candidate;
      }
      return null;
    },
    [dayDisabled],
  );

  const today = todayIso ? fromIso(todayIso) : null;
  const month = viewMonth ?? startOfMonth(day ?? today ?? new Date(2000, 0, 1));
  const timeDay = day ?? today;
  const slots = timeDay ? slotsFor(timeDay) : [];
  const previousDay = timeDay ? stepDay(timeDay, -1) : null;
  const nextDay = timeDay ? stepDay(timeDay, 1) : null;
  /** Identifies the month or day currently shown, to tell it apart from the one animating out. */
  const viewKey = activeMode === "date" ? `d${iso(month)}` : `t${timeDay ? iso(timeDay) : ""}`;

  // ---- State changes
  const emit = (next: Date) => {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  };
  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const setMode = (next: Mode) => {
    if (mode === undefined) setInternalMode(next);
    onModeChange?.(next);
  };

  function show(next: Mode) {
    wantFocus.current = "popover";
    setHovered(null);
    if (next === "date") {
      setViewMonth(startOfMonth(day ?? today ?? new Date()));
      setFocusDay(iso(day ?? today ?? new Date()));
    } else {
      // Time mode needs a day: fall back to today, or the first day that has slots.
      const base = day ?? startOfDay(new Date());
      const usable = dayDisabled(base) ? (stepDay(base, 1) ?? base) : base;
      if (!day || usable !== base) pickDay(usable, false);
      setFocusSlot(null);
    }
    setMode(next);
    setOpen(true);
  }

  function close(returnTo: Mode = activeMode) {
    wantFocus.current = returnTo;
    setOpen(false);
  }

  function pickDay(next: Date, thenTime = true) {
    if (time) emit(withTime(next, time));
    else setDraftDay(next);
    if (thenTime) {
      wantFocus.current = "popover";
      setFocusSlot(null);
      setHovered(null);
      setMode("time");
    }
  }

  function pickTime(slot: string) {
    const base = day ?? startOfDay(new Date());
    emit(withTime(base, slot));
    setDraftDay(null);
    close("time");
  }

  function changeMonth(delta: number, focus?: Date) {
    setMonthDirection(delta > 0 ? 1 : -1);
    setViewMonth(addMonths(month, delta));
    if (focus) setFocusDay(iso(focus));
  }

  function moveDay(direction: 1 | -1) {
    const target = direction === 1 ? nextDay : previousDay;
    if (!target) return;
    setDayDirection(direction);
    setFocusSlot(null);
    pickDay(target, false);
  }

  // ---- Focus
  useEffect(() => {
    const want = wantFocus.current;
    if (!want) return;
    wantFocus.current = null;
    // The view that is leaving stays in the DOM while it fades, so look only inside the current one.
    if (want === "popover") popoverRef.current?.querySelector<HTMLElement>(`[data-view="${viewKey}"] [data-roving='true']`)?.focus({ preventScroll: true });
    else (want === "date" ? dateRef : timeRef).current?.focus({ preventScroll: true });
  }, [isOpen, activeMode, focusDay, focusSlot, viewKey]);

  // Close on a press outside.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      if (open === undefined) setInternalOpen(false);
      onOpenChange?.(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen, open, onOpenChange]);

  // ---- Stem and popover position: both follow the active pill on a spring.
  const stemX = useSpring(0, spring.smooth);
  const popoverX = useSpring(0, spring.smooth);
  const placed = useRef(false);
  useLayoutEffect(() => {
    const pill = (activeMode === "date" ? dateRef : timeRef).current;
    const root = rootRef.current;
    if (!pill || !root || !isOpen) {
      placed.current = false;
      return;
    }
    const sheet = window.matchMedia("(max-width: 479px)").matches;
    const shift = activeMode === "date" ? -SPLIT : SPLIT;
    const stem = pill.offsetLeft + shift + pill.offsetWidth / 2;
    const width = popoverRef.current?.offsetWidth ?? 304;
    // Align with the active pill, but never run off the right edge of the viewport.
    const room = window.innerWidth - root.getBoundingClientRect().left - width - 8;
    const x = sheet ? 0 : Math.max(-SPLIT, Math.min(pill.offsetLeft + shift, room));
    if (placed.current && !reduceMotion) {
      stemX.set(stem);
      popoverX.set(x);
    } else {
      stemX.jump(stem);
      popoverX.jump(x);
      placed.current = true;
    }
  }, [isOpen, activeMode, day, time, reduceMotion, stemX, popoverX]);

  // ---- Keyboard
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || !isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    // Focus stays inside the pills and the popover while it is open.
    const stops = Array.from(rootRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]):not([tabindex='-1'])") ?? []);
    if (!stops.length) return;
    const index = stops.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey ? (index <= 0 ? stops.length - 1 : index - 1) : index === stops.length - 1 ? 0 : index + 1;
    event.preventDefault();
    stops[next]?.focus();
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const from = fromIso(focusedDay);
    const weekday = (from.getDay() - weekStartsOn + 7) % 7;
    const targets: Record<string, Date> = {
      ArrowLeft: addDays(from, -1),
      ArrowRight: addDays(from, 1),
      ArrowUp: addDays(from, -7),
      ArrowDown: addDays(from, 7),
      Home: addDays(from, -weekday),
      End: addDays(from, 6 - weekday),
      PageUp: new Date(from.getFullYear(), from.getMonth() - 1, Math.min(from.getDate(), new Date(from.getFullYear(), from.getMonth(), 0).getDate())),
      PageDown: new Date(from.getFullYear(), from.getMonth() + 1, Math.min(from.getDate(), new Date(from.getFullYear(), from.getMonth() + 2, 0).getDate())),
    };
    const target = targets[event.key];
    if (!target) return;
    event.preventDefault();
    wantFocus.current = "popover";
    const delta = (target.getFullYear() - month.getFullYear()) * 12 + target.getMonth() - month.getMonth();
    if (delta !== 0) changeMonth(delta, target);
    else setFocusDay(iso(target));
  }

  function onSlotKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[event.key];
    if (!delta) return;
    event.preventDefault();
    const from = slots.findIndex((slot) => slot.time === focusedSlot);
    // Keep going in the same direction past slots that cannot be picked.
    for (let i = from + delta; i >= 0 && i < slots.length; i += delta) {
      if (slots[i].available) {
        wantFocus.current = "popover";
        setFocusSlot(slots[i].time);
        return;
      }
    }
  }

  // ---- Derived for rendering
  const gridStart = addDays(month, -((month.getDay() - weekStartsOn + 7) % 7));
  const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)));
  const inMonth = (d: Date) => d.getMonth() === month.getMonth();
  const focusedDay = focusDay && inMonth(fromIso(focusDay)) ? focusDay : day && inMonth(day) ? iso(day) : today && inMonth(today) ? todayIso! : iso(month);
  const focusedSlot = (focusSlot && slots.some((s) => s.time === focusSlot && s.available) ? focusSlot : null) ?? (time && slots.some((s) => s.time === time && s.available) ? time : null) ?? slots.find((s) => s.available)?.time ?? null;

  const dateLabel = day ? format.pill(day) : datePlaceholder;
  const timeLabel = time ? format.clock(time).label : timePlaceholder;
  const split = isOpen ? SPLIT : 0;
  const move = reduceMotion ? { duration: 0 } : spring.smooth;
  const morph = reduceMotion ? { duration: 0 } : { duration: duration.base, ease: ease.out };

  const pill = (which: Mode, shapes: boolean) => {
    const label = which === "date" ? dateLabel : timeLabel;
    const Icon = which === "date" ? CalendarDays : Clock;
    const inner = (
      <>
        <Icon aria-hidden="true" className={cn("size-4 shrink-0", which === "date" ? "text-[#ff9f0a]" : "text-[#40c8e0]")} strokeWidth={2.25} />
        <Swap text={label} />
      </>
    );
    const shape = "flex h-11 items-center gap-2 px-3.5 text-sm font-medium whitespace-nowrap";
    if (shapes) {
      // The filtered copy: same boxes, no text, so the goo never touches the letters.
      return (
        <motion.div key={which} animate={{ x: which === "date" ? -split : split }} transition={move} className={cn(shape, "rounded-[10px] bg-[#1c1c1e]", which === "time" && "-ml-2.5 pl-6")}>
          <span className="invisible flex items-center gap-2">{inner}</span>
        </motion.div>
      );
    }
    const selected = isOpen && activeMode === which;
    return (
      <motion.button
        key={which}
        ref={which === "date" ? dateRef : timeRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={selected}
        aria-controls={selected ? `${id}-popover` : undefined}
        aria-label={which === "date" ? `Date: ${day ? format.full(day) : datePlaceholder}` : `Time: ${timeLabel}`}
        onClick={() => (selected ? close(which) : show(which))}
        animate={{ x: which === "date" ? -split : split }}
        transition={move}
        className={cn(
          shape,
          "relative cursor-pointer rounded-[10px] text-white outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          which === "time" && "-ml-2.5 pl-6",
          !(which === "date" ? day : time) && "text-white/70",
        )}
      >
        {inner}
      </motion.button>
    );
  };

  const cell = "relative grid cursor-pointer place-items-center rounded-lg text-sm outline-none focus-visible:ring-2 focus-visible:ring-white/80";
  const highlight = (key: string) =>
    hovered === key ? <motion.span layoutId="hover" transition={reduceMotion ? { duration: 0 } : spring.snappy} className="absolute inset-0 rounded-lg bg-white/10" /> : null;
  const arrow = "grid size-10 cursor-pointer place-items-center rounded-lg text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/80 disabled:pointer-events-none disabled:opacity-30";
  // Months and days slide in from the side you moved toward.
  const slide: Variants = {
    initial: (direction: number) => (reduceMotion ? { ...REST, opacity: 0 } : { ...REST, opacity: 0, x: direction * 12, filter: "blur(4px)" }),
    animate: REST,
    exit: (direction: number) => (reduceMotion ? { ...REST, opacity: 0 } : { ...REST, opacity: 0, x: direction * -12, filter: "blur(4px)" }),
  };

  return (
    <div ref={rootRef} onKeyDown={handleKeyDown} className={cn("relative inline-block text-left", className)} {...props}>
      <svg aria-hidden="true" className="absolute size-0">
        <filter id={`${id}-goo`} x="-20%" y="-60%" width="140%" height="240%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
          <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" />
        </filter>
      </svg>

      <div className="relative flex">
        {/* Shapes only: two pills, the neck between them and the stem down to the popover, all under one goo filter. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex motion-reduce:[filter:none]!" style={{ filter: `url(#${id}-goo)` }}>
          {pill("date", true)}
          {pill("time", true)}
          <motion.span
            style={{ x: stemX }}
            animate={{ scaleY: isOpen ? 1 : 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: duration.quick, ease: ease.out }}
            className="absolute top-[calc(100%-8px)] -left-3.5 h-[18px] w-7 origin-top rounded-b-[5px] bg-[#1c1c1e] max-[479px]:hidden"
          />
        </div>
        {pill("date", false)}
        {pill("time", false)}
      </div>

      {isOpen ? <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/40 min-[480px]:hidden" onClick={() => close()} /> : null}

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            key="popover"
            style={{ x: popoverX, transformOrigin: "44px 0px" }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: "blur(6px)" }}
            transition={{ duration: duration.quick, ease: ease.out }}
            className="absolute top-full left-0 z-50 mt-2 max-[479px]:fixed max-[479px]:inset-x-0 max-[479px]:top-auto max-[479px]:bottom-0 max-[479px]:mt-0"
          >
            <LayoutGroup id={id}>
              <motion.div
                ref={popoverRef}
                id={`${id}-popover`}
                role="dialog"
                aria-label={activeMode === "date" ? "Choose a date" : "Choose a time"}
                layout={!reduceMotion}
                transition={morph}
                style={{ borderRadius: 12, background: SURFACE }}
                onPointerLeave={() => setHovered(null)}
                className="relative w-max overflow-hidden p-3 text-white shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45)] max-[479px]:w-full max-[479px]:rounded-b-none! max-[479px]:pb-6"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {activeMode === "date" ? (
                    <motion.div
                      key="date"
                      layout={!reduceMotion}
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(6px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(6px)" }}
                      transition={morph}
                      className="w-[280px] max-[479px]:mx-auto"
                    >
                      <div className="flex items-center justify-between">
                        <Swap text={format.month(month)} className="pl-2 text-sm font-semibold" />
                        <div className="flex">
                          <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)} className={arrow}>
                            <ChevronLeft aria-hidden="true" className="size-4" />
                          </button>
                          <button type="button" aria-label="Next month" onClick={() => changeMonth(1)} className={arrow}>
                            <ChevronRight aria-hidden="true" className="size-4" />
                          </button>
                        </div>
                      </div>
                      <div role="grid" aria-label={format.month(month)} onKeyDown={onGridKeyDown} className="mt-1">
                        <div role="row" className="grid grid-cols-7">
                          {format.weekdays.map((weekday, index) => (
                            <span key={index} role="columnheader" aria-label={weekday.long} className="grid h-8 place-items-center text-xs font-medium text-white/60">
                              {weekday.narrow}
                            </span>
                          ))}
                        </div>
                        <div className="grid *:[grid-area:1/1]">
                          <AnimatePresence mode="popLayout" initial={false} custom={monthDirection}>
                            <motion.div
                              key={iso(month)}
                              data-view={`d${iso(month)}`}
                              role="rowgroup"
                              custom={monthDirection}
                              variants={slide}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              transition={{ duration: duration.quick, ease: ease.out }}
                            >
                              {weeks.map((week) => (
                                <div key={iso(week[0])} role="row" className="grid grid-cols-7">
                                  {week.map((d) => {
                                    const key = iso(d);
                                    const outside = !inMonth(d);
                                    const disabled = dayDisabled(d);
                                    const selected = day !== null && key === iso(day);
                                    return (
                                      <button
                                        key={key}
                                        type="button"
                                        role="gridcell"
                                        data-roving={key === focusedDay}
                                        tabIndex={key === focusedDay ? 0 : -1}
                                        aria-selected={selected}
                                        aria-disabled={disabled || undefined}
                                        aria-current={key === todayIso ? "date" : undefined}
                                        aria-label={format.full(d)}
                                        onPointerEnter={() => setHovered(disabled ? null : key)}
                                        onFocus={() => setFocusDay(key)}
                                        onClick={() => {
                                          if (disabled) return;
                                          if (outside) changeMonth(d < month ? -1 : 1);
                                          pickDay(d);
                                        }}
                                        className={cn(cell, "size-10 tabular-nums", outside && "text-white/35", disabled && "cursor-default text-white/25 line-through decoration-white/25", selected && "font-semibold")}
                                      >
                                        {highlight(key)}
                                        {selected ? <span className="absolute inset-0.5 rounded-[7px] bg-white/[0.16] shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_2px_6px_rgb(0_0_0/0.35)]" /> : null}
                                        <span className="relative">{d.getDate()}</span>
                                        {key === todayIso ? <span aria-hidden="true" className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#ff9f0a]" /> : null}
                                      </button>
                                    );
                                  })}
                                </div>
                              ))}
                            </motion.div>
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="time"
                      layout={!reduceMotion}
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(6px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(6px)" }}
                      transition={morph}
                      className="w-[264px] max-[479px]:mx-auto max-[479px]:w-full max-[479px]:max-w-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          aria-label={`${timeDay ? format.full(timeDay) : datePlaceholder}. Back to the calendar`}
                          onClick={() => show("date")}
                          className="flex h-10 min-w-0 cursor-pointer items-center rounded-lg px-2 text-sm outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/80"
                        >
                          {timeDay ? (
                            <Swap text={iso(timeDay)}>
                              <span className="font-semibold">{format.weekday(timeDay)}</span> <span className="text-white/60">{format.dayMonth(timeDay)}</span>
                            </Swap>
                          ) : (
                            datePlaceholder
                          )}
                        </button>
                        <div className="flex">
                          <button type="button" aria-label="Previous available day" disabled={!previousDay} onClick={() => moveDay(-1)} className={arrow}>
                            <ChevronLeft aria-hidden="true" className="size-4" />
                          </button>
                          <button type="button" aria-label="Next available day" disabled={!nextDay} onClick={() => moveDay(1)} className={arrow}>
                            <ChevronRight aria-hidden="true" className="size-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 grid *:[grid-area:1/1]">
                        <AnimatePresence mode="popLayout" initial={false} custom={dayDirection}>
                          <motion.div
                            key={timeDay ? iso(timeDay) : "none"}
                            data-view={`t${timeDay ? iso(timeDay) : ""}`}
                            role="grid"
                            aria-label={timeDay ? `Times on ${format.full(timeDay)}` : "Times"}
                            onKeyDown={onSlotKeyDown}
                            custom={dayDirection}
                            variants={slide}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{ duration: duration.quick, ease: ease.out }}
                            className="grid gap-1"
                          >
                            {Array.from({ length: Math.ceil(slots.length / 3) }, (_, row) => (
                              <div key={row} role="row" className="grid grid-cols-3 gap-1">
                                {slots.slice(row * 3, row * 3 + 3).map((slot) => {
                                  const text = format.clock(slot.time);
                                  const selected = slot.time === time;
                                  const key = `t${slot.time}`;
                                  return (
                                    <button
                                      key={slot.time}
                                      type="button"
                                      role="gridcell"
                                      data-roving={slot.time === focusedSlot}
                                      tabIndex={slot.time === focusedSlot ? 0 : -1}
                                      aria-selected={selected}
                                      aria-disabled={!slot.available || undefined}
                                      aria-label={slot.available ? text.label : `${text.label}, unavailable`}
                                      onPointerEnter={() => setHovered(slot.available ? key : null)}
                                      onFocus={() => slot.available && setFocusSlot(slot.time)}
                                      onClick={() => slot.available && pickTime(slot.time)}
                                      className={cn(cell, "h-10 tabular-nums max-[479px]:h-11", !slot.available && "cursor-default text-white/25", selected && "font-semibold")}
                                    >
                                      {highlight(key)}
                                      {selected ? <span className="absolute inset-0 rounded-lg bg-white/[0.16] shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_2px_6px_rgb(0_0_0/0.35)]" /> : null}
                                      <span className="relative">
                                        {text.text}
                                        {text.period ? <span className={cn("ml-1 text-[11px]", slot.available ? "text-white/60" : "text-white/25")}>{text.period}</span> : null}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ))}
                            {slots.length === 0 ? <p className="px-2 py-6 text-center text-sm text-white/60">No times on this day.</p> : null}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </LayoutGroup>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
