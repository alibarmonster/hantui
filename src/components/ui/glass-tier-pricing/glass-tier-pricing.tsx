"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { LayoutGroup, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { RollingDigits } from "@/components/ui/rolling-digits/rolling-digits";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { BillingToggle } from "@/lib/pricing/billing-toggle";
import type { Billing, Plan } from "@/lib/pricing/types";
import { hasBillingPrices, useBilling, type PlanPrice } from "@/lib/pricing/use-billing";

export interface GlassTierPricingProps extends Omit<ComponentProps<"section">, "children" | "title" | "onSelect"> {
  /** Small pill above the title. @default "Pricing" */
  eyebrow?: string;
  /** Section title. @default "Clear pricing, no surprises." */
  title?: ReactNode;
  /** Supporting line under the title. */
  description?: ReactNode;
  /** Tiers, left to right. Three read best. */
  plans: Plan[];
  /** Id of the tier that gets the filled button and holds the spotlight at rest. @default the middle plan */
  featuredId?: string;
  /** Controlled billing period. Setting it (or `defaultBilling`) shows the billing toggle under the header. */
  billing?: Billing;
  /** Initial billing period when uncontrolled. Also shows the toggle. */
  defaultBilling?: Billing;
  /** Called when the billing toggle changes. */
  onBillingChange?: (billing: Billing) => void;
  /** Periods offered by the toggle. @default ["monthly", "yearly"] */
  billingOptions?: readonly Billing[];
  /** Small text after the price per billing period, used for plans priced per period while the toggle shows. @default { once: "One time", monthly: "/ month", yearly: "/ month, billed yearly" } */
  periodLabels?: Partial<Record<Billing, string>>;
  /** Locale for prices. @default "en-US" */
  locale?: string;
  /** Called when a tier's button is pressed (when its cta has no href). */
  onSelect?: (plan: Plan, billing: Billing) => void;
}

const PERIODS: Record<Billing, string> = { once: "One time", monthly: "/ month", yearly: "/ month, billed yearly" };
const ACCENT_GRADIENT = "linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 55%, #7c3aed))";

interface TierProps {
  plan: Plan;
  price: PlanPrice | null;
  period?: string;
  featured: boolean;
  spotlit: boolean;
  onActivate: () => void;
  onSelect: () => void;
}

function Tier({ plan, price, period, featured, spotlit, onActivate, onSelect }: TierProps) {
  const reduceMotion = useReducedMotion();
  const headingId = useId();
  const rotateX = useSpring(0, { stiffness: 220, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 220, damping: 20 });
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(0);
  const glare = useMotionTemplate`radial-gradient(220px circle at ${glareX}% ${glareY}%, rgb(255 255 255 / 0.9), transparent 70%)`;

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    glareX.set(x * 100);
    glareY.set(y * 100);
    if (reduceMotion) return;
    // The inner panel tilts toward the pointer, 3° at most.
    rotateY.set((x - 0.5) * 6);
    rotateX.set((0.5 - y) * 6);
  }

  function onPointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  const buttonClass = cn(
    "relative flex h-11 w-full cursor-pointer items-center justify-center rounded-full text-sm font-semibold outline-none transition-[box-shadow,transform,background-color] duration-200 active:scale-[0.98]",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    featured
      ? "text-white shadow-[0_8px_22px_-6px_color-mix(in_oklab,var(--primary)_75%,transparent),inset_0_1px_0_rgb(255_255_255/0.3)] hover:shadow-[0_10px_28px_-6px_color-mix(in_oklab,var(--primary)_90%,transparent),inset_0_1px_0_rgb(255_255_255/0.3)]"
      : "bg-white text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06),0_6px_16px_-8px_rgb(0_0_0/0.2)] hover:bg-white/80",
  );
  const buttonStyle = featured ? { background: ACCENT_GRADIENT } : undefined;

  return (
    <article
      aria-labelledby={headingId}
      data-tier={plan.id}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") onActivate();
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onFocus={onActivate}
      className={cn(
        "group/tier relative flex w-[84%] max-w-sm shrink-0 snap-center flex-col rounded-3xl border border-white/80 bg-white/55 p-2 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_16px_40px_-24px_rgb(30_41_90/0.35)] backdrop-blur-xl",
        "[@supports_not_(backdrop-filter:blur(1px))]:bg-white/[0.92] @[40rem]:w-auto @[40rem]:max-w-none",
      )}
    >
      {/* One spotlight for the whole row: it glides to whichever tier is hovered, focused or snapped. */}
      {spotlit ? (
        <motion.div
          layoutId="spotlight"
          aria-hidden="true"
          transition={reduceMotion ? { duration: 0 } : spring.smooth}
          style={{ borderRadius: 24 }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_55%_at_50%_0%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_75%)] shadow-[0_24px_60px_-28px_color-mix(in_oklab,var(--primary)_65%,transparent)]"
        />
      ) : null}
      <motion.div
        aria-hidden="true"
        style={{ background: glare }}
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover/tier:opacity-60"
      />

      {plan.badge ? (
        <span className="absolute top-5 right-5 z-10 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: ACCENT_GRADIENT }}>
          {plan.badge}
        </span>
      ) : null}

      <div className="relative [perspective:900px]">
        <motion.div
          style={{ rotateX, rotateY }}
          className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_10px_24px_-14px_rgb(30_41_90/0.3)]"
        >
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl text-white [&_svg]:size-5" style={{ background: ACCENT_GRADIENT }}>
            {plan.icon ?? <Sparkles />}
          </span>
          <h3 id={headingId} className="mt-4 text-lg font-semibold tracking-tight text-foreground">
            {plan.name}
          </h3>
          {plan.description ? <p className="mt-1.5 min-h-20 text-[13px] leading-5 text-muted-foreground">{plan.description}</p> : null}
          <p className="mt-4 flex min-h-10 flex-wrap items-baseline gap-x-2 gap-y-1">
            {price ? (
              <>
                <span className="text-4xl font-semibold tracking-tight text-foreground">
                  {price.symbolFirst ? price.symbol : null}
                  <RollingDigits {...price.rolling} animateOnMount={false} />
                  {price.symbolFirst ? null : ` ${price.symbol}`}
                </span>
                {period ? <span className="text-[13px] text-muted-foreground">{period}</span> : null}
              </>
            ) : (
              <span className="text-2xl font-semibold tracking-tight whitespace-nowrap text-foreground @[56rem]:text-3xl">{plan.customPrice}</span>
            )}
          </p>
        </motion.div>
      </div>

      <ul className="relative flex-1 space-y-2.5 px-3 pt-5 pb-6 text-[13.5px] text-foreground">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} />
            {feature}
          </li>
        ))}
      </ul>

      <div className="relative p-2">
        {plan.cta.href ? (
          <a href={plan.cta.href} className={buttonClass} style={buttonStyle}>
            {plan.cta.label}
          </a>
        ) : (
          <button type="button" onClick={onSelect} className={buttonClass} style={buttonStyle}>
            {plan.cta.label}
          </button>
        )}
      </div>
    </article>
  );
}

export function GlassTierPricing({
  eyebrow = "Pricing",
  title = "Clear pricing, no surprises.",
  description,
  plans,
  featuredId,
  billing,
  defaultBilling,
  onBillingChange,
  billingOptions,
  periodLabels,
  locale = "en-US",
  onSelect,
  className,
  ...props
}: GlassTierPricingProps) {
  const id = useId();
  const state = useBilling({ billing, defaultBilling, onBillingChange, locale });
  const showToggle = billing !== undefined || defaultBilling !== undefined;
  const featured = featuredId ?? plans[Math.floor((plans.length - 1) / 2)]?.id;

  /** The tier the pointer or focus is on, if any. */
  const [active, setActive] = useState<string | null>(null);
  /** The tier snapped to the middle while the row scrolls as a carousel; null when every tier fits. */
  const [snapped, setSnapped] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const spotlight = active ?? snapped ?? featured;

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    let frame = 0;
    let started = false;
    const tiers = () => Array.from(row.querySelectorAll<HTMLElement>("[data-tier]"));
    const read = () => {
      frame = 0;
      if (row.scrollWidth <= row.clientWidth + 1) {
        started = false;
        setSnapped(null);
        return;
      }
      if (!started) {
        // The carousel opens on the featured tier.
        started = true;
        const first = tiers().find((tier) => tier.dataset.tier === featured);
        if (first) row.scrollLeft = first.offsetLeft - (row.clientWidth - first.offsetWidth) / 2;
      }
      const center = row.scrollLeft + row.clientWidth / 2;
      let nearest: string | null = null;
      let best = Infinity;
      for (const tier of tiers()) {
        const distance = Math.abs(tier.offsetLeft + tier.offsetWidth / 2 - center);
        if (distance < best) {
          best = distance;
          nearest = tier.dataset.tier ?? null;
        }
      }
      setSnapped(nearest);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    schedule();
    row.addEventListener("scroll", schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(row);
    return () => {
      cancelAnimationFrame(frame);
      row.removeEventListener("scroll", schedule);
      observer.disconnect();
    };
  }, [featured, plans.length]);

  function showTier(planId: string) {
    const row = rowRef.current;
    const tier = row?.querySelector<HTMLElement>(`[data-tier="${CSS.escape(planId)}"]`);
    if (!row || !tier) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({ left: tier.offsetLeft - (row.clientWidth - tier.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <section
      className={cn(
        "@container relative isolate w-full overflow-hidden rounded-[2rem] bg-[#f4f5fb] px-4 py-12 @[40rem]:px-5 @[40rem]:py-14 @[56rem]:px-8",
        className,
      )}
      {...props}
    >
      {/* Soft color behind the cards, so the frosted glass has something to blur. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(40%_45%_at_18%_62%,color-mix(in_oklab,var(--primary)_20%,transparent),transparent),radial-gradient(38%_42%_at_84%_70%,rgb(168_85_247/0.2),transparent),radial-gradient(45%_35%_at_52%_100%,rgb(56_189_248/0.22),transparent)]"
      />

      <div className="flex flex-col items-center text-center">
        {eyebrow ? (
          <p className="rounded-full border border-white bg-white/70 px-3 py-1 text-xs font-medium text-foreground/70 shadow-[0_1px_2px_rgb(0_0_0/0.05)]">{eyebrow}</p>
        ) : null}
        <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-balance text-foreground @[40rem]:text-4xl">{title}</h2>
        {description ? <p className="mt-3 max-w-lg text-[15px] leading-7 text-foreground/65">{description}</p> : null}
        {showToggle ? <BillingToggle value={state.billing} onValueChange={state.setBilling} options={billingOptions} className="mt-6 border-white bg-white/70" /> : null}
      </div>

      <LayoutGroup id={id}>
        <div
          ref={rowRef}
          onPointerLeave={() => setActive(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setActive(null);
          }}
          className="-mx-4 mt-10 flex snap-x snap-mandatory gap-3 @[56rem]:gap-4 overflow-x-auto px-4 pt-1 pb-8 [scrollbar-width:none] @[40rem]:mx-0 @[40rem]:grid @[40rem]:grid-cols-[repeat(var(--tiers),minmax(0,1fr))] @[40rem]:overflow-visible @[40rem]:px-0 @[40rem]:pb-0 [&::-webkit-scrollbar]:hidden"
          style={{ "--tiers": plans.length } as CSSProperties}
        >
          {plans.map((plan) => (
            <Tier
              key={plan.id}
              plan={plan}
              price={state.priceFor(plan)}
              period={showToggle && hasBillingPrices(plan) ? (periodLabels?.[state.billing] ?? PERIODS[state.billing]) : plan.price?.period}
              featured={plan.id === featured}
              spotlit={plan.id === spotlight}
              onActivate={() => setActive(plan.id)}
              onSelect={() => onSelect?.(plan, state.billing)}
            />
          ))}
        </div>
      </LayoutGroup>

      {snapped ? (
        <div className="flex justify-center gap-1 @[40rem]:hidden">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              aria-label={`Show ${plan.name}`}
              aria-current={plan.id === snapped ? "true" : undefined}
              onClick={() => showTier(plan.id)}
              className="group/dot grid size-10 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className={cn("size-2 rounded-full transition-[transform,background-color] duration-200", plan.id === snapped ? "scale-125 bg-foreground" : "bg-foreground/25 group-hover/dot:bg-foreground/50")} />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
