"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type CSSProperties, type KeyboardEvent } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type Variants } from "motion/react";
import { ArrowDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopy } from "@/lib/clipboard";
import { duration, ease, spring } from "@/lib/motion";

export interface InviteCodeRevealProps extends Omit<ComponentProps<"div">, "children" | "onCopy"> {
  /** The invite code that is revealed and copied. */
  code: string;
  /** Text on the small pill above the code. Pressing it folds the code away again. @default "Your invite code" */
  label?: string;
  /** Text on the closed pill. @default "Your invite is ready" */
  revealLabel?: string;
  /** Copy button text. @default "COPY" */
  copyLabel?: string;
  /** Copy button text after a successful copy. @default "COPIED" */
  copiedLabel?: string;
  /** Controlled open state. */
  open?: boolean;
  /** Whether the code starts revealed when uncontrolled. @default false */
  defaultOpen?: boolean;
  /** Called when the pill opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Called with the code after it is copied. */
  onCopy?: (code: string) => void;
  /** Color of the action button, as any CSS color. Pick one that keeps white text readable. @default "#15803d" */
  accent?: string;
}

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function InviteCodeReveal({
  code,
  label = "Your invite code",
  revealLabel = "Your invite is ready",
  copyLabel = "COPY",
  copiedLabel = "COPIED",
  open,
  defaultOpen = false,
  onOpenChange,
  onCopy,
  accent = "#15803d",
  className,
  style,
  onKeyDown,
  ...props
}: InviteCodeRevealProps) {
  const [internal, setInternal] = useState(defaultOpen);
  const isOpen = open ?? internal;
  const reduceMotion = useReducedMotion();
  const id = useId();
  const { copied, copy, reset } = useCopy(code, { resetAfter: 1600, onCopy });

  const revealRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLButtonElement>(null);
  /** Set when the user toggled, so focus follows them; controlled changes from outside leave focus alone. */
  const moveFocus = useRef(false);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (isOpen ? labelRef : revealRef).current?.focus({ preventScroll: true });
  }, [isOpen]);

  function setOpen(next: boolean) {
    moveFocus.current = true;
    if (!next) reset();
    if (open === undefined) setInternal(next);
    onOpenChange?.(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.key === "Escape" && isOpen && !event.defaultPrevented) {
      event.preventDefault();
      setOpen(false);
    }
  }

  const morph = reduceMotion ? { duration: 0 } : spring.smooth;
  // The resting values are the same in both modes: they are server-rendered as inline styles, so
  // only where a swap starts and ends may depend on reduced motion.
  const rest = { opacity: 1, y: 0, filter: "blur(0px)" };
  const swap: Variants = reduceMotion
    ? { initial: { ...rest, opacity: 0 }, animate: rest, exit: { ...rest, opacity: 0 } }
    : { initial: { opacity: 0, y: 6, filter: "blur(4px)" }, animate: rest, exit: { opacity: 0, y: -6, filter: "blur(4px)" } };
  const swapTransition = { duration: duration.quick, ease: ease.out };

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{ "--invite-accent": accent, ...style } as CSSProperties}
      className={cn("relative w-full max-w-[360px] pt-10", className)}
      {...props}
    >
      {/* The label pill rises out of the main pill's top edge and settles 8px above it. */}
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="label"
            className="absolute inset-x-0 top-0 flex justify-center"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.9 }}
            transition={reduceMotion ? { duration: duration.quick } : spring.smooth}
          >
            <button
              ref={labelRef}
              type="button"
              aria-expanded="true"
              aria-controls={`${id}-code`}
              onClick={() => setOpen(false)}
              className={cn(
                "relative h-8 cursor-pointer rounded-full border border-white bg-muted px-3.5 text-[13px] font-medium text-foreground/70 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_3px_10px_-3px_rgb(0_0_0/0.14)] transition-colors hover:text-foreground",
                "after:absolute after:-inset-x-1 after:-inset-y-1.5 after:content-['']",
                focusRing,
              )}
            >
              {label}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative flex h-14 items-center rounded-full bg-muted pr-2 pl-5 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_6px_18px_-6px_rgb(0_0_0/0.16)]">
        {/* Solid border while closed; the dashed one wipes in over it when the code shows. */}
        <span aria-hidden="true" className={cn("pointer-events-none absolute inset-0 rounded-full border border-white transition-opacity duration-200", isOpen && "opacity-0")} />
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ clipPath: isOpen ? "inset(0 0% 0 0 round 9999px)" : "inset(0 100% 0 0 round 9999px)", opacity: isOpen ? 1 : 0 }}
          transition={reduceMotion ? { duration: duration.quick } : { duration: duration.slow, ease: ease.out }}
          className="pointer-events-none absolute inset-0 rounded-full border-[1.5px] border-dashed border-foreground/30"
        />

        <span id={`${id}-code`} className="relative grid min-w-0 flex-1 items-center *:[grid-area:1/1]">
          <AnimatePresence initial={false}>
            {isOpen ? (
              <motion.span
                key="code"
                variants={swap}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={swapTransition}
                className="truncate font-mono text-[15px] font-bold tracking-wide text-foreground select-text"
              >
                {code}
              </motion.span>
            ) : (
              <motion.span
                key="reveal"
                aria-hidden="true"
                variants={swap}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={swapTransition}
                className="truncate text-[15px] font-medium text-foreground"
              >
                {revealLabel}
              </motion.span>
            )}
          </AnimatePresence>
        </span>

        <LayoutGroup id={id}>
          {isOpen ? (
            <motion.button
              key="copy"
              type="button"
              layoutId="action"
              transition={morph}
              style={{ borderRadius: 9999 }}
              onClick={() => void copy()}
              className={cn(
                "relative ml-3 flex h-10 shrink-0 cursor-pointer items-center justify-center bg-(--invite-accent) px-4 text-xs font-bold tracking-[0.08em] text-white",
                "after:absolute after:-inset-y-0.5 after:inset-x-0 after:content-['']",
                focusRing,
                "focus-visible:ring-offset-muted",
              )}
            >
              <motion.span layout="position" transition={morph} className="grid *:[grid-area:1/1]">
                <span className="invisible" aria-hidden="true">
                  {copyLabel}
                </span>
                <span className="invisible inline-flex items-center gap-1" aria-hidden="true">
                  <Check className="size-3.5" />
                  {copiedLabel}
                </span>
                <AnimatePresence initial={false}>
                  <motion.span
                    key={copied ? "copied" : "copy"}
                    variants={swap}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={swapTransition}
                    className="inline-flex items-center justify-center gap-1"
                  >
                    {copied ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : null}
                    {copied ? copiedLabel : copyLabel}
                  </motion.span>
                </AnimatePresence>
              </motion.span>
            </motion.button>
          ) : (
            <motion.span
              key="arrow"
              aria-hidden="true"
              layoutId="action"
              transition={morph}
              style={{ borderRadius: 9999 }}
              className="ml-3 flex size-10 shrink-0 items-center justify-center bg-(--invite-accent) text-white"
            >
              <motion.span layout="position" transition={morph}>
                <ArrowDown className="size-[18px]" strokeWidth={2.5} />
              </motion.span>
            </motion.span>
          )}
        </LayoutGroup>

        {/* While closed the whole pill is one button. */}
        {isOpen ? null : (
          <button
            ref={revealRef}
            type="button"
            aria-expanded="false"
            aria-controls={`${id}-code`}
            onClick={() => setOpen(true)}
            className={cn("absolute inset-0 cursor-pointer rounded-full active:bg-foreground/[0.03]", focusRing)}
          >
            <span className="sr-only">{revealLabel}</span>
          </button>
        )}
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Code copied" : ""}
      </span>
    </div>
  );
}
