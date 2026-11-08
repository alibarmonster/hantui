"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, useSpring } from "motion/react";
import { DemoRenderer } from "../demo-renderer";

export interface IndexCategory {
  id: string;
  name: string;
  count: number;
  /** The category's first component, previewed on hover or focus. */
  preview: { slug: string; variant: string } | null;
}

const FINE = "(hover: hover) and (pointer: fine)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(FINE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

const PREVIEW_W = 320;
const PREVIEW_H = 220;

/**
 * Every category as a large typographic list with its real count. With a mouse, hovering a row
 * floats a small live preview of its first component next to the pointer; keyboard focus shows the
 * same preview anchored to the row. On touch it is a plain list.
 */
export function CategoryIndex({ categories }: { categories: IndexCategory[] }) {
  const reduceMotion = useReducedMotion();
  const fine = useSyncExternalStore(subscribe, () => window.matchMedia(FINE).matches, () => false);
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<IndexCategory | null>(null);
  const spring = reduceMotion ? { duration: 0 } : { stiffness: 320, damping: 32, mass: 0.6 };
  const x = useSpring(0, spring);
  const y = useSpring(0, spring);

  const place = (left: number, top: number, jump: boolean) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    // Keep the card inside the section, beside the pointer rather than under it.
    const px = Math.min(box.width - PREVIEW_W, Math.max(0, left - box.left + 28));
    const py = Math.min(box.height - PREVIEW_H, Math.max(0, top - box.top - PREVIEW_H / 2));
    if (jump) {
      x.jump(px);
      y.jump(py);
    } else {
      x.set(px);
      y.set(py);
    }
  };

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setActive(null)}>
      <ul className="grid gap-x-16 md:grid-cols-2">
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={`/components?category=${c.id}`}
              onPointerEnter={(e) => {
                if (!fine || e.pointerType !== "mouse") return;
                place(e.clientX, e.clientY, !active);
                setActive(c);
              }}
              onPointerMove={(e) => fine && e.pointerType === "mouse" && place(e.clientX, e.clientY, false)}
              onFocus={(e) => {
                const b = e.currentTarget.getBoundingClientRect();
                place(b.left + b.width * 0.55, b.top + b.height / 2, true);
                setActive(c);
              }}
              onBlur={() => setActive(null)}
              className="focus-ring group flex items-baseline justify-between gap-6 border-b border-border py-3.5 transition-colors duration-150"
            >
              <span className="font-display text-[clamp(1.75rem,3.4vw,2.5rem)] leading-[1.15] font-bold tracking-[-0.015em] text-foreground transition-colors duration-150 group-hover:text-link">{c.name}</span>
              <span className="shrink-0 font-mono text-[14px] text-muted-foreground tabular-nums">{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {active?.preview ? (
          <motion.div
            key="preview"
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-10 hidden overflow-hidden rounded-lg border border-border bg-surface shadow-[0_8px_24px_rgb(28_25_23/0.1)] md:block"
            style={{ x, y, width: PREVIEW_W, height: PREVIEW_H, transformOrigin: "0% 50%" }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* A live preview, scaled down to fit the card. */}
            <div className="bg-dot-grid absolute top-1/2 left-1/2 flex h-[180%] w-[180%] -translate-x-1/2 -translate-y-1/2 scale-[0.555] items-center justify-center">
              <DemoRenderer key={active.preview.slug} slug={active.preview.slug} name={active.preview.variant} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
