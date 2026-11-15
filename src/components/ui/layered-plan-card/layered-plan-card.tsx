"use client";

import { useState, type ComponentProps, type CSSProperties, type PointerEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ArrowRight, Check, Star } from "lucide-react";
import { RollingDigits } from "@/components/ui/rolling-digits/rolling-digits";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { BillingToggle } from "@/lib/pricing/billing-toggle";
import type { Billing, Plan } from "@/lib/pricing/types";
import { hasBillingPrices, useBilling } from "@/lib/pricing/use-billing";

export interface LayeredPlanCardProps extends Omit<ComponentProps<"div">, "children" | "onSelect"> {
  /** The plan to show: name, price, features, badge and call to action. */
  plan: Plan;
  /** Color of the base card, checks and glow, as any CSS color. White text sits on it, so keep it dark enough for 4.5:1. @default "var(--primary)" */
  accent?: string;
  /** Show the blurred glow under the stack. @default true */
  glow?: boolean;
  /** Controlled billing period. Setting it (or `defaultBilling`) shows a monthly/yearly toggle when the plan has a price per period. */
  billing?: Billing;
  /** Initial billing period when uncontrolled. Also shows the toggle. */
  defaultBilling?: Billing;
  /** Called when the billing toggle changes. */
  onBillingChange?: (billing: Billing) => void;
  /** Line under the plan name per billing period, shown while the toggle is in use. @default { monthly: "Billed monthly", yearly: "Billed yearly" } */
  billingNotes?: Partial<Record<Billing, string>>;
  /** Locale for the price. @default "en-US" */
  locale?: string;
  /** Called when the call to action is pressed (when the plan's cta has no href). */
  onSelect?: (plan: Plan, billing: Billing) => void;
}

const NOTES: Record<Billing, string> = { monthly: "Billed monthly", yearly: "Billed yearly", once: "One-time payment" };

export function LayeredPlanCard({
  plan,
  accent = "var(--primary)",
  glow = true,
  billing,
  defaultBilling,
  onBillingChange,
  billingNotes,
  locale = "en-US",
  onSelect,
  className,
  style,
  ...props
}: LayeredPlanCardProps) {
  const reduceMotion = useReducedMotion();
  const state = useBilling({ billing, defaultBilling, onBillingChange, locale });
  const showToggle = (billing !== undefined || defaultBilling !== undefined) && hasBillingPrices(plan);
  const price = state.priceFor(plan);
  const note = showToggle ? (billingNotes?.[state.billing] ?? NOTES[state.billing]) : plan.priceNote;

  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  // -1 at the card's left edge, 1 at its right: the glow leans toward the pointer.
  const lean = useMotionValue(0);
  const glowX = useTransform(useSpring(lean, { stiffness: 160, damping: 22 }), (v) => `${v * 14}%`);

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduceMotion || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    lean.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
  }

  // The top card slides up on hover so more of the band shows, and sinks a little while the band is pressed.
  const lift = reduceMotion ? 0 : (hovered ? -8 : 0) + (pressed ? 2 : 0);
  const cta = (
    <>
      <span>{plan.cta.label}</span>
      <motion.span aria-hidden="true" animate={{ x: hovered && !reduceMotion ? 3 : 0 }} transition={spring.snappy} className="inline-flex">
        <ArrowRight className="size-[18px]" strokeWidth={2.25} />
      </motion.span>
    </>
  );
  const ctaClass =
    "flex h-14 w-full cursor-pointer items-center justify-between rounded-b-3xl px-6 text-[15px] font-semibold text-white outline-none transition-[transform,box-shadow] duration-150 active:scale-[0.98] focus-visible:shadow-[inset_0_0_0_4px_var(--plan-accent),inset_0_0_0_6px_white]";
  const press = { onPointerDown: () => setPressed(true), onPointerUp: () => setPressed(false), onPointerLeave: () => setPressed(false), onPointerCancel: () => setPressed(false) };

  return (
    <div
      onPointerEnter={(event) => {
        // Hover is for mice and pens; on touch only the press applies.
        if (event.pointerType !== "touch") setHovered(true);
      }}
      onPointerLeave={() => {
        setHovered(false);
        lean.set(0);
      }}
      onPointerMove={onPointerMove}
      style={{ "--plan-accent": accent, ...style } as CSSProperties}
      className={cn("relative isolate w-full max-w-sm", className)}
      {...props}
    >
      {glow ? (
        <motion.div
          aria-hidden="true"
          style={{ x: glowX, background: "radial-gradient(closest-side, #22d3ee, var(--plan-accent) 55%, transparent)" }}
          animate={{ opacity: hovered && !reduceMotion ? 0.85 : 0.5 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none absolute inset-x-6 -bottom-7 -z-10 h-24 rounded-[50%] blur-2xl"
        />
      ) : null}

      <div className="rounded-3xl bg-(--plan-accent) shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--plan-accent)_70%,transparent)]">
        <motion.div
          animate={{ y: lift }}
          transition={spring.smooth}
          className="relative overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-6 text-[#0f1b3d] shadow-[0_1px_2px_rgb(0_0_0/0.05),0_12px_28px_-14px_rgb(15_27_61/0.35)]"
        >
          {/* A faint wash of the accent in the top-right corner. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(120% 70% at 100% 0%, color-mix(in oklab, var(--plan-accent) 13%, transparent), transparent 60%)" }}
          />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
              {note ? <p className="mt-0.5 text-[13px] text-[#5b6478]">{note}</p> : null}
            </div>
            {plan.badge ? (
              <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-(--plan-accent) pr-2.5 pl-1 text-[11px] font-bold tracking-[0.06em] text-white uppercase">
                <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-white/25">
                  <Star className="size-3" fill="currentColor" strokeWidth={0} />
                </span>
                {plan.badge}
              </span>
            ) : null}
          </div>

          {showToggle ? <BillingToggle value={state.billing} onValueChange={state.setBilling} size="sm" className="relative mt-4" /> : null}

          <hr className="relative my-5 border-black/[0.08]" />

          <p className="relative text-[13px] font-medium text-[#5b6478]">Includes</p>
          <ul className="relative mt-3 space-y-2.5 text-[14px]">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--plan-accent)_13%,white)] text-(--plan-accent)"
                >
                  <Check className="size-3" strokeWidth={3.5} />
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="relative mt-6">
            {price ? (
              <p className="flex items-start text-5xl leading-none font-semibold tracking-tight">
                {price.symbolFirst ? <span className="mt-1 mr-0.5 text-3xl text-[color-mix(in_oklab,var(--plan-accent)_78%,white)]">{price.symbol}</span> : null}
                <RollingDigits {...price.rolling} animateOnMount={false} />
                {price.symbolFirst ? null : <span className="mt-1 ml-1 text-3xl text-[color-mix(in_oklab,var(--plan-accent)_78%,white)]">{price.symbol}</span>}
              </p>
            ) : plan.customPrice ? (
              <p className="text-3xl leading-none font-semibold tracking-tight">{plan.customPrice}</p>
            ) : null}
            {price && plan.price?.period ? <p className="mt-2 text-[13px] text-[#5b6478]">{plan.price.period}</p> : null}
          </div>
        </motion.div>

        {plan.cta.href ? (
          <a href={plan.cta.href} className={ctaClass} {...press}>
            {cta}
          </a>
        ) : (
          <button type="button" onClick={() => onSelect?.(plan, state.billing)} className={ctaClass} {...press}>
            {cta}
          </button>
        )}
      </div>
    </div>
  );
}
