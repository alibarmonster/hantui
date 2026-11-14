/**
 * The one animation loop a line-art scene runs: it ticks only while the host is on screen, the
 * tab is visible, nothing has paused it and the user has not asked for reduced motion. Under
 * reduced motion it calls `still` once instead, and again whenever asked to redraw. Browser only.
 */
export interface SceneLoopOptions {
  /** Element watched for visibility. */
  host: Element;
  /** Advance by `dt` seconds (capped at 0.05) and draw. */
  tick: (dt: number, time: number) => void;
  /** Draw a still picture. Called under reduced motion. */
  still: () => void;
  /** Read before every frame; while true the loop rests. */
  isPaused?: () => boolean;
}

export interface SceneLoop {
  /** Re-checks everything and starts, stops or redraws. Call it when props change. */
  wake(): void;
  /** True when the user prefers reduced motion. */
  reduced(): boolean;
  dispose(): void;
}

export function runSceneLoop({ host, tick, still, isPaused }: SceneLoopOptions): SceneLoop {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let last = 0;
  let time = 0;
  let inView = false;
  let disposed = false;

  const shouldRun = () => !disposed && inView && !document.hidden && !reducedMotion.matches && !isPaused?.();
  const step = (now: number) => {
    frame = 0;
    if (!shouldRun()) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    time += dt;
    tick(dt, time);
    frame = requestAnimationFrame(step);
  };
  const wake = () => {
    if (disposed) return;
    if (shouldRun()) {
      if (!frame) {
        last = 0;
        frame = requestAnimationFrame(step);
      }
      return;
    }
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (reducedMotion.matches) still();
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      inView = entry?.isIntersecting ?? true;
      wake();
    },
    { rootMargin: "80px" },
  );
  observer.observe(host);
  document.addEventListener("visibilitychange", wake);
  reducedMotion.addEventListener("change", wake);
  if (reducedMotion.matches) still();

  return {
    wake,
    reduced: () => reducedMotion.matches,
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", wake);
      reducedMotion.removeEventListener("change", wake);
    },
  };
}
