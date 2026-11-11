"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Writes text to the clipboard. Uses the async Clipboard API where it exists and falls back to a
 * hidden textarea with `document.execCommand("copy")` in non-secure contexts (plain HTTP, some
 * embedded webviews). Call it from an event handler only. Rejects when the copy is refused.
 */
export async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  textarea.remove();
  if (!ok) throw new Error("Copy command was rejected");
}

export interface UseCopyOptions {
  /** Milliseconds before `copied` returns to false. @default 2000 */
  resetAfter?: number;
  /** Called with the copied text after a successful copy. */
  onCopy?: (text: string) => void;
}

export interface UseCopyResult {
  /** True from a successful copy until `resetAfter` has passed. */
  copied: boolean;
  /** Copies the text. Resolves to false when the browser refuses. Call it from an event handler. */
  copy: () => Promise<boolean>;
  /** Returns to the idle state right away. */
  reset: () => void;
}

/** Copy-to-clipboard state for buttons: `copied` flips to true after a successful copy and resets on a timer. */
export function useCopy(text: string, { resetAfter = 2000, onCopy }: UseCopyOptions = {}): UseCopyResult {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const mounted = useRef(true);
  const latest = useRef({ text, resetAfter, onCopy });

  useEffect(() => {
    latest.current = { text, resetAfter, onCopy };
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  const reset = useCallback(() => {
    window.clearTimeout(timer.current);
    setCopied(false);
  }, []);

  const copy = useCallback(async () => {
    const current = latest.current;
    try {
      await writeClipboard(current.text);
    } catch {
      return false;
    }
    if (!mounted.current) return true;
    setCopied(true);
    current.onCopy?.(current.text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), current.resetAfter);
    return true;
  }, []);

  return { copied, copy, reset };
}
