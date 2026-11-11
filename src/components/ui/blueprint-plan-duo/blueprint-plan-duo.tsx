"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion } from "motion/react";
import { Check, ChevronsRight } from "lucide-react";
import { TextScramble } from "@/components/ui/text-scramble/text-scramble";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/lib/motion";
import { formatPrice } from "@/lib/pricing/format";
import type { Plan } from "@/lib/pricing/types";
import { planAmount } from "@/lib/pricing/use-billing";

export interface BlueprintPlanDuoProps extends Omit<ComponentProps<"section">, "children" | "title" | "onSelect"> {
  /** Section title, set in mono capitals. @default "Deployment plans" */
  title?: ReactNode;
  /** Small letter-spaced line under the title. */
  description?: ReactNode;
  /** Exactly two plans. Each `tone` picks its panel: "accent" (saturated) or "ink" (near-black). Without a tone, the first is accent and the second ink. */
  plans: Plan[];
  /** Notes under the panels, separated by bullets. Write them as placeholders unless they are real commitments. */
  footnotes?: string[];
  /** Color of the accent panel, as any CSS color. White text sits on it, so keep it at 4.5:1 or better. @default "var(--primary)" */
  accent?: string;
  /** Label above each price. @default "Starting from" */
  priceLabel?: string;
  /** Label above each feature list. @default ["Includes", "Everything in <first plan> +"] */
  featureLabels?: [string, string];
  /** Locale for prices. @default "en-US" */
  locale?: string;
  /** Called when a plan's button is pressed (when its cta has no href). */
  onSelect?: (plan: Plan) => void;
}

/** Corners and edges of a unit cube. */
const CORNERS = [
  [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1],
  [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1],
] as const;
const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
] as const;
const TILT = Math.PI / 6;

/** The cube turned by `angle` around its vertical axis and projected from above, as an SVG path in a 100×100 box. */
function boxPath(angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const points = CORNERS.map(([x, y, z]) => {
    const rx = x * cos - z * sin;
    const rz = x * sin + z * cos;
    return [50 + rx * 30, 50 - y * 30 * Math.cos(TILT) + rz * 30 * Math.sin(TILT)];
  });
  return EDGES.map(([a, b]) => `M${points[a][0].toFixed(2)} ${points[a][1].toFixed(2)}L${points[b][0].toFixed(2)} ${points[b][1].toFixed(2)}`).join("");
}

const REST_ANGLE = Math.PI / 4;
const REST_PATH = boxPath(REST_ANGLE);

interface PanelProps {
  plan: Plan;
  tone: "accent" | "ink";
  index: number;
  revealed: boolean;
  priceLabel: string;
  featureLabel: string;
  locale: string;
  onSelect?: (plan: Plan) => void;
}

function Panel({ plan, tone, index, revealed, priceLabel, featureLabel, locale, onSelect }: PanelProps) {
  const reduceMotion = useReducedMotion();
  const headingId = useId();
  const boxRef = useRef<SVGPathElement>(null);
  const angle = useMotionValue(REST_ANGLE);
  const [sweep, setSweep] = useState(0);

  // The wireframe is re-projected as it turns; the path is written straight to the DOM.
  useEffect(() => angle.on("change", (value) => boxRef.current?.setAttribute("d", boxPath(value))), [angle]);

  function onEnter(pointerType: string) {
    if (reduceMotion || pointerType === "touch") return;
    // A quarter turn lands the cube on an identical pose, so every hover starts from rest.
    angle.jump(REST_ANGLE);
    animate(angle, REST_ANGLE + Math.PI / 2, { duration: 1.6, ease: ease.inOut });
    setSweep((n) => n + 1);
  }

  const amount = planAmount(plan, "monthly");
  const price = amount !== null && plan.price ? formatPrice(amount, plan.price.currency, locale) : null;
  const priceText = price ? `${price.text}${plan.price?.period ?? ""}` : (plan.customPrice ?? "");
  const draw = { strokeDasharray: 1, strokeDashoffset: revealed ? 0 : 1 } as const;

  const buttonClass = cn(
    "group/cta flex h-12 w-full cursor-pointer items-center justify-between border border-white bg-white px-4 text-[13px] font-semibold tracking-[0.04em] uppercase outline-none transition-colors duration-200",
    "hover:bg-transparent hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-(--panel)",
    tone === "accent" ? "text-(--duo-accent)" : "text-[#0b0b0d]",
  );
  const buttonInner = (
    <>
      <span>{plan.cta.label}</span>
      <ChevronsRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover/cta:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/cta:translate-x-0" strokeWidth={2.25} />
    </>
  );

  return (
    <article
      aria-labelledby={headingId}
      onPointerEnter={(event) => onEnter(event.pointerType)}
      style={{ "--panel": tone === "accent" ? "var(--duo-accent)" : "#0b0b0d" } as CSSProperties}
      className={cn(
        "relative isolate flex flex-col overflow-hidden p-5 text-white @[36rem]:p-6",
        tone === "accent" ? "bg-(--duo-accent)" : "bg-[#0b0b0d] bg-[radial-gradient(90%_70%_at_100%_0%,rgb(255_255_255/0.14),transparent_65%)]",
      )}
    >
      {/* A faint scanline sweeps down once per hover. */}
      {sweep > 0 ? (
        <motion.div
          key={sweep}
          aria-hidden="true"
          initial={{ y: "-100%" }}
          animate={{ y: "100%" }}
          transition={{ duration: 0.9, ease: "linear" }}
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent_88%,rgb(255_255_255/0.14))]"
        />
      ) : null}

      <svg aria-hidden="true" viewBox="0 0 100 100" className="pointer-events-none absolute -top-2 -right-2 -z-10 size-36 opacity-30 @[36rem]:size-44" fill="none">
        <path
          ref={boxRef}
          d={REST_PATH}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={0.7}
          strokeLinecap="round"
          style={{ ...draw, transition: `stroke-dashoffset ${duration.slow * 2}s cubic-bezier(${ease.out.join(",")}) ${0.15 + index * 0.1}s` }}
          className="motion-reduce:transition-none!"
        />
      </svg>

      <span aria-hidden="true" className="grid size-10 place-items-center border border-white/70 [&_svg]:size-5">
        {plan.icon}
      </span>
      <h3 id={headingId} className="mt-5 text-lg font-semibold tracking-[0.04em] uppercase">
        {plan.name}
      </h3>
      {plan.description ? <p className="mt-1.5 max-w-[30ch] text-xs leading-5 tracking-[0.04em] text-white/90 uppercase">{plan.description}</p> : null}

      <hr className="my-5 border-white/25" />

      <p className="text-[11px] tracking-[0.12em] text-white/90 uppercase">{price ? priceLabel : (plan.priceNote ?? priceLabel)}</p>
      <TextScramble as="p" text={priceText.toUpperCase()} trigger="inView" duration={700} characters="0123456789$#/%" className="mt-2 text-4xl leading-none font-bold tracking-tight @[36rem]:text-5xl" />

      <hr className="my-5 border-white/25" />

      <p className="text-[11px] tracking-[0.12em] text-white/90 uppercase">{featureLabel}</p>
      <ul className="mt-3 flex-1 space-y-2.5 text-xs tracking-[0.04em] uppercase">
        {plan.features.map((feature, row) => (
          <li key={feature} className="flex items-start gap-2.5 leading-5">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} />
            {/* Rows resolve one after another: each takes a little longer than the one above. */}
            <TextScramble text={feature.toUpperCase()} trigger="inView" duration={500 + row * 160} />
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {plan.cta.href ? (
          <a href={plan.cta.href} className={buttonClass}>
            {buttonInner}
          </a>
        ) : (
          <button type="button" onClick={() => onSelect?.(plan)} className={buttonClass}>
            {buttonInner}
          </button>
        )}
      </div>
    </article>
  );
}

/** An L-shaped crop mark; `flip` mirrors it into each corner. */
function CropMark({ revealed, className }: { revealed: boolean; className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className={cn("pointer-events-none absolute size-4 text-foreground", className)}>
      <path
        d="M15.5 0.5H0.5V15.5"
        pathLength={1}
        stroke="currentColor"
        strokeWidth={1}
        style={{ strokeDasharray: 1, strokeDashoffset: revealed ? 0 : 1, transition: `stroke-dashoffset 0.3s cubic-bezier(${ease.out.join(",")})` }}
        className="motion-reduce:transition-none!"
      />
    </svg>
  );
}

export function BlueprintPlanDuo({
  title = "Deployment plans",
  description,
  plans,
  footnotes,
  accent = "var(--primary)",
  priceLabel = "Starting from",
  featureLabels,
  locale = "en-US",
  onSelect,
  className,
  style,
  ...props
}: BlueprintPlanDuoProps) {
  const ref = useRef<HTMLElement>(null);
  const revealed = useInView(ref, { once: true, amount: 0.25 });
  const pair = plans.slice(0, 2);
  const labels = featureLabels ?? ["Includes", `Everything in ${pair[0]?.name ?? "the first plan"} +`];

  return (
    <section
      ref={ref}
      style={{ "--duo-accent": accent, ...style } as CSSProperties}
      className={cn("@container w-full p-2 font-mono", className)}
      {...props}
    >
      <div className="relative border border-foreground/15 p-4 @[36rem]:p-6">
        {/* Crop marks sit just outside the frame and draw in from the corners. */}
        <CropMark revealed={revealed} className="-top-2 -left-2" />
        <CropMark revealed={revealed} className="-top-2 -right-2 -scale-x-100" />
        <CropMark revealed={revealed} className="-bottom-2 -left-2 -scale-y-100" />
        <CropMark revealed={revealed} className="-right-2 -bottom-2 -scale-100" />

        <header>
          <h2 className="text-xl font-semibold tracking-[0.04em] text-foreground uppercase @[36rem]:text-2xl">{title}</h2>
          {description ? <p className="mt-2 text-[11px] leading-5 tracking-[0.14em] text-muted-foreground uppercase">{description}</p> : null}
        </header>

        <div className="mt-6 grid grid-cols-1 gap-2 @[36rem]:grid-cols-2">
          {pair.map((plan, index) => (
            <Panel
              key={plan.id}
              plan={plan}
              tone={plan.tone === "ink" || plan.tone === "accent" ? plan.tone : index === 0 ? "accent" : "ink"}
              index={index}
              revealed={revealed}
              priceLabel={priceLabel}
              featureLabel={labels[index]}
              locale={locale}
              onSelect={onSelect}
            />
          ))}
        </div>

        {footnotes?.length ? (
          <ul className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] tracking-[0.12em] text-muted-foreground uppercase">
            {footnotes.map((note, index) => (
              <li key={note} className="flex items-center gap-3">
                {index > 0 ? <span aria-hidden="true">•</span> : null}
                {note}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
