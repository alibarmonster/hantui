"use client";

import { useRef, type ReactNode } from "react";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";
import { kinetic } from "@/lib/motion";

/**
 * hantui's identity motif: while the lead element moves it leaves two faint afterimages, the way
 * onion-skin frames show where something just was. The copies replay the lead's recent positions
 * 40ms and 90ms late, so they only show while it moves; once it settles they converge and fade.
 *
 * Capped to three places on the site (the landing headline, the reel title, the 404). Only for short
 * text or a single card; the copies inherit their tint (terracotta, then the text color), so keep the
 * children's own text color unset. Off under reduced motion.
 */
export function Afterimage({
  children,
  x,
  y,
  lag = kinetic.ghost.lag,
  opacity = kinetic.ghost.opacity,
  className,
}: {
  children: ReactNode;
  /** The lead's horizontal offset in px; animate it and the copies follow. */
  x: MotionValue<number>;
  /** The lead's vertical offset in px. */
  y?: MotionValue<number>;
  /** How far behind each copy trails, in seconds. */
  lag?: readonly [number, number];
  /** Opacity of each copy at full speed. */
  opacity?: readonly [number, number];
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const zero = useMotionValue(0);
  const leadY = y ?? zero;
  const ghosts = [
    { x: useMotionValue(0), y: useMotionValue(0), o: useMotionValue(0) },
    { x: useMotionValue(0), y: useMotionValue(0), o: useMotionValue(0) },
  ];
  const history = useRef<{ t: number; x: number; y: number }[]>([]);

  useAnimationFrame((t) => {
    if (reduceMotion) return;
    const h = history.current;
    h.push({ t, x: x.get(), y: leadY.get() });
    while (h.length > 2 && t - h[1].t > 250) h.shift();
    const lead = h[h.length - 1];
    ghosts.forEach((g, i) => {
      // The lead's position `lag` seconds ago, interpolated between recorded frames.
      const at = t - lag[i] * 1000;
      let k = 0;
      while (k < h.length - 1 && h[k + 1].t < at) k++;
      const a = h[k];
      const b = h[Math.min(k + 1, h.length - 1)];
      const f = b.t === a.t ? 1 : Math.min(1, Math.max(0, (at - a.t) / (b.t - a.t)));
      const px = a.x + (b.x - a.x) * f;
      const py = a.y + (b.y - a.y) * f;
      g.x.set(px);
      g.y.set(py);
      // Visible in proportion to how far behind it is: gone once the lead has settled.
      g.o.set(Math.min(1, Math.hypot(lead.x - px, lead.y - py) / 6) * opacity[i]);
    });
  });

  return (
    <div className={cn("relative", className)}>
      {/* Always rendered, so server and client markup match; reduced motion hides them with CSS. */}
      {ghosts.map((g, i) => (
        <motion.div key={i} aria-hidden="true" className={cn("pointer-events-none absolute inset-0 select-none motion-reduce:hidden", i === 0 ? "text-primary" : "text-foreground")} style={{ x: g.x, y: g.y, opacity: g.o }}>
          {children}
        </motion.div>
      ))}
      <motion.div className="relative" style={{ x, y: leadY }}>
        {children}
      </motion.div>
    </div>
  );
}
