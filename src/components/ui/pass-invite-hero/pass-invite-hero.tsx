"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useInView, useMotionTemplate, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Check, Copy, RotateCw, Smartphone } from "lucide-react";
import { TextScramble } from "@/components/ui/text-scramble/text-scramble";
import { cn } from "@/lib/utils";
import { useCopy } from "@/lib/clipboard";
import { duration, ease, spring, stagger } from "@/lib/motion";

export interface PassInviteAction {
  /** Button text. */
  label: string;
  /** Renders the button as a link. */
  href?: string;
  /** Called on press when there is no href. */
  onClick?: () => void;
}

export interface PassInvitePalette {
  /** Start of the pass gradient and the headline highlight. */
  from?: string;
  /** End of the pass gradient and the headline highlight. */
  to?: string;
  /** Section background. */
  wash?: string;
}

export interface PassInviteHeroProps extends Omit<ComponentProps<"section">, "children" | "title" | "onCopy"> {
  /** First part of the headline. @default "You've been sent a" */
  title?: string;
  /** The end of the headline, set in the pass gradient. @default "Spirit Pass" */
  highlight?: string;
  /** Muted lines under the headline. */
  description?: ReactNode;
  /** The invite code: shown in the chip, on the back of the pass, and copied. @default "7UG9-VBMW" */
  code?: string;
  /** The filled button. @default { label: "Download for iPhone" } */
  primaryAction?: PassInviteAction;
  /** The soft button. @default { label: "Join the Android & web waitlist" } */
  secondaryAction?: PassInviteAction;
  /** Small muted note under the buttons. Pass null to leave it out. */
  note?: ReactNode;
  /** Brand name set vertically on the pass's stub. @default "Nimbra" */
  brand?: string;
  /** Your own mascot in place of the ghost, such as an SVG. It fills the same spot on the pass. */
  mascot?: ReactNode;
  /** Colors to override. */
  palette?: PassInvitePalette;
  /** Give the pass one full spin about every six seconds while nobody is touching it. @default true */
  autoSpin?: boolean;
  /** Called with the code after it is copied. */
  onCopy?: (code: string) => void;
  /** Heading element for the headline. @default "h1" */
  as?: "h1" | "h2" | "h3";
}

/** A small seeded generator (mulberry32). */
function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MATRIX = 13;
/** A code-style square pattern derived from the invite code. Decorative: it does not scan. */
function matrixPath(code: string) {
  let hash = 2166136261;
  for (const char of code) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const random = seededRandom(hash);
  const corner = (x: number, y: number) => (x < 4 && y < 4) || (x > MATRIX - 5 && y < 4) || (x < 4 && y > MATRIX - 5);
  let d = "";
  for (let y = 0; y < MATRIX; y++) for (let x = 0; x < MATRIX; x++) if (!corner(x, y) && random() > 0.52) d += `M${x} ${y}h1v1h-1z`;
  for (const [x, y] of [[0, 0], [MATRIX - 4, 0], [0, MATRIX - 4]]) d += `M${x} ${y}h4v4h-4zM${x + 1} ${y + 1}v2h2v-2z`;
  return d;
}

const FOIL = "linear-gradient(115deg,transparent 15%,rgb(255 255 255/0.5) 34%,rgb(125 211 252/0.45) 44%,rgb(253 230 138/0.45) 54%,rgb(244 114 182/0.4) 64%,transparent 82%)";
const TICKET_MASK = "radial-gradient(circle 9px at calc(100% - 60px) 0, transparent 97%, #000), radial-gradient(circle 9px at calc(100% - 60px) 100%, transparent 97%, #000)";

export function PassInviteHero({
  title = "You've been sent a",
  highlight = "Spirit Pass",
  description = "Someone saved you a seat. Claim your pass with the code below and step inside before the doors open to everyone.",
  code = "7UG9-VBMW",
  primaryAction = { label: "Download for iPhone" },
  secondaryAction = { label: "Join the Android & web waitlist" },
  note = "On a computer? Copy your code, then open the app on your phone.",
  brand = "Nimbra",
  mascot,
  palette,
  autoSpin = true,
  onCopy,
  as: Heading = "h1",
  className,
  style,
  ...props
}: PassInviteHeroProps) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const passRef = useRef<HTMLDivElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const blushRef = useRef<SVGGElement>(null);
  const inView = useInView(rootRef, { amount: 0.2 });
  const [announcement, setAnnouncement] = useState("");
  const pattern = useMemo(() => matrixPath(code), [code]);

  /** The pass's turn around its vertical axis, in degrees. 0 shows the front, 180 the back. */
  const turn = useMotionValue(0);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const float = useMotionValue(0);
  const hop = useMotionValue(0);
  const rotateY = useTransform(() => turn.get() + tiltY.get());
  const foilPosition = useTransform(rotateY, (v) => `${50 + (((v % 360) + 360) % 360) * 0.5}% 50%`);
  const foil = useMotionTemplate`${foilPosition}`;

  // Everything the loop needs lives here, outside React.
  const motionState = useRef({ velocity: 0, rest: 0, coasting: false, dragging: false, lastX: 0, hoverX: 0, hoverY: 0, hovering: false, idle: 0, pointerX: 0, pointerY: 0, blinkUntil: 0 });
  const autoSpinRef = useRef(autoSpin);
  useEffect(() => {
    autoSpinRef.current = autoSpin;
  });

  const { copied, copy } = useCopy(code, {
    resetAfter: 1800,
    onCopy: (value) => {
      setAnnouncement("Code copied");
      onCopy?.(value);
      // The ghost does a little hop.
      if (!reduceMotion) animate(hop, [0, -14, 0, -5, 0], { duration: 0.6, ease: "easeOut" });
    },
  });

  // One loop for float, hover tilt, spin momentum and the ghost's eyes. It runs only in view.
  useEffect(() => {
    if (!inView || reduceMotion) return;
    const s = motionState.current;
    let frame = 0;
    let last = performance.now();
    let time = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      float.set(Math.sin(time * 1.3) * 4);
      // Ease the tilt toward the pointer, or back to a slow idle sway.
      const wantY = s.hovering && !s.dragging ? s.hoverX * 12 : Math.sin(time * 0.6) * 4;
      const wantX = s.hovering && !s.dragging ? -s.hoverY * 9 : Math.sin(time * 0.8) * 3;
      tiltY.set(tiltY.get() + (wantY - tiltY.get()) * Math.min(1, dt * 8));
      tiltX.set(tiltX.get() + (wantX - tiltX.get()) * Math.min(1, dt * 8));
      if (!s.dragging) {
        // Coast on the throw, then a spring pulls the pass onto its nearest face.
        const angle = turn.get();
        if (s.coasting && Math.abs(s.velocity) > 220) {
          s.velocity *= Math.pow(0.12, dt);
          s.rest = Math.round((angle + s.velocity * 0.18) / 180) * 180;
        } else {
          s.coasting = false;
          s.velocity += ((s.rest - angle) * 46 - s.velocity * 11) * dt;
        }
        turn.set(angle + s.velocity * dt);
        s.idle = s.hovering ? 0 : s.idle + dt;
        if (autoSpinRef.current && s.idle > 6 && Math.abs(s.rest - angle) < 1) {
          s.idle = 0;
          s.rest += 360;
        }
      }
      // The ghost looks at the pointer.
      const pass = passRef.current;
      if (pass && eyesRef.current) {
        const rect = pass.getBoundingClientRect();
        const dx = s.pointerX - (rect.left + rect.width * 0.4);
        const dy = s.pointerY - (rect.top + rect.height * 0.5);
        const reach = Math.hypot(dx, dy) || 1;
        const look = Math.min(1, reach / 160) * 2.6;
        const blink = now < s.blinkUntil ? 0.12 : 1;
        eyesRef.current.setAttribute("transform", `translate(${((dx / reach) * look).toFixed(2)} ${((dy / reach) * look).toFixed(2)}) translate(0 ${(50 * (1 - blink)).toFixed(2)}) scale(1 ${blink})`);
        blushRef.current?.setAttribute("opacity", now < s.blinkUntil + 500 ? "0.95" : "0.55");
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const onPointer = (event: PointerEvent) => {
      s.pointerX = event.clientX;
      s.pointerY = event.clientY;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [inView, reduceMotion, float, tiltX, tiltY, turn]);

  function onPassPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const s = motionState.current;
    s.dragging = true;
    s.lastX = event.clientX;
    s.velocity = 0;
    s.idle = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPassPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const s = motionState.current;
    const rect = event.currentTarget.getBoundingClientRect();
    s.hovering = event.pointerType !== "touch";
    s.hoverX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    s.hoverY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    if (!s.dragging) return;
    const dx = event.clientX - s.lastX;
    s.lastX = event.clientX;
    turn.set(turn.get() + dx * 0.7);
    s.velocity = s.velocity * 0.6 + dx * 0.7 * 60 * 0.4;
  }
  function onPassPointerUp() {
    const s = motionState.current;
    if (!s.dragging) return;
    const moved = Math.abs(s.velocity) > 30 || Math.abs(turn.get() - s.rest) > 6;
    s.dragging = false;
    s.coasting = true;
    s.rest = Math.round((turn.get() + s.velocity * 0.18) / 180) * 180;
    // A press without a drag is a poke: the ghost blinks and blushes.
    if (!moved) s.blinkUntil = performance.now() + 170;
    if (reduceMotion) turn.jump(s.rest);
  }
  function flip() {
    const s = motionState.current;
    s.rest = Math.round(turn.get() / 180) * 180 + 180;
    s.coasting = false;
    s.idle = 0;
    if (reduceMotion) turn.jump(s.rest);
  }

  const from = palette?.from ?? "#7c3aed";
  const to = palette?.to ?? "#db2777";
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
  const itemTransition = reduceMotion ? { duration: 0 } : { duration: duration.slow, ease: ease.out };
  const actionClass = "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold outline-none transition-transform duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 @[30rem]:w-auto";
  const action = (config: PassInviteAction, className: string, icon?: ReactNode) =>
    config.href ? (
      <a href={config.href} className={cn(actionClass, className)}>
        {icon}
        {config.label}
      </a>
    ) : (
      <button type="button" onClick={config.onClick} className={cn(actionClass, className)}>
        {icon}
        {config.label}
      </button>
    );

  return (
    <section
      ref={rootRef}
      style={{ "--pass-from": from, "--pass-to": to, "--pass-wash": palette?.wash ?? "#f3efff", ...style } as CSSProperties}
      className={cn("@container relative isolate w-full overflow-hidden rounded-[2rem] bg-(--pass-wash) px-5 pt-12 pb-12 text-center", className)}
      {...props}
    >
      {/* Soft glow and a slow fan of light rays behind the pass. CSS only. */}
      <div aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 -z-10 size-[620px] -translate-x-1/2 -translate-y-[22%] @max-[30rem]:size-[420px]">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--pass-to)_30%,white),transparent)]" />
        <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0.32 }} transition={reduceMotion ? { duration: 0 } : { duration: 1.2, ease: ease.out }} className="absolute inset-0">
          <div className="absolute inset-0 animate-[spin_48s_linear_infinite] rounded-full bg-[repeating-conic-gradient(from_0deg,rgb(255_255_255/0.95)_0deg_7deg,transparent_7deg_20deg)] [mask-image:radial-gradient(closest-side,#000_25%,transparent_85%)] motion-reduce:animate-none" />
        </motion.div>
      </div>

      <div className="mx-auto w-[min(300px,80%)] [perspective:1100px]">
        <motion.div
          initial={{ y: -220, rotate: -18, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          transition={reduceMotion ? { duration: 0 } : { ...spring.bouncy, opacity: { duration: duration.base } }}
        >
          <motion.div
            ref={passRef}
            role="img"
            aria-label={`${highlight} from ${brand}. Invite code ${code}. Admit one.`}
            onPointerDown={onPassPointerDown}
            onPointerMove={onPassPointerMove}
            onPointerUp={onPassPointerUp}
            onPointerCancel={onPassPointerUp}
            onPointerLeave={() => {
              motionState.current.hovering = false;
            }}
            style={{ rotateY, rotateX: tiltX, y: float }}
            className="relative aspect-[300/190] w-full cursor-grab touch-pan-y select-none [transform-style:preserve-3d] active:cursor-grabbing"
          >
            {/* Front */}
            <div
              className="absolute inset-0 overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,var(--pass-from),var(--pass-to))] shadow-[0_24px_50px_-20px_color-mix(in_oklab,var(--pass-from)_80%,transparent)] [backface-visibility:hidden]"
              style={{ maskImage: TICKET_MASK, maskComposite: "intersect", WebkitMaskImage: TICKET_MASK, WebkitMaskComposite: "source-in" }}
            >
              <svg aria-hidden="true" viewBox="0 0 300 190" className="absolute inset-0 size-full" fill="none">
                <g fill="#fff" opacity="0.22">
                  <ellipse cx="54" cy="150" rx="46" ry="16" />
                  <ellipse cx="96" cy="162" rx="40" ry="14" />
                  <ellipse cx="196" cy="42" rx="34" ry="11" />
                  <ellipse cx="170" cy="50" rx="26" ry="9" />
                </g>
                <path d="M240 12v166" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="3 5" />
              </svg>
              <motion.div style={{ y: hop }} className="absolute top-[12%] left-[13%] aspect-square w-[44%]">
                {mascot ?? (
                  <svg aria-hidden="true" viewBox="0 0 100 100" className="size-full drop-shadow-[0_6px_10px_rgb(60_0_90/0.35)]">
                    <path d="M18 56c0-22 14-38 32-38s32 16 32 38v26c0 5-5 6-8 2l-5-6-6 8c-2 3-5 3-7 0l-6-8-6 8c-2 3-5 3-7 0l-6-8-5 6c-3 4-8 3-8-2z" fill="#fff" />
                    <path d="M26 44c2-11 10-18 20-19" stroke="#e9d5ff" strokeWidth="4" strokeLinecap="round" fill="none" />
                    <g ref={blushRef} fill="#f9a8d4" opacity="0.55">
                      <ellipse cx="33" cy="60" rx="6" ry="4" />
                      <ellipse cx="67" cy="60" rx="6" ry="4" />
                    </g>
                    <g ref={eyesRef} fill="#2e1065">
                      <circle cx="40" cy="50" r="4.4" />
                      <circle cx="60" cy="50" r="4.4" />
                    </g>
                    <path d="M46 61q4 4 8 0" stroke="#2e1065" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                  </svg>
                )}
              </motion.div>
              <p className="absolute right-[24%] bottom-[11%] text-right text-[11px] leading-tight font-semibold tracking-[0.14em] text-white uppercase">
                {highlight}
                <span className="mt-0.5 block font-mono text-[9px] font-normal tracking-[0.1em] text-white/85">Admit one</span>
              </p>
              <span className="absolute top-1/2 right-[30px] -translate-y-1/2 translate-x-1/2 rotate-90 text-[13px] font-bold tracking-[0.3em] whitespace-nowrap text-white uppercase">{brand}</span>
              <motion.span aria-hidden="true" style={{ backgroundImage: FOIL, backgroundSize: "300% 100%", backgroundPosition: foil }} className="absolute inset-0 mix-blend-overlay" />
              <span aria-hidden="true" className="absolute inset-0 rounded-[18px] shadow-[inset_0_1px_0_rgb(255_255_255/0.5),inset_0_0_0_1px_rgb(255_255_255/0.18)]" />
            </div>
            {/* Back */}
            <div
              className="absolute inset-0 flex [transform:rotateY(180deg)] items-center gap-4 overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#2e1065,#4a044e)] px-5 text-left text-white [backface-visibility:hidden]"
              style={{ maskImage: TICKET_MASK.replaceAll("calc(100% - 60px)", "60px"), maskComposite: "intersect", WebkitMaskImage: TICKET_MASK.replaceAll("calc(100% - 60px)", "60px"), WebkitMaskComposite: "source-in" }}
            >
              <span className="w-10 shrink-0" />
              <svg aria-hidden="true" viewBox={`-1 -1 ${MATRIX + 2} ${MATRIX + 2}`} className="size-[38%] shrink-0 rounded-md bg-white" shapeRendering="crispEdges">
                <path d={pattern} fill="#2e1065" fillRule="evenodd" />
              </svg>
              <span className="min-w-0">
                <span className="block font-mono text-[9px] tracking-[0.14em] text-white/75 uppercase">Invite code</span>
                <span className="mt-1 block font-mono text-[13px] font-semibold tracking-wide whitespace-nowrap @[30rem]:text-[15px]">{code}</span>
                <span className="mt-3 block text-[10px] font-semibold tracking-[0.16em] uppercase">Admit one</span>
              </span>
              <motion.span aria-hidden="true" style={{ backgroundImage: FOIL, backgroundSize: "300% 100%", backgroundPosition: foil }} className="absolute inset-0 opacity-50 mix-blend-overlay" />
            </div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div initial="hidden" animate="show" transition={{ staggerChildren: reduceMotion ? 0 : stagger.loose, delayChildren: reduceMotion ? 0 : 0.45 }} className="mx-auto mt-6 flex max-w-xl flex-col items-center">
        <motion.div variants={item} transition={itemTransition}>
          <button
            type="button"
            onClick={flip}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[#4c1d95] outline-none hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCw aria-hidden="true" className="size-3.5" />
            Flip pass
          </button>
        </motion.div>
        <motion.div variants={item} transition={itemTransition}>
          <Heading className="mt-2 text-3xl leading-[1.12] font-semibold tracking-tight text-balance text-[#1e1033] @[30rem]:text-[2.6rem]">
            {title} <span className="bg-[linear-gradient(100deg,var(--pass-from),var(--pass-to))] bg-clip-text text-transparent">{highlight}</span>
          </Heading>
        </motion.div>
        {description ? (
          <motion.p variants={item} transition={itemTransition} className="mt-4 max-w-md text-[15px] leading-6 text-balance text-[#4b4460]">
            {description}
          </motion.p>
        ) : null}
        <motion.div variants={item} transition={itemTransition} className="mt-6 flex h-12 items-center gap-1 rounded-full border border-white bg-white/75 py-1 pr-1 pl-5 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_20px_-12px_rgb(76_29_149/0.4)]">
          <TextScramble text={code} duration={900} characters="ABCDEFGHJKLMNPQRSTUVWXYZ23456789" className="font-mono text-base font-semibold tracking-[0.08em] text-[#1e1033] select-text" />
          <button
            type="button"
            onClick={() => void copy()}
            className="ml-3 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-[#1e1033] px-4 text-[13px] font-semibold text-white outline-none transition-transform duration-150 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="grid *:[grid-area:1/1]">
              <span className="invisible inline-flex items-center gap-1.5" aria-hidden="true">
                <Copy className="size-3.5" />
                Copy code
              </span>
              <AnimatePresence initial={false}>
                <motion.span
                  key={copied ? "copied" : "copy"}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                  transition={{ duration: duration.quick, ease: ease.out }}
                  className="inline-flex items-center justify-center gap-1.5"
                >
                  {copied ? <Check aria-hidden="true" className="size-3.5" strokeWidth={3} /> : <Copy aria-hidden="true" className="size-3.5" />}
                  {copied ? "Copied" : "Copy code"}
                </motion.span>
              </AnimatePresence>
            </span>
          </button>
        </motion.div>
        <motion.div variants={item} transition={itemTransition} className="mt-6 flex w-full flex-col items-center justify-center gap-2.5 @[30rem]:flex-row">
          {action(primaryAction, "bg-[#1e1033] text-white shadow-[0_10px_24px_-10px_rgb(30_16_51/0.7)]", <Smartphone aria-hidden="true" className="size-[18px]" strokeWidth={2} />)}
          {action(secondaryAction, "border border-white bg-white/70 text-[#1e1033] shadow-[0_1px_2px_rgb(0_0_0/0.05)]")}
        </motion.div>
        {note ? (
          <motion.p variants={item} transition={itemTransition} className="mt-5 text-[13px] text-[#5b5470]">
            {note}
          </motion.p>
        ) : null}
      </motion.div>

      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </section>
  );
}
