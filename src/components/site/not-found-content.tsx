"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { Search } from "lucide-react";
import { readyComponents } from "@/content/components";
import { kinetic, ui } from "@/lib/motion";
import { Afterimage } from "./afterimage";

/** The 404: a headline that drifts in with its afterimages, a way home, and a small component search. */
export function NotFoundContent() {
  const reduceMotion = useReducedMotion();
  // Starts offset on the server and the first client frame alike; the effect settles it.
  const x = useMotionValue(-56);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = needle ? readyComponents.filter((c) => `${c.name} ${c.description}`.toLowerCase().includes(needle)).slice(0, 6) : [];

  useEffect(() => {
    if (reduceMotion) {
      x.set(0);
      return;
    }
    const controls = animate(x, 0, { ...kinetic.heroLetter, duration: 0.7 });
    return () => controls.stop();
  }, [x, reduceMotion]);

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center"
      onPointerMove={(e) => {
        if (reduceMotion || e.pointerType !== "mouse") return;
        // The headline leans toward the pointer, a little: enough to show its trail.
        const offset = (e.clientX / window.innerWidth - 0.5) * 36;
        animate(x, offset, { type: "spring", stiffness: 140, damping: 18 });
      }}
    >
      <Afterimage x={x}>
        <h1 className="font-display text-[clamp(2.75rem,8vw,5.5rem)] leading-[1] font-bold tracking-[-0.02em]">This page is a ghost.</h1>
      </Afterimage>
      <p className="mt-6 max-w-md text-[17px] leading-[1.6] text-text-secondary">It moved, or it never shipped. Search the components or head back home.</p>

      <div className="mt-8 w-full max-w-sm text-left">
        <label className="relative block">
          <span className="sr-only">Search components</span>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${readyComponents.length} components…`}
            className="h-10 w-full rounded-md border border-input bg-surface pr-3 pl-10 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_rgb(194_65_12/0.12)]"
          />
        </label>
        {needle ? (
          <ul className="mt-2 overflow-hidden rounded-lg border border-border bg-surface" aria-live="polite">
            {matches.length ? (
              matches.map((c) => (
                <li key={c.slug}>
                  <Link href={`/components/${c.slug}`} className="focus-ring flex h-11 items-center px-3.5 text-[15px] text-foreground hover:bg-surface-2">
                    {c.name}
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-3.5 py-3 text-[14px] text-muted-foreground">No components match “{query.trim()}”.</li>
            )}
          </ul>
        ) : null}
      </div>

      <Link
        href="/"
        className="focus-ring mt-8 inline-flex h-10 items-center rounded-md bg-primary px-4 text-[15px] font-semibold text-primary-foreground transition-[background-color,box-shadow,scale] hover:bg-primary-hover hover:shadow-glow active:scale-[0.96]"
        style={{ transitionDuration: `${ui.press.duration}s` }}
      >
        Back home
      </Link>
    </main>
  );
}
