import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { PixelBuildProgress } from "@/components/ui/pixel-build-progress/pixel-build-progress";

export function Updating({ progress }: { progress: number }) {
  return <PixelBuildProgress value={progress} stallAt={99} onComplete={() => restartApp()} />;
}`,
  a11y: [
    "The pill has role=\"progressbar\" with aria-valuemin, aria-valuemax and aria-valuenow, and its aria-valuetext is the caption. In indeterminate mode aria-valuenow is left out.",
    "The caption is real text under the pill in a polite live region, so it is announced when it changes, not on every percent.",
    "The canvas is decorative and hidden from assistive tech; the percent on the pixel sign repeats aria-valuenow.",
    "With reduced motion enabled the scene is a still picture at the current value: no walking, crane, drifting clouds or crumble. Captions still change, and a scripted run steps once a second.",
  ],
  notes: [
    "The scene is drawn at 240×40 logical pixels and shown at a whole-number scale (2, 3 or 4 by size) with smoothing off, so every pixel stays square. Narrow containers step the scale down, then crop the scene around the build front; below 360px there are two workers and no crane.",
    "Sprites are palette-indexed sheets from src/lib/pixel-art/sprites.ts (worker: walk, carry, hammer, sit, sleep and cheer). Bricks, the crane, the scaffold and the building are drawn in code, and fallen bricks are particles in typed arrays.",
    "It runs on the shared canvas loop: paused offscreen and in hidden tabs. The percent only reaches React when the whole number changes.",
    "value is followed smoothly, at most about a quarter of the wall per second, so bricks go on one at a time. While value sits exactly at stallAt the workers sit down: one sleeps, one sips, one taps a foot.",
    "With loop, the wall crumbles a moment after it finishes and the next update starts, counting up in the first caption (\"Installing update 2 of 47\"). In controlled use the rebuild waits until value drops below max.",
    "The brick crumble, sprite poses and cloud positions come from a fixed seed and the clock, never from Math.random during render.",
  ],
};
