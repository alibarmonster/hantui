"use client";

import { useState } from "react";
import { BurstPackOpening, type BurstPack } from "@/components/ui/burst-pack-opening/burst-pack-opening";

// Original card art, drawn in SVG. Each takes a few colors, so the two packs share shapes but not looks.

function BallArt({ body, shade, cheek }: { body: string; shade: string; cheek: string }) {
  return (
    <svg viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice">
      <ellipse cx="50" cy="104" rx="26" ry="5" fill="#000" opacity="0.18" />
      <circle cx="50" cy="66" r="30" fill={body} />
      <path d="M22 76a30 30 0 0 0 56 0 34 34 0 0 1-56 0z" fill={shade} />
      <ellipse cx="38" cy="50" rx="9" ry="5" fill="#fff" opacity="0.55" transform="rotate(-28 38 50)" />
      <circle cx="41" cy="66" r="4" fill="#1d2130" />
      <circle cx="59" cy="66" r="4" fill="#1d2130" />
      <circle cx="42.2" cy="64.6" r="1.3" fill="#fff" />
      <circle cx="60.2" cy="64.6" r="1.3" fill="#fff" />
      <path d="M44 76q6 6 12 0" stroke="#1d2130" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <circle cx="33" cy="74" r="4" fill={cheek} opacity="0.7" />
      <circle cx="67" cy="74" r="4" fill={cheek} opacity="0.7" />
      <ellipse cx="38" cy="98" rx="7" ry="4" fill={shade} />
      <ellipse cx="62" cy="98" rx="7" ry="4" fill={shade} />
    </svg>
  );
}

function PlanetArt({ body, ring, glow }: { body: string; ring: string; glow: string }) {
  return (
    <svg viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice">
      {[[14, 22], [82, 30], [24, 108], [88, 96], [60, 16], [10, 70]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#fff" opacity="0.8" />
      ))}
      <circle cx="50" cy="66" r="34" fill={glow} opacity="0.25" />
      <ellipse cx="50" cy="68" rx="42" ry="11" fill="none" stroke={ring} strokeWidth="5" transform="rotate(-18 50 68)" opacity="0.55" />
      <circle cx="50" cy="66" r="23" fill={body} />
      <path d="M29 58q21 8 42-2M28 70q22 9 44 0" stroke="#fff" strokeOpacity="0.28" strokeWidth="3" fill="none" />
      <path d="M12.6 80.2a42 11 -18 0 0 76.6-23.6" fill="none" stroke={ring} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="42" cy="56" rx="7" ry="4" fill="#fff" opacity="0.45" transform="rotate(-28 42 56)" />
    </svg>
  );
}

function BlobArt({ body, shade }: { body: string; shade: string }) {
  return (
    <svg viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice">
      <ellipse cx="50" cy="102" rx="30" ry="5" fill="#000" opacity="0.15" />
      <path d="M22 96c-6-22 2-52 28-52s36 28 28 52c-3 8-53 8-56 0z" fill={body} />
      <path d="M24 92c10 8 42 8 52 0 2 10-54 10-52 0z" fill={shade} />
      <ellipse cx="40" cy="58" rx="8" ry="4.5" fill="#fff" opacity="0.6" transform="rotate(-24 40 58)" />
      <ellipse cx="42" cy="74" rx="3.4" ry="5" fill="#1d2130" />
      <ellipse cx="58" cy="74" rx="3.4" ry="5" fill="#1d2130" />
      <path d="M46 86q4 3 8 0" stroke="#1d2130" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function GalaxyArt({ core, arm, dust }: { core: string; arm: string; dust: string }) {
  return (
    <svg viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice">
      {[[12, 18], [86, 24], [20, 118], [90, 110], [70, 12], [8, 64], [94, 70], [44, 128]].map(([x, y], i) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={i % 3 ? 1 : 1.8} fill="#fff" opacity="0.85" />
      ))}
      <g transform="rotate(-24 50 68)">
        <ellipse cx="50" cy="68" rx="40" ry="16" fill={dust} opacity="0.35" />
        <ellipse cx="50" cy="68" rx="30" ry="10" fill={arm} opacity="0.6" />
        <path d="M14 70c14-18 42-22 58-8M86 66c-14 18-42 22-58 8" stroke="#fff" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <ellipse cx="50" cy="68" rx="13" ry="7" fill={core} />
        <ellipse cx="50" cy="68" rx="6" ry="3.5" fill="#fff" />
      </g>
    </svg>
  );
}

function StarArt({ body, edge }: { body: string; edge: string }) {
  return (
    <svg viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice">
      <path d="M50 22l3 10M82 46l-9 4M18 46l9 4M24 98l7-7M76 98l-7-7" stroke="#fff" strokeOpacity="0.8" strokeWidth="3" strokeLinecap="round" />
      <path d="M50 34l9.4 21.6 23.4 2.2-17.7 15.6 5.3 23-20.4-12.2-20.4 12.2 5.3-23L17.2 57.8l23.4-2.2z" fill={edge} transform="translate(0 4)" />
      <path d="M50 34l9.4 21.6 23.4 2.2-17.7 15.6 5.3 23-20.4-12.2-20.4 12.2 5.3-23L17.2 57.8l23.4-2.2z" fill={body} stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M50 42l5.6 14.6-11.2 4z" fill="#fff" opacity="0.5" />
    </svg>
  );
}

const packs: BurstPack[] = [
  {
    id: "cobalt",
    label: "Cobalt",
    color: "#1d4ed8",
    cards: [
      { id: "c1", name: "Bounder", stat: "Bounce 7 · Common", description: "Rolls downhill faster than it means to, and laughs the whole way.", ground: "#ffd9c2", art: <BallArt body="#e5383b" shade="#b3262a" cheek="#ffb3a7" /> },
      { id: "c2", name: "Halo Nine", stat: "Orbit 9 · Holo", rarity: "holo", description: "A quiet giant with rings you can hear if you hold very still.", ground: "linear-gradient(160deg,#1a1038,#3a1c6e 55%,#0e7490)", art: <PlanetArt body="#f59e0b" ring="#fde68a" glow="#f0abfc" /> },
      { id: "c3", name: "Mossling", stat: "Squish 4 · Common", description: "Leaves a faint smell of rain wherever it sits.", ground: "#c9f5df", art: <BlobArt body="#a3e635" shade="#65a30d" /> },
      { id: "c4", name: "Violet Drift", stat: "Spin 8 · Holo", rarity: "holo", description: "A slow whirl of dust that has been turning since before clocks.", ground: "linear-gradient(170deg,#12092b,#4c1d95)", art: <GalaxyArt core="#f0abfc" arm="#a78bfa" dust="#60a5fa" /> },
      { id: "c5", name: "First Light", stat: "Shine 10 · Common", description: "Shows up early and stays late.", ground: "linear-gradient(160deg,#f9a8d4,#fde047)", art: <StarArt body="#fbbf24" edge="#b45309" /> },
    ],
  },
  {
    id: "rose",
    label: "Rose",
    color: "#e11d74",
    cards: [
      { id: "r1", name: "Puddle", stat: "Bounce 5 · Common", description: "Hops in every puddle on principle.", ground: "#cfe9ff", art: <BallArt body="#3b82f6" shade="#1d4ed8" cheek="#bfdbfe" /> },
      { id: "r2", name: "Tidewatch", stat: "Orbit 6 · Common", description: "Keeps the sea company at night.", ground: "linear-gradient(160deg,#0b1d3a,#155e75)", art: <PlanetArt body="#5eead4" ring="#e0f2fe" glow="#7dd3fc" /> },
      { id: "r3", name: "Jamdrop", stat: "Squish 9 · Holo", rarity: "holo", description: "Sweet, sticky and impossible to stack.", ground: "linear-gradient(160deg,#ffe4f1,#fbcfe8)", art: <BlobArt body="#f472b6" shade="#be185d" /> },
      { id: "r4", name: "Ember Wheel", stat: "Spin 7 · Common", description: "Throws sparks when it yawns.", ground: "linear-gradient(170deg,#2a0f0a,#9a3412)", art: <GalaxyArt core="#fde68a" arm="#fb923c" dust="#f87171" /> },
      { id: "r5", name: "North Pin", stat: "Shine 8 · Holo", rarity: "holo", description: "Points the way home, mostly.", ground: "linear-gradient(160deg,#c7d2fe,#e0e7ff)", art: <StarArt body="#e5e7eb" edge="#6b7280" /> },
    ],
  },
];

export function Default() {
  const [burst, setBurst] = useState(true);
  const [run, setRun] = useState(0);
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <BurstPackOpening key={run} packs={packs} burst={burst} brandLabel="Orbiq" />
      <div className="flex items-center gap-5">
        <label className="flex h-10 cursor-pointer items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={burst} onChange={(event) => setBurst(event.target.checked)} className="size-4 accent-foreground" />
          Burst
        </label>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="h-10 cursor-pointer rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export function SinglePack() {
  return <BurstPackOpening packs={packs.slice(1)} seed={7} brandLabel="Orbiq" />;
}
