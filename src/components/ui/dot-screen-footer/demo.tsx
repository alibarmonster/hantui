"use client";

import { useState } from "react";
import { DotScreenFooter, type DotScreenFooterProps } from "@/components/ui/dot-screen-footer/dot-screen-footer";

const columns = [
  { title: "Studio", links: [{ label: "Work", href: "#work" }, { label: "Approach", href: "#approach" }, { label: "Journal", href: "#journal" }] },
  { title: "Contact", links: [{ label: "hello@example.com", href: "mailto:hello@example.com" }, { label: "(555) 010-0142", href: "tel:5550100142" }, { label: "New project", href: "#brief" }] },
  { title: "Elsewhere", links: [{ label: "Newsletter", href: "#newsletter" }, { label: "Press kit", href: "#press" }, { label: "Careers", href: "#careers" }] },
];

const field = "flex flex-col gap-1 text-xs font-medium text-muted-foreground";
const control = "h-10 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Default() {
  const [tone, setTone] = useState<NonNullable<DotScreenFooterProps["tone"]>>("ink");
  const [shape, setShape] = useState<NonNullable<DotScreenFooterProps["shape"]>>("round");
  const [angle, setAngle] = useState(0);
  const [plates, setPlates] = useState<1 | 2>(1);
  const [gap, setGap] = useState(6);
  const [crop, setCrop] = useState(0.2);
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className={field}>
          Tone
          <select className={control} value={tone} onChange={(event) => setTone(event.target.value as typeof tone)}>
            <option value="ink">Ink</option>
            <option value="paper">Paper</option>
            <option value="terracotta">Terracotta</option>
            <option value="cobalt">Cobalt</option>
          </select>
        </label>
        <label className={field}>
          Shape
          <select className={control} value={shape} onChange={(event) => setShape(event.target.value as typeof shape)}>
            <option value="round">Round</option>
            <option value="square">Square</option>
            <option value="line">Line</option>
          </select>
        </label>
        <label className={field}>
          Angle
          <select className={control} value={angle} onChange={(event) => setAngle(Number(event.target.value))}>
            <option value={0}>0°</option>
            <option value={15}>15°</option>
            <option value={45}>45°</option>
          </select>
        </label>
        <label className={field}>
          Plates
          <select className={control} value={plates} onChange={(event) => setPlates(Number(event.target.value) as 1 | 2)}>
            <option value={1}>One</option>
            <option value={2}>Two</option>
          </select>
        </label>
        <label className={field}>
          Gap {gap}px
          <input type="range" min={4} max={12} step={1} value={gap} onChange={(event) => setGap(Number(event.target.value))} className="h-10 w-28 accent-foreground" />
        </label>
        <label className={field}>
          Crop {Math.round(crop * 100)}%
          <input type="range" min={0} max={0.6} step={0.05} value={crop} onChange={(event) => setCrop(Number(event.target.value))} className="h-10 w-28 accent-foreground" />
        </label>
      </div>
      <DotScreenFooter
        wordmark="Lumivo"
        brand="Lumivo Studio"
        meta={
          <>
            © 2026 Lumivo
            <br />
            Port Aster · Vale Harbor
          </>
        }
        columns={columns}
        tone={tone}
        shape={shape}
        angle={angle}
        plates={plates}
        gap={gap}
        crop={crop}
        className="rounded-2xl"
      />
    </div>
  );
}

export function Paper() {
  return <DotScreenFooter wordmark="Corvane" brand="Corvane" meta="© 2026 · Marrow Bay" columns={columns.slice(0, 2)} tone="paper" shape="line" angle={45} plates={2} gap={7} className="rounded-2xl" />;
}
