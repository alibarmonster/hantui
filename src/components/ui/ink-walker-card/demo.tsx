"use client";

import { useState } from "react";
import { InkWalkerCard, type InkWalkerCardProps } from "@/components/ui/ink-walker-card/ink-walker-card";
import { cn } from "@/lib/utils";

const FIGURES = ["commuter", "courier", "jogger", "cyclist"] as const;
const PROPS: Record<(typeof FIGURES)[number], NonNullable<InkWalkerCardProps["prop"]>> = { commuter: "lamp", courier: "mailbox", jogger: "bench", cyclist: "lamp" };

export function Default() {
  const [figure, setFigure] = useState<(typeof FIGURES)[number]>("commuter");
  const [greetings, setGreetings] = useState(0);
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div role="radiogroup" aria-label="Figure" className="inline-flex flex-wrap justify-center rounded-full border border-border bg-surface p-1">
        {FIGURES.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === figure}
            onClick={() => setFigure(option)}
            className={cn(
              "h-8 cursor-pointer rounded-full px-3.5 text-[13px] font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              option === figure ? "bg-foreground text-background" : "text-foreground/65 hover:text-foreground",
            )}
          >
            {option}
          </button>
        ))}
      </div>
      <InkWalkerCard
        figure={figure}
        prop={PROPS[figure]}
        tone="day"
        title="Nothing here yet"
        description={greetings ? `You have said hi ${greetings} ${greetings === 1 ? "time" : "times"}. Try the ${PROPS[figure]} too.` : "New orders will show up on this street. Say hi while you wait."}
        onReact={() => setGreetings((n) => n + 1)}
      />
    </div>
  );
}

export function Night() {
  return <InkWalkerCard figure="cyclist" prop="lamp" tone="night" accent="#7c8cf8" title="Page not found" description="This road ends here. The lamp still works, though." />;
}

export function StripOnly() {
  return <InkWalkerCard figure="jogger" prop="bench" tone="day" accent="#2f6f6a" speed={0.85} className="max-w-xl" />;
}
