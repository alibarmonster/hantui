"use client";

import { Fragment, useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { animate, motion, useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import { kinetic } from "@/lib/motion";
import { Afterimage } from "../afterimage";
import { DemoRenderer } from "../demo-renderer";
import { SiteCopyButton } from "../site-copy-button";

const SEEN_KEY = "hantui:hero-seen";

export interface LandingHeroProps {
  headline: string;
  subhead: string;
  installCommand: string;
  release: { version: string; anchor: string; title: string; added: number } | null;
}

/** Delays for an eased stagger: 35ms between the first letters, easing to 15ms by the last. */
function letterDelays(count: number) {
  const delays: number[] = [];
  let at = 0;
  for (let i = 0; i < count; i++) {
    delays.push(Math.round(at));
    at += 35 - 20 * (i / Math.max(1, count - 1));
  }
  return delays;
}

/**
 * The landing hero. The headline is real text (aria-label) set in Playfair; its letters rise inside
 * each word's clip on an eased stagger, once per visit, while two afterimages trail the line and
 * converge. As the hero scrolls away the headline shrinks to 0.92 and drifts up, and a fast scroll
 * shows the afterimages again; letters near the pointer lift a few pixels. On the right, one live
 * component to use straight away.
 */
export function LandingHero({ headline, subhead, installCommand, release }: LandingHeroProps) {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const words = headline.split(" ");
  const delays = letterDelays(headline.replace(/ /g, "").length);

  // Entrance drift plus the scroll-linked rise; the afterimages follow their sum.
  const entrance = useMotionValue(0);
  const height = useMotionValue(800);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const y = useTransform(() => entrance.get() - scrollYProgress.get() * height.get() * 0.08);
  const zero = useMotionValue(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const ro = new ResizeObserver(() => height.set(section.offsetHeight));
    ro.observe(section);
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private mode: play the entrance every time.
    }
    if (!seen && !reduceMotion) {
      entrance.set(26);
      animate(entrance, 0, { ...kinetic.heroLetter, duration: 0.7 });
    }
    return () => ro.disconnect();
  }, [entrance, height, reduceMotion]);

  // Letters within 120px of the pointer lift up to 4px, each on its own small spring.
  useEffect(() => {
    const title = titleRef.current;
    if (!title || reduceMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    // With motion on, the afterimage renders two copies and then the lead: only the lead's letters lift.
    const all = [...title.querySelectorAll<HTMLElement>("[data-lift]")];
    const letters = all.slice((all.length / 3) * 2);
    const state = letters.map(() => ({ y: 0, v: 0 }));
    const pointer = { x: -1e4, y: -1e4 };
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      let moving = false;
      letters.forEach((el, i) => {
        const b = el.getBoundingClientRect();
        const d = Math.hypot(pointer.x - (b.left + b.width / 2), pointer.y - (b.top + b.height / 2));
        const target = -4 * Math.max(0, 1 - d / 120);
        const s = state[i];
        s.v += ((target - s.y) * 260 - s.v * 22) * dt;
        s.y += s.v * dt;
        if (Math.abs(s.y - target) > 0.02 || Math.abs(s.v) > 0.05) moving = true;
        el.style.transform = `translateY(${s.y.toFixed(2)}px)`;
      });
      raf = moving || pointer.x > -1e3 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const onLeave = () => {
      pointer.x = pointer.y = -1e4;
    };
    const section = sectionRef.current!;
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, [reduceMotion]);

  let letterIndex = 0;
  const line = (
    <span aria-hidden="true" className="block">
      {words.map((word, w) => (
        <Fragment key={w}>
          {/* Each word clips its letters as they rise into place. The space sits between words: inside an inline-block it would collapse. */}
          <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
            {[...word].map((ch, c) => {
              const d = delays[letterIndex++];
              return (
                <span key={c} className="hero-letter inline-block" style={{ "--d": `${d}ms` } as CSSProperties}>
                  <span data-lift="" className="inline-block will-change-transform">
                    {ch}
                  </span>
                </span>
              );
            })}
          </span>
          {w < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );

  return (
    <section ref={sectionRef} className="relative mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:pt-10 lg:pb-16">
      {/* Later visits in the same session skip the entrance, before the first paint. */}
      <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem("${SEEN_KEY}")==="1")document.documentElement.dataset.heroSeen="1"}catch(e){}` }} />
      <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
        <motion.div style={{ scale, transformOrigin: "0% 50%" }} className="w-full">
          <h1 ref={titleRef} aria-label={headline} className="font-display text-[clamp(2.75rem,7.4vw,5.5rem)] leading-[0.98] font-bold tracking-[-0.02em] text-balance text-foreground">
            <Afterimage x={zero} y={y}>
              {line}
            </Afterimage>
          </h1>
        </motion.div>
        <p className="rise-in mt-7 max-w-[34rem] text-[18px] leading-[1.6] text-pretty text-text-secondary" style={{ "--delay": "280ms" } as CSSProperties}>
          {subhead}
        </p>
        <div className="rise-in mt-8 flex w-full max-w-[34rem] flex-col items-center gap-4 lg:items-start" style={{ "--delay": "360ms" } as CSSProperties}>
          <div className="flex w-full items-center gap-2 rounded-md border border-border bg-code py-1 pr-1 pl-3.5">
            <span className="font-mono text-[13px] text-muted-foreground select-none" aria-hidden="true">
              $
            </span>
            <code className="min-w-0 flex-1 truncate text-left font-mono text-[13px] text-foreground">{installCommand}</code>
            <SiteCopyButton value={installCommand} variant="ghost" size="sm" aria-label="Copy install command" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
            <Link
              href="/components"
              className="focus-ring inline-flex h-12 items-center rounded-md bg-primary px-6 text-[16px] font-semibold text-primary-foreground transition-[background-color,box-shadow,scale] duration-150 hover:bg-primary-hover hover:shadow-glow active:scale-[0.96]"
            >
              Browse components
            </Link>
            <Link href="/docs" className="focus-ring touch-target inline-flex rounded-sm text-[16px] font-semibold text-link underline-offset-4 hover:underline">
              Read the docs
            </Link>
          </div>
          {release ? (
            <Link href={`/changelog#${release.anchor}`} className="focus-ring group rounded-sm text-[14px] text-text-secondary hover:text-foreground">
              <span className="font-mono text-[13px] tabular-nums">v{release.version}</span>: {release.title}, <span className="tabular-nums">{release.added}</span> new components{" "}
              <ArrowRight className="inline size-3.5 align-[-2px] transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>

      {/* One live component on a raised surface, usable straight away. */}
      <div className="rise-in mx-auto flex aspect-[4/5] w-full max-w-[24rem] items-center justify-center overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-[0_24px_48px_rgb(28_25_23/0.1)] lg:max-w-none" style={{ "--delay": "420ms" } as CSSProperties}>
        <DemoRenderer slug="lens-tab-bar" name="MobileBar" />
      </div>
    </section>
  );
}
