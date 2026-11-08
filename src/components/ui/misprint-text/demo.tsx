"use client";

import { useRef, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MisprintText, type MisprintTextHandle } from "@/components/ui/misprint-text/misprint-text";

const KEEPER =
  "Every night the keeper climbed ninety-one steps, wiped the salt from the glass and lit the lamp. Ships he would never meet passed safely in the dark, and in the morning he wrote one line in the log: the light held, the sea was loud, nobody needed him, which was exactly the point.";

function Toggle({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="h-8 cursor-pointer rounded-md border border-input px-3 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background active:scale-[0.96]"
    >
      {children}
    </button>
  );
}

export function Press() {
  const ref = useRef<MisprintTextHandle>(null);
  const [speed, setSpeed] = useState(1);
  const [dark, setDark] = useState(false);
  const [glitch, setGlitch] = useState(true);
  const [stickers, setStickers] = useState(true);
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Print settings">
        {[0.5, 1, 2].map((s) => (
          <Toggle key={s} pressed={speed === s} onClick={() => setSpeed(s)}>
            {s}×
          </Toggle>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <Toggle pressed={dark} onClick={() => setDark((d) => !d)}>
          Dark
        </Toggle>
        <Toggle pressed={glitch} onClick={() => setGlitch((g) => !g)}>
          Idle glitch
        </Toggle>
        <Toggle pressed={stickers} onClick={() => setStickers((s) => !s)}>
          Stickers
        </Toggle>
        <button
          type="button"
          onClick={() => ref.current?.replay()}
          className="ml-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-semibold text-primary-foreground outline-none hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.96]"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reprint
        </button>
      </div>
      <div className={cn("rounded-xl border border-border px-7 py-8 transition-colors", dark ? "bg-[#161412] text-[#f5f5f4]" : "bg-background text-foreground")}>
        <MisprintText
          ref={ref}
          text={KEEPER}
          seed="keeper"
          speed={speed}
          tone={dark ? "dark" : "light"}
          idleGlitch={glitch}
          stickers={stickers ? 0.125 : 0}
          className="text-[clamp(1.25rem,2.6vw,1.6rem)] leading-[1.5] font-semibold tracking-[-0.01em]"
        />
      </div>
    </div>
  );
}

export function Headline() {
  return (
    <MisprintText
      text="Late edition, still warm from the press."
      seed="edition"
      stickers={0.35}
      className="max-w-xl text-center font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.1] font-bold tracking-[-0.02em]"
    />
  );
}
