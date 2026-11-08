"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

export interface TocItem {
  id: string;
  title: string;
  depth?: 2 | 3;
}

const OFFSET = 120;

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | undefined>(items[0]?.id);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setActiveId(items.at(-1)?.id);
        return;
      }
      let current = items[0]?.id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top - OFFSET <= 0) current = item.id;
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="On this page" className="text-[13px]">
      <p className="mb-3 font-medium text-foreground">On this page</p>
      <ul className="relative space-y-0.5 border-l border-border">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} className="relative">
              {active ? (
                <m.span
                  layoutId="toc-indicator"
                  transition={reduceMotion ? { duration: 0 } : spring.smooth}
                  className="absolute top-1 bottom-1 -left-px w-px bg-foreground"
                />
              ) : null}
              <a
                href={`#${item.id}`}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "focus-ring block rounded-sm py-1 leading-5 transition-colors",
                  item.depth === 3 ? "pl-6" : "pl-3.5",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * "On this page" below the wide layout: a native select at the top of the article (DESIGN 8.4), so the
 * section list stays reachable without a rail. Choosing a section jumps to it and resets the select.
 */
export function TocSelect({ items, className }: { items: TocItem[]; className?: string }) {
  if (items.length < 2) return null;
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">Jump to a section</span>
      <select
        defaultValue=""
        onChange={(event) => {
          const id = event.target.value;
          event.target.value = "";
          if (id) window.location.hash = id;
        }}
        className="focus-ring h-11 w-full cursor-pointer appearance-none rounded-md border border-input bg-surface pr-10 pl-3 text-[16px] text-foreground"
      >
        <option value="" disabled>
          On this page
        </option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.depth === 3 ? ` ${item.title}` : item.title}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </label>
  );
}
