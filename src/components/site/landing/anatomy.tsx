"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { MotionConfig } from "motion/react";
import { ArrowRight, FileCode2, Folder, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button/hold-to-confirm-button";
import { usePageDark } from "../theme-switch";

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="focus-ring flex w-full cursor-pointer items-center justify-between gap-4 rounded-md border border-border bg-surface px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-2"
    >
      <span>
        <span className="block text-[15px] font-semibold text-foreground">{label}</span>
        <span className="block text-[13px] text-muted-foreground">{hint}</span>
      </span>
      <span aria-hidden="true" className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors duration-150", checked ? "bg-primary" : "bg-input")}>
        <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-background shadow-sm transition-transform duration-150", checked && "translate-x-4")} />
      </span>
    </button>
  );
}

/**
 * "Anatomy of a component": the real Hold to Confirm button, with switches that change it live
 * (reduced motion, a visible keyboard focus ring, the other theme, 10% speed), and under it the files
 * it ships with and the first lines of its source.
 */
export function Anatomy({ files, source, sourceLines }: { files: string[]; source: ReactNode; sourceLines: number }) {
  const [reduced, setReduced] = useState(false);
  const [focusRing, setFocusRing] = useState(false);
  const [flip, setFlip] = useState(false);
  // The preview switch shows whichever theme the page isn't in.
  const darkPage = usePageDark();
  const other = darkPage ? "light" : "dark";
  const [slow, setSlow] = useState(false);
  const [confirmed, setConfirmed] = useState(0);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <div
          data-theme={flip ? other : undefined}
          className={cn(
            "dot-grid relative flex min-h-[18rem] items-center justify-center rounded-lg border border-border bg-background p-10 transition-colors duration-200",
            // Shows the focus style the button gets from the keyboard, without moving focus there.
            focusRing && "[&_button]:outline-2 [&_button]:outline-offset-2 [&_button]:outline-ring [&_button]:outline-solid",
          )}
        >
          <MotionConfig reducedMotion={reduced ? "always" : "user"}>
            <HoldToConfirmButton key={`${slow}`} duration={slow ? 15000 : 1500} icon={<Trash2 aria-hidden="true" />} confirmedLabel="Deleted" onConfirm={() => setConfirmed((n) => n + 1)}>
              Hold to delete
            </HoldToConfirmButton>
          </MotionConfig>
          <p className="absolute bottom-3 left-4 font-mono text-[12px] text-muted-foreground tabular-nums" aria-live="polite">
            {confirmed ? `Confirmed ${confirmed}×` : "Press and hold, or hold Space"}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle checked={reduced} onChange={setReduced} label="Reduced motion" hint="Fades instead of moving" />
          <Toggle checked={focusRing} onChange={setFocusRing} label="Keyboard focus visible" hint="The ring you see when tabbing" />
          <Toggle checked={flip} onChange={setFlip} label={darkPage ? "Light preview" : "Dark preview"} hint={`Same tokens, ${other} values`} />
          <Toggle checked={slow} onChange={setSlow} label="Slow motion" hint="The hold at 10% speed" />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="mb-2 text-[11px] leading-[1.3] font-semibold tracking-[0.06em] text-muted-foreground uppercase">Files</p>
          <ul className="space-y-1.5 font-mono text-[13px] text-foreground">
            <li className="flex items-center gap-2">
              <Folder className="size-3.5 text-muted-foreground" aria-hidden="true" />
              components/ui/hold-to-confirm-button/
            </li>
            {files.map((f) => (
              <li key={f} className="flex items-center gap-2 pl-5">
                <FileCode2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="code-block relative overflow-hidden rounded-lg border border-border bg-code">
          <div className="flex h-10 items-center justify-between border-b border-border bg-surface px-4">
            <span className="font-mono text-[12px] text-muted-foreground">hold-to-confirm-button.tsx</span>
            <span className="font-mono text-[12px] text-muted-foreground tabular-nums">{sourceLines} lines</span>
          </div>
          <div className="max-h-[17rem] overflow-hidden">{source}</div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-code to-transparent" />
        </div>
        <Link href="/components/hold-to-confirm-button" className="focus-ring touch-target group inline-flex w-fit items-center gap-1.5 rounded-sm text-[15px] font-semibold text-link underline-offset-4 hover:underline">
          Read the whole component
          <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
