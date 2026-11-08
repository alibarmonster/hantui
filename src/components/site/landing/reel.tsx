"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { ArrowRight } from "lucide-react";
import { kinetic } from "@/lib/motion";
import { Afterimage } from "../afterimage";
import { DemoRenderer } from "../demo-renderer";

export interface ReelItem {
  slug: string;
  name: string;
  category: string;
  description: string;
  /** Demo variant shown on the stage. */
  variant: string;
}

/** Scroll per component on the pinned reel. */
const STEP_VH = 50;

/**
 * The one pinned section of the landing page: six flagship components, one at a time on a full-width
 * stage, scrubbed by scroll (about half a screen each). The stage cross-fades with a slight slide in
 * the scroll direction and the incoming title arrives with its afterimages. Only the component on
 * stage is mounted, so the others aren't running. A "Skip the reel" link jumps past it. On narrow
 * screens and under reduced motion it is a plain list instead.
 */
export function LandingReel({ items, nextId }: { items: ReelItem[]; nextId: string }) {
  const reduceMotion = useReducedMotion();
  const pinRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const current = useRef(0);
  const titleX = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: pinRef, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = Math.min(items.length - 1, Math.max(0, Math.floor(v * items.length)));
    if (next === current.current) return;
    setDirection(next > current.current ? 1 : -1);
    current.current = next;
    setIndex(next);
  });

  // The incoming title slides in from the scroll direction; its afterimages trail it.
  useEffect(() => {
    if (reduceMotion) return;
    titleX.set(direction * 44);
    const controls = animate(titleX, 0, kinetic.reelSwap);
    return () => controls.stop();
  }, [index, direction, reduceMotion, titleX]);

  const item = items[index];
  const counter = (i: number) => `${String(i + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;

  const list = (
    <ol className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 sm:px-6">
      {items.map((it, i) => (
        <li key={it.slug}>
          <Link href={`/components/${it.slug}`} className="focus-ring group flex items-baseline gap-4 rounded-md border-b border-border py-4">
            <span className="font-mono text-[13px] text-muted-foreground tabular-nums">{counter(i)}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[clamp(1.75rem,6vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.02em] text-foreground">{it.name}</span>
              <span className="mt-1 block text-[14px] text-muted-foreground">{it.category}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <section aria-label="Flagship components" className="py-10 md:hidden motion-reduce:md:block">
        {list}
      </section>
      <section ref={pinRef} aria-label="Flagship components" className="relative hidden md:block motion-reduce:md:hidden" style={{ height: `calc(${items.length * STEP_VH}vh + 100svh - 4rem)` }}>
        <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col px-4 pb-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-[1200px] items-end justify-between gap-6 pt-6 pb-5">
            <div className="min-w-0">
              <p className="flex items-center gap-3 text-[14px] text-muted-foreground">
                <span className="font-mono text-[13px] tabular-nums" aria-live="polite">
                  {counter(index)}
                </span>
                <span aria-hidden="true">·</span>
                <span>{item.category}</span>
              </p>
              <h2 className="mt-2 font-display text-[48px] leading-[1.05] font-bold tracking-[-0.02em] text-foreground">
                <Afterimage x={titleX}>
                  <span className="block">{item.name}</span>
                </Afterimage>
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-5 pb-1.5">
              <a href={`#${nextId}`} className="focus-ring rounded-sm text-[14px] text-text-secondary underline-offset-4 hover:text-foreground hover:underline">
                Skip the reel
              </a>
              <Link href={`/components/${item.slug}`} className="focus-ring group inline-flex items-center gap-1.5 rounded-sm text-[15px] font-semibold text-link underline-offset-4 hover:underline">
                View component
                <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="dot-grid relative mx-auto w-full max-w-[1200px] flex-1 overflow-hidden rounded-xl border border-border bg-surface">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={item.slug}
                className="absolute inset-0 flex items-center justify-center overflow-auto p-8"
                initial={{ opacity: 0, x: direction * 48 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 48, transition: { duration: 0.2 } }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <DemoRenderer slug={item.slug} name={item.variant} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>
    </>
  );
}
