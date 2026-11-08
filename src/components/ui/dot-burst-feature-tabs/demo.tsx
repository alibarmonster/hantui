"use client";

import { CalendarCheck, Mountain, Route } from "lucide-react";
import { DotBurstFeatureTabs, FeatureNote, NoteMeter } from "@/components/ui/dot-burst-feature-tabs/dot-burst-feature-tabs";

export function Money() {
  return <DotBurstFeatureTabs className="max-w-5xl" />;
}

const TRAILS = [
  {
    id: "plan",
    title: "Plan the route",
    description: "Pick a trailhead and the app sketches a loop that fits your afternoon.",
    color: "#0e9f9a",
    card: <FeatureNote app="Fernwick" icon={<Route />} title="Ridge loop, 9.4 km" body="Back before sunset, 3h 10m" chip="412 m climb" accent="#0e9f9a" time="Sat" />,
  },
  {
    id: "weather",
    title: "Go when the sky agrees",
    description: "A heads-up when the clouds lift over the summit you saved.",
    color: "#f2542d",
    card: <FeatureNote app="Fernwick" icon={<Mountain />} title="Summit clears at 10:00" body="Wind drops below 20 km/h" chip="Good window" accent="#f2542d" time="7:45" />,
  },
  {
    id: "streak",
    title: "Keep the streak going",
    description: "Small weekly goals that count every walk, not just the big ones.",
    color: "#7357ff",
    card: (
      <FeatureNote app="Fernwick" icon={<CalendarCheck />} title="Four weekends in a row" body="One more walk this week keeps it" accent="#7357ff" time="Sun">
        <NoteMeter value={0.8} accent="#7357ff" label={<><span>16 km walked</span><span>Goal 20 km</span></>} />
      </FeatureNote>
    ),
  },
];

export function Trails() {
  return <DotBurstFeatureTabs heading="Weekends, sorted." items={TRAILS} interval={3.5} dotDensity={0.85} className="max-w-5xl" />;
}
