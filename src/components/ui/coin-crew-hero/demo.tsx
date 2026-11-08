"use client";

import { useState } from "react";
import { CoinCrewHero, type CoinAgent } from "@/components/ui/coin-crew-hero/coin-crew-hero";

export function Crew() {
  const [pokes, setPokes] = useState(0);
  return (
    <div className="flex w-full max-w-4xl flex-col gap-3">
      <CoinCrewHero cta={{ label: "Hire the crew", href: "#" }} onPoke={() => setPokes((n) => n + 1)} />
      <p className="text-center text-[13px] text-muted-foreground">{pokes ? `Poked ${pokes} ${pokes === 1 ? "time" : "times"}.` : "Poke a coin, or drag one out of the line and let go."}</p>
    </div>
  );
}

const CALM: CoinAgent[] = [
  { color: "#9ad1c4", mood: "sleepy" },
  { color: "#c6b8ff", mood: "shy" },
  { color: "#ffd58a", mood: "happy" },
  { color: "#f7a8a1", mood: "meh" },
  { color: "#a8c8ff", mood: "wink" },
  { color: "#b9e39b", mood: "sleepy" },
  { color: "#ffc2dc", mood: "shy" },
  { color: "#ffe39a", mood: "happy" },
];

export function Pastel() {
  return (
    <CoinCrewHero
      title="A quieter crew"
      description="Same agents, softer colors and a slower belt for a calmer page."
      cta={{ label: "Say hello", onClick: () => {} }}
      agents={CALM}
      speed={0.6}
      className="max-w-4xl"
    />
  );
}
