"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "hantui:theme";
const ORDER: ThemeChoice[] = ["light", "dark", "system"];
const EVENT = "hantui:theme";

/**
 * Runs inline in <head> before the first paint: applies the stored choice (or the OS preference for
 * "system", the default) as data-theme on <html>, so the page never flashes the wrong theme.
 */
export const themeScript = `(function(){try{var c=localStorage.getItem("${THEME_KEY}")||"system";var d=c==="dark"||(c==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})()`;

function readChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function apply(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  // Following the OS: re-apply when it changes.
  const onScheme = () => {
    if (readChoice() === "system") apply("system");
    onChange();
  };
  mq.addEventListener("change", onScheme);
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    mq.removeEventListener("change", onScheme);
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const LABELS: Record<ThemeChoice, string> = { light: "Light", dark: "Dark", system: "System" };
const ICONS = { light: Sun, dark: Moon, system: Monitor };

/** Cycles Light, Dark and System. A theme switch is seen a few times per visit, so it swaps instantly. */
export function ThemeSwitch() {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "system" as ThemeChoice);
  const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
  const Icon = ICONS[choice];
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {
          // Storage blocked: still switch for this page.
        }
        apply(next);
        window.dispatchEvent(new Event(EVENT));
      }}
      aria-label={`Theme: ${LABELS[choice]}. Switch to ${LABELS[next]}`}
      title={`Theme: ${LABELS[choice]}`}
      className="focus-ring touch-target inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      <Icon className="size-[18px]" aria-hidden="true" />
    </button>
  );
}
