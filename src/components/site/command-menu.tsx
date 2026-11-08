"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Box, CornerDownLeft, FileText, LayoutGrid, Search } from "lucide-react";
import { categories, readyComponents } from "@/content/components";
import { docsPages } from "@/content/docs-nav";
import { cn } from "@/lib/utils";
import { Kbd } from "./kbd";
import { NewBadge } from "./sidebar-nav";

type Group = "Components" | "Categories" | "Docs";
/** Results come in these groups (DESIGN 9), components first. */
const GROUPS: Group[] = ["Components", "Categories", "Docs"];
/** Before typing, the short groups lead so they aren't buried under every component. */
const BROWSE_GROUPS: Group[] = ["Docs", "Categories", "Components"];

interface CommandItem {
  id: string;
  title: string;
  /** Shown under the title. */
  subtitle: string;
  /** Extra words that match but aren't shown. */
  keywords: string;
  href: string;
  group: Group;
  isNew?: boolean;
}

const allItems: CommandItem[] = [
  ...categories.flatMap((category) =>
    readyComponents
      .filter((c) => c.category === category.id)
      .map((c) => ({
        id: c.slug,
        title: c.name,
        subtitle: `${category.name} · ${c.description}`,
        keywords: category.name,
        href: `/components/${c.slug}`,
        group: "Components" as const,
        isNew: c.isNew,
      })),
  ),
  ...categories
    .map((category) => ({ category, count: readyComponents.filter((c) => c.category === category.id).length }))
    .filter(({ count }) => count > 0)
    .map(({ category, count }) => ({
      id: `category:${category.id}`,
      title: category.name,
      subtitle: `${count} component${count === 1 ? "" : "s"}`,
      keywords: "category",
      href: `/components?category=${category.id}`,
      group: "Categories" as const,
    })),
  ...docsPages.map((page) => ({
    id: page.href,
    title: page.title,
    subtitle: page.description,
    keywords: "docs",
    href: page.href,
    group: "Docs" as const,
  })),
];

const ICONS: Record<Group, typeof Box> = { Components: Box, Categories: LayoutGrid, Docs: FileText };

/** Characters of `query` appear in order in `text`; tighter runs score higher. */
function subsequenceScore(query: string, text: string) {
  let score = 0;
  let run = 0;
  let index = 0;
  for (const char of query) {
    const found = text.indexOf(char, index);
    if (found === -1) return 0;
    run = found === index ? run + 1 : 0;
    score += 1 + run;
    index = found + 1;
  }
  return Math.min(score / (query.length * 3), 1) * 20;
}

function scoreItem(query: string, item: CommandItem) {
  const title = item.title.toLowerCase();
  if (title === query) return 100;
  if (title.startsWith(query)) return 80;
  if (title.split(/[\s-]+/).some((word) => word.startsWith(query))) return 60;
  if (title.includes(query)) return 50;
  const fuzzy = subsequenceScore(query.replace(/\s+/g, ""), title);
  if (fuzzy > 0) return 20 + fuzzy;
  return `${item.subtitle} ${item.keywords}`.toLowerCase().includes(query) ? 10 : 0;
}

export function CommandMenu({
  open,
  onOpenChange,
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Element to refocus on close (whatever had focus when the palette opened). */
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  // Each open starts fresh, however the palette was closed (Escape, ⌘K again, a result).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  // Grouped in a fixed order; within a group, the best match first. Keyboard order follows the list.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const scored = q
      ? allItems
          .map((item) => ({ item, score: scoreItem(q, item) }))
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((r) => r.item)
      : allItems;
    return (q ? GROUPS : BROWSE_GROUPS).map((name) => ({ name, items: scored.filter((item) => item.group === name) })).filter((g) => g.items.length);
  }, [query]);
  const results = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function select(item: CommandItem | undefined) {
    if (!item) return;
    onOpenChange(false);
    router.push(item.href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      select(results[activeIndex]);
    }
  }

  let index = -1;

  return (
    // Opens and closes instantly: search is used many times a day (DESIGN 6.1, 9).
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-zinc-950/15 backdrop-blur-[2px]" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center px-4 pt-[min(14vh,7rem)]">
          <Dialog.Content
            aria-describedby={undefined}
            // No Dialog.Trigger: put focus back where it was before the palette opened.
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              returnFocusRef?.current?.focus();
            }}
            className="pointer-events-auto w-full max-w-[34rem] overflow-hidden rounded-[14px] border border-border bg-popover shadow-xl outline-none"
          >
            <Dialog.Title className="sr-only">Search documentation</Dialog.Title>
            <div className="flex h-13 items-center gap-2.5 border-b border-border px-4">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={results.length ? `${listId}-${activeIndex}` : undefined}
                aria-label="Search components and docs"
                placeholder="Search components and docs…"
                spellCheck={false}
                className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <Kbd>Esc</Kbd>
            </div>

            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Results"
              className="max-h-[min(56vh,26rem)] overflow-y-auto overscroll-contain p-1.5"
            >
              {results.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No results for “{query.trim()}”.
                </p>
              ) : (
                groups.map((group) => (
                  <div key={group.name} role="group" aria-label={group.name} className="pb-1">
                    <p aria-hidden="true" className="px-2.5 pt-2 pb-1.5 text-xs font-medium text-muted-foreground">
                      {group.name}
                    </p>
                    {group.items.map((item) => {
                      index += 1;
                      const itemIndex = index;
                      const active = itemIndex === activeIndex;
                      const Icon = ICONS[item.group];
                      return (
                        <div
                          key={item.id}
                          id={`${listId}-${itemIndex}`}
                          role="option"
                          aria-selected={active}
                          data-index={itemIndex}
                          onPointerMove={() => !active && setActiveIndex(itemIndex)}
                          onClick={() => select(item)}
                          // Search is used many times a day, so the active row switches instantly.
                          className={cn("relative flex h-12 cursor-pointer items-center gap-3 rounded-[10px] px-2.5", active && "bg-surface-2")}
                        >
                          <span className="relative flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                            <Icon className="size-3.5" aria-hidden="true" />
                          </span>
                          <span className="relative min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
                              {item.isNew ? <NewBadge className="shrink-0" /> : null}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
                          </span>
                          <CornerDownLeft
                            aria-hidden="true"
                            className={cn(
                              "relative size-3.5 shrink-0 text-muted-foreground transition-opacity",
                              active ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="hidden items-center gap-4 border-t border-border bg-surface px-4 py-2.5 text-xs text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>↵</Kbd>
                to open
              </span>
              <span className="ml-auto font-mono tabular-nums">
                {results.length} result{results.length === 1 ? "" : "s"}
              </span>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
