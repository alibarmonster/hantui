"use client";

import { useCallback, useEffect, useId, useRef, useState, type ComponentProps, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, animate, motion, useInView, useMotionValue, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/lib/motion";

export interface StepDemoStep {
  /** Stable id, used for keys and callbacks. */
  id: string;
  /** Step title. */
  title: string;
  /** One muted line under the title. */
  description: string;
  /** What the media card shows for this step. It is treated as an illustration and hidden from assistive tech. */
  scene: ReactNode;
}

export interface StepDemoShowcaseProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  /** Headline. Wrap the connecting words in a muted span for the two-tone look. */
  title?: ReactNode;
  /** Steps, in order. Each one drives the scene in the media card. */
  steps: StepDemoStep[];
  /** Seconds each step stays up while autoplaying. @default 3 */
  interval?: number;
  /** Advance through the steps automatically while in view. Stops for good once someone picks a step. @default true */
  autoplay?: boolean;
  /** Called when the active step changes. */
  onStepChange?: (step: StepDemoStep, index: number) => void;
}

export function StepDemoShowcase({ title, steps, interval = 3, autoplay = true, onStepChange, className, ...props }: StepDemoShowcaseProps) {
  const id = useId();
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef, { amount: 0.35 });
  const [index, setIndex] = useState(0);
  /** Autoplay is on until someone picks a step or presses pause. */
  const [playing, setPlaying] = useState(autoplay);
  /** A step is hovered: autoplay waits. */
  const [hovering, setHovering] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const progress = useMotionValue(0);
  const count = steps.length;
  const active = Math.min(index, Math.max(0, count - 1));
  const running = playing && !hovering && inView && !reduceMotion && count > 1;

  const latest = useRef({ steps, onStepChange });
  useEffect(() => {
    latest.current = { steps, onStepChange };
  });

  const show = useCallback((next: number) => {
    setIndex(next);
    const step = latest.current.steps[next];
    if (step) latest.current.onStepChange?.(step, next);
  }, []);

  /** A deliberate choice: show the step and stop autoplay for good. */
  const pick = (next: number, focus = false) => {
    const clamped = (next + count) % count;
    setPlaying(false);
    show(clamped);
    if (focus) tabs.current[clamped]?.focus();
  };

  // The indicator bar is the timer: it fills over the interval and then the next step shows.
  useEffect(() => {
    let controls: AnimationPlaybackControls | undefined;
    if (running) {
      controls = animate(progress, 1, {
        duration: interval * (1 - progress.get()),
        ease: "linear",
        onComplete: () => {
          progress.jump(0);
          show((active + 1) % count);
        },
      });
    } else if (!playing || reduceMotion) {
      // Not autoplaying: the bar simply grows to the full height of the active step.
      if (reduceMotion) progress.jump(1);
      else controls = animate(progress, 1, { duration: duration.base, ease: ease.out });
    }
    return () => controls?.stop();
  }, [running, playing, reduceMotion, active, count, interval, progress, show]);

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, at: number) {
    const target = { ArrowDown: at + 1, ArrowRight: at + 1, ArrowUp: at - 1, ArrowLeft: at - 1, Home: 0, End: count - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    progress.jump(0);
    pick(target, true);
  }

  function onCardPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current;
    swipe.current = null;
    if (!start || event.pointerType === "mouse") return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(event.clientY - start.y)) return;
    progress.jump(0);
    pick(active + (dx < 0 ? 1 : -1));
  }

  // Keep the active tab in view when the steps are a horizontal row.
  useEffect(() => {
    const tab = tabs.current[active];
    const list = tab?.parentElement?.parentElement;
    if (!tab || !list || list.scrollWidth <= list.clientWidth + 1) return;
    list.scrollTo({ left: tab.offsetLeft - 16, behavior: reduceMotion ? "auto" : "smooth" });
  }, [active, reduceMotion]);

  const step = steps[active];
  const enter = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, filter: "blur(8px)" };

  return (
    <section ref={rootRef} className={cn("@container w-full", className)} {...props}>
      {title ? <h2 className="max-w-2xl text-3xl leading-[1.12] font-semibold tracking-tight text-balance text-foreground @[38rem]:text-[2.6rem]">{title}</h2> : null}

      <div className={cn("grid grid-cols-1 gap-6 @[38rem]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @[38rem]:items-center @[38rem]:gap-12", title && "mt-8 @[38rem]:mt-10")}>
        <div
          id={`${id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${active}`}
          onPointerDown={(event) => {
            swipe.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={onCardPointerUp}
          onPointerCancel={() => {
            swipe.current = null;
          }}
          className="relative mx-auto aspect-square w-full max-w-md touch-pan-y overflow-hidden rounded-3xl border border-border bg-surface @[38rem]:max-w-none"
        >
          {/* Scenes overlap while they swap, so elements that share a layoutId glide from one to the next. */}
          <LayoutGroup id={id}>
            <AnimatePresence initial={false}>
              <motion.div
                key={step?.id}
                aria-hidden="true"
                initial={enter}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={enter}
                transition={{ duration: duration.base, ease: ease.out }}
                className="absolute inset-0"
              >
                {step?.scene}
              </motion.div>
            </AnimatePresence>
          </LayoutGroup>
          {autoplay && count > 1 ? (
            <button
              type="button"
              aria-label={playing ? "Pause autoplay" : "Play autoplay"}
              onClick={() => {
                // Resuming starts the current step's timer over.
                if (!playing) progress.jump(0);
                setPlaying(!playing);
              }}
              className="absolute right-3 bottom-3 z-10 grid size-10 cursor-pointer place-items-center rounded-full border border-border bg-background/90 text-foreground shadow-xs outline-none backdrop-blur-sm transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hidden"
            >
              {playing ? <Pause aria-hidden="true" className="size-4" fill="currentColor" strokeWidth={0} /> : <Play aria-hidden="true" className="size-4" fill="currentColor" strokeWidth={0} />}
            </button>
          ) : null}
        </div>

        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] @[38rem]:mx-0 @[38rem]:overflow-visible @[38rem]:px-0 [&::-webkit-scrollbar]:hidden">
          <div role="tablist" aria-orientation="vertical" aria-label="Steps" className="flex snap-x snap-mandatory gap-3 @[38rem]:flex-col @[38rem]:gap-1" onPointerLeave={() => setHovering(false)}>
            {steps.map((item, at) => {
              const selected = at === active;
              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    tabs.current[at] = node;
                  }}
                  id={`${id}-tab-${at}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${id}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => {
                    progress.jump(0);
                    pick(at);
                  }}
                  onKeyDown={(event) => onTabKeyDown(event, at)}
                  onPointerEnter={(event) => {
                    // Hovering previews a step and holds autoplay; leaving the list lets it carry on.
                    if (event.pointerType !== "mouse") return;
                    setHovering(true);
                    if (!selected) {
                      progress.jump(0);
                      show(at);
                    }
                  }}
                  className={cn(
                    "group/step relative w-[78%] max-w-xs shrink-0 cursor-pointer snap-start rounded-r-xl py-3 pr-3 pl-5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring @[38rem]:w-auto @[38rem]:max-w-none",
                    selected ? "text-foreground" : "text-foreground/65 hover:text-foreground/85",
                  )}
                >
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 rounded-full bg-border" />
                  {selected ? <motion.span aria-hidden="true" style={{ scaleY: progress }} className="absolute inset-y-0 left-0 w-0.5 origin-top rounded-full bg-foreground" /> : null}
                  <span className="block text-base font-semibold tracking-tight">{item.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">{item.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
