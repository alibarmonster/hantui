"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Clock3, Search, X } from "lucide-react";
import { categories, components, getCategory, type CategoryId, type ComponentEntry } from "@/content/components";
import { cn } from "@/lib/utils";
import { DemoRenderer } from "./demo-renderer";
import { PreviewStage } from "./component-preview";
import { NewBadge } from "./sidebar-nav";

type Filter = CategoryId | "all" | "new";

function isFilter(value: string | null): value is Filter {
  return value === "new" || categories.some((c) => c.id === value);
}

/** Mounts children once the element comes near the viewport. */
function WhenVisible({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    // data-preview-card lets a tall demo trim itself to fit the card (see the ASCII Aquarium chat hero).
    <div ref={ref} data-preview-card="" className="relative flex h-full w-full items-center justify-center p-6">
      {visible ? children : null}
    </div>
  );
}

/** A gallery card: every card the same size (it's an index), a 4:3 live preview, the name and category. */
function ReadyCard({ entry, preview }: { entry: ComponentEntry; preview?: string }) {
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface transition-[translate,box-shadow] duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-md">
      <PreviewStage className="aspect-[4/3] rounded-none border-0 border-b">
        {preview ? (
          <WhenVisible>
            <DemoRenderer slug={entry.slug} name={preview} />
          </WhenVisible>
        ) : null}
      </PreviewStage>
      <Link href={`/components/${entry.slug}`} className="focus-ring flex min-h-16 flex-col justify-center gap-0.5 px-4 py-3 transition-transform duration-120 active:scale-[0.98]">
        <span className="flex items-center gap-2">
          <span className="truncate text-[16px] font-semibold text-foreground">{entry.name}</span>
          {entry.isNew ? <NewBadge /> : null}
        </span>
        <span className="truncate text-[14px] text-muted-foreground">{getCategory(entry.category).name}</span>
      </Link>
    </article>
  );
}

function PlannedItem({ entry }: { entry: ComponentEntry }) {
  return (
    <li className="min-w-0 rounded-[10px] border border-dashed border-border px-3.5 py-3">
      <span className="block truncate text-[13px] font-medium text-foreground/80">{entry.name}</span>
      <span className="mt-0.5 line-clamp-1 block text-[13px] text-muted-foreground">{entry.description}</span>
    </li>
  );
}

const CATEGORY_EVENT = "gallery:category";

function subscribeToCategory(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CATEGORY_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CATEGORY_EVENT, onChange);
  };
}

const readCategory = () => new URLSearchParams(window.location.search).get("category");
const readServerCategory = () => null;

/**
 * Category lives in the URL (?category=…). Reading it through an external store keeps the
 * server HTML hydratable (it renders "all", then switches) instead of re-rendering every card.
 */
export function Gallery({ previews }: { previews: Record<string, string> }) {
  const param = useSyncExternalStore(subscribeToCategory, readCategory, readServerCategory);
  const choose = (next: Filter) => {
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", next);
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event(CATEGORY_EVENT));
  };
  return <GalleryView previews={previews} filter={isFilter(param) ? param : "all"} onFilterChange={choose} />;
}

function GalleryView({
  previews,
  filter,
  onFilterChange,
}: {
  previews: Record<string, string>;
  filter: Filter;
  onFilterChange?: (filter: Filter) => void;
}) {
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map = new Map<Filter, number>([
      ["all", components.length],
      ["new", components.filter((c) => c.isNew).length],
    ]);
    for (const c of components) map.set(c.category, (map.get(c.category) ?? 0) + 1);
    return map;
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = components.filter(
      (c) =>
        (filter === "all" || (filter === "new" ? c.isNew : c.category === filter)) &&
        (!q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)),
    );
    return {
      ready: matches.filter((c) => c.status === "ready"),
      planned: matches.filter((c) => c.status !== "ready"),
    };
  }, [filter, query]);
  const total = results.ready.length + results.planned.length;

  const choose = (next: Filter) => onFilterChange?.(next);
  const readyTotal = components.filter((c) => c.status === "ready").length;

  const chip = (id: Filter, label: string, className?: string) => {
    const active = id === filter;
    return (
      <button
        key={id}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => choose(id)}
        className={cn(
          "focus-ring inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-colors duration-150 pointer-coarse:h-11",
          active ? "bg-primary text-primary-foreground" : "bg-surface-2 text-text-secondary hover:text-foreground",
          className,
        )}
      >
        {label}
        <span className={cn("font-mono text-[12px] font-normal tabular-nums", active ? "text-primary-foreground" : "text-muted-foreground")}>{counts.get(id)}</span>
      </button>
    );
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Categories with their counts. The current one gets the selected fill and a terracotta bar. */}
      <nav aria-label="Categories" className="hidden lg:block">
        <ul className="sticky top-24 space-y-px">
          {(["all", ...categories.map((c) => c.id)] as Filter[]).map((id) => {
            const active = id === filter;
            const label = id === "all" ? "All components" : getCategory(id as CategoryId).name;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => choose(id)}
                  className={cn(
                    "focus-ring relative flex h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-md pr-2.5 pl-3.5 text-left text-[14px] transition-colors duration-150 pointer-coarse:h-11",
                    active ? "bg-selected font-semibold text-foreground" : "text-text-secondary hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  {active ? <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary" /> : null}
                  <span className="truncate">{label}</span>
                  <span className="font-mono text-[12px] font-normal text-muted-foreground tabular-nums">{counts.get(id)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0">
        <div className="mb-8 flex flex-col gap-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by name or behavior…"
              aria-label="Filter components"
              className="h-10 w-full rounded-md border border-input bg-surface pr-10 pl-10 text-[16px] pointer-coarse:h-11 text-foreground transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_rgb(194_65_12/0.12)] sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear filter"
                className="focus-ring absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div role="radiogroup" aria-label="Quick filters" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {chip("all", "All")}
            {chip("new", "New")}
            {/* Categories are chips only where the sidebar isn't shown. */}
            {categories.map((c) => chip(c.id, c.name, "lg:hidden"))}
          </div>
        </div>

        <p className="sr-only" role="status">
          {total} component{total === 1 ? "" : "s"}
        </p>

        {total === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface px-6 py-20 text-center">
            <p className="max-w-md text-[16px] text-text-secondary">
              {query.trim() ? `No components match “${query.trim()}”. Clear the search to see all ${readyTotal}.` : `Nothing here yet. Show all ${readyTotal} components instead.`}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                choose("all");
              }}
              className="focus-ring touch-target inline-flex h-10 cursor-pointer items-center rounded-md border border-input bg-transparent px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-surface-2 active:scale-[0.96]"
            >
              Clear
            </button>
          </div>
        ) : (
          <>
            {results.ready.length ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {results.ready.map((entry) => (
                  <ReadyCard key={entry.slug} entry={entry} preview={previews[entry.slug]} />
                ))}
              </div>
            ) : null}
            {results.planned.length ? (
              <section aria-labelledby="in-progress-heading" className={cn(results.ready.length && "mt-14")}>
                <h2 id="in-progress-heading" className="mb-4 flex items-center gap-2 text-[16px] font-semibold text-foreground">
                  <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
                  In progress
                  <span className="font-mono text-[12px] font-normal text-muted-foreground tabular-nums">{results.planned.length}</span>
                </h2>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {results.planned.map((entry) => (
                    <PlannedItem key={entry.slug} entry={entry} />
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
