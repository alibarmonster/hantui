"use client";

import { motion } from "motion/react";
import { ArrowUp, Copy, Palette, SlidersHorizontal } from "lucide-react";
import { StepDemoShowcase, type StepDemoStep } from "@/components/ui/step-demo-showcase/step-demo-showcase";
import { cn } from "@/lib/utils";
import { ease, spring } from "@/lib/motion";

/** The style pill shared by the first and third scenes: one layoutId, so it glides between them. */
function StylePill({ compact = false }: { compact?: boolean }) {
  return (
    <motion.div
      layoutId="style-pill"
      transition={spring.smooth}
      style={{ borderRadius: 9999 }}
      className={cn("flex items-center whitespace-nowrap bg-white text-zinc-900 shadow-[0_1px_2px_rgb(0_0_0/0.08),0_8px_20px_-8px_rgb(0_0_0/0.25)]", compact ? "h-7 gap-1.5 px-2.5 text-xs" : "h-10 gap-2 pr-1.5 pl-3.5 text-sm")}
    >
      <motion.span layout="position" className="flex items-center gap-1.5 font-medium">
        <Palette className={compact ? "size-3.5 text-rose-500" : "size-4 text-rose-500"} />
        Soft Clay
      </motion.span>
      {compact ? null : (
        <>
          <span className="mx-1 h-4 w-px bg-zinc-200" />
          <span className="grid size-7 place-items-center rounded-full text-zinc-500">
            <SlidersHorizontal className="size-4" />
          </span>
          <motion.span
            className="grid size-7 place-items-center rounded-full text-zinc-700"
            animate={{ backgroundColor: ["rgba(228,228,231,0)", "rgba(228,228,231,0)", "rgba(228,228,231,1)", "rgba(228,228,231,0)"], scale: [1, 1, 0.86, 1] }}
            transition={{ duration: 2.2, times: [0, 0.55, 0.68, 0.9], ease: "easeOut" }}
          >
            <Copy className="size-4" />
          </motion.span>
        </>
      )}
    </motion.div>
  );
}

/** Soft, original abstract art: blurred color fields with a few clay-like ribbons. */
function FluidArt({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-[#ffe9d6]", className)}>
      <div className="absolute -top-[12%] -left-[10%] size-[62%] rounded-full bg-[#ff7a59] blur-3xl" />
      <div className="absolute top-[18%] -right-[14%] size-[58%] rounded-full bg-[#b08cff] blur-3xl" />
      <div className="absolute -bottom-[18%] left-[12%] size-[66%] rounded-full bg-[#ffcf5c] blur-3xl" />
      <div className="absolute right-[6%] -bottom-[8%] size-[38%] rounded-full bg-[#42d6c5] blur-3xl" />
      <svg viewBox="0 0 400 400" className="absolute inset-0 size-full" fill="none">
        <path d="M-20 250C60 170 120 300 200 230S330 120 430 190" stroke="#fff" strokeOpacity="0.75" strokeWidth="34" strokeLinecap="round" />
        <path d="M-20 320C80 260 150 360 240 300S350 240 430 280" stroke="#ff9d7a" strokeOpacity="0.85" strokeWidth="22" strokeLinecap="round" />
        <circle cx="292" cy="118" r="38" fill="#fff" fillOpacity="0.8" />
        <circle cx="304" cy="106" r="38" fill="#ffb199" fillOpacity="0.9" />
      </svg>
    </div>
  );
}

function StyleScene() {
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <div className="relative aspect-square w-[78%] overflow-hidden rounded-3xl shadow-[0_18px_40px_-18px_rgb(0_0_0/0.35)]">
        <FluidArt />
      </div>
      <div className="absolute top-[13%] left-1/2 -translate-x-1/2">
        <StylePill />
        {/* A pointer glides in and taps Copy. */}
        <motion.svg
          viewBox="0 0 24 24"
          className="absolute top-full left-full size-6 drop-shadow"
          initial={{ x: 30, y: 40, opacity: 0 }}
          animate={{ x: [30, -26, -26, -26], y: [40, -22, -19, -22], opacity: [0, 1, 1, 1] }}
          transition={{ duration: 2.2, times: [0, 0.55, 0.68, 0.9], ease: ease.out }}
        >
          <path d="M5 3l14 7-6 2-2 6z" fill="#18181b" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        </motion.svg>
      </div>
    </div>
  );
}

const SWATCHES = [
  "bg-[radial-gradient(circle_at_30%_30%,#ffd1c2,#ff7a59_70%)]",
  "bg-[conic-gradient(from_210deg_at_60%_40%,#b08cff,#42d6c5,#ffcf5c,#b08cff)]",
  "bg-[linear-gradient(135deg,#18181b_25%,#3f3f46_25%_50%,#18181b_50%_75%,#3f3f46_75%)] bg-[length:22px_22px]",
  "bg-[radial-gradient(circle,#2563eb_22%,transparent_24%)] bg-[#dbeafe] bg-[length:16px_16px]",
  "bg-[linear-gradient(160deg,#fef3c7,#fb923c_55%,#be123c)]",
  "bg-[repeating-linear-gradient(90deg,#065f46_0_8px,#a7f3d0_8px_16px)]",
  "bg-[radial-gradient(circle_at_70%_25%,#fff_0_12%,transparent_13%),linear-gradient(#0f172a,#312e81)]",
  "bg-[conic-gradient(at_50%_50%,#f472b6_0_25%,#fde68a_0_50%,#93c5fd_0_75%,#fff_0)]",
  "bg-[radial-gradient(circle_at_35%_65%,#bef264_0_30%,transparent_31%),radial-gradient(circle_at_70%_35%,#14b8a6_0_26%,transparent_27%),linear-gradient(#f0fdf4,#ccfbf1)]",
];

function SwatchScene() {
  return (
    <div className="absolute inset-0 grid place-items-center p-[9%]">
      <div className="pointer-events-auto grid w-full grid-cols-3 gap-[5%]">
        {SWATCHES.map((swatch, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, scale: 1.04 }}
            transition={{ ...spring.bouncy, delay: index * 0.03 }}
            className={cn("aspect-square rounded-2xl shadow-[0_1px_2px_rgb(0_0_0/0.08),0_10px_22px_-12px_rgb(0_0_0/0.3)] ring-1 ring-black/5", swatch, index === 0 && "outline-2 outline-offset-2 outline-zinc-900")}
          />
        ))}
      </div>
    </div>
  );
}

const ROLES = [
  ["Primary", "#ff7a59"],
  ["Secondary", "#ffcf5c"],
  ["Tertiary", "#b08cff"],
  ["Accent", "#42d6c5"],
  ["Detail", "#18181b"],
] as const;

function PromptScene() {
  return (
    <div className="absolute inset-0 grid place-items-center p-[8%]">
      <div className="w-full rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_18px_40px_-18px_rgb(0_0_0/0.3)] ring-1 ring-black/5">
        <div className="flex min-h-16 flex-wrap items-start gap-2">
          <StylePill compact />
          <span className="pt-1 text-sm font-medium text-zinc-900">
            {Array.from("coin jar").map((letter, index) => (
              <motion.span key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.01, delay: 0.45 + index * 0.09 }}>
                {letter}
              </motion.span>
            ))}
            <motion.span className="ml-px inline-block h-4 w-px translate-y-0.5 bg-zinc-900" animate={{ opacity: [1, 1, 0, 0] }} transition={{ duration: 0.9, repeat: Infinity, times: [0, 0.5, 0.5, 1] }} />
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map(([role, color], index) => (
              <motion.span
                key={role}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.15 + index * 0.05, ease: ease.out }}
                className="flex h-6 items-center gap-1.5 rounded-full bg-zinc-100 px-2 text-[11px] font-medium text-zinc-700"
              >
                <span className="size-2 rounded-full" style={{ background: color }} />
                {role}
              </motion.span>
            ))}
          </div>
          <motion.span
            className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-900 text-white"
            animate={{ scale: [1, 1, 1.14, 1], boxShadow: ["0 0 0 0 rgba(24,24,27,0)", "0 0 0 0 rgba(24,24,27,0.35)", "0 0 0 10px rgba(24,24,27,0)", "0 0 0 0 rgba(24,24,27,0)"] }}
            transition={{ duration: 2.2, times: [0, 0.6, 0.78, 1], ease: "easeOut" }}
          >
            <ArrowUp className="size-4" strokeWidth={2.5} />
          </motion.span>
        </div>
      </div>
    </div>
  );
}

/** An original glossy coin jar, drawn in SVG. */
function CoinJar() {
  return (
    <svg viewBox="0 0 240 260" className="size-full" fill="none">
      <defs>
        <linearGradient id="jar-glass" x1="0" x2="1">
          <stop offset="0" stopColor="#ffd9c9" />
          <stop offset="0.45" stopColor="#fff4ee" />
          <stop offset="1" stopColor="#ffb89e" />
        </linearGradient>
        <linearGradient id="jar-lid" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ff9d7a" />
          <stop offset="1" stopColor="#e85d3a" />
        </linearGradient>
        <linearGradient id="jar-coin" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffe9a3" />
          <stop offset="0.5" stopColor="#ffcf5c" />
          <stop offset="1" stopColor="#e09a1f" />
        </linearGradient>
        <clipPath id="jar-inside">
          <rect x="48" y="78" width="144" height="150" rx="40" />
        </clipPath>
      </defs>
      <rect x="40" y="70" width="160" height="166" rx="48" fill="url(#jar-glass)" stroke="#e8866a" strokeOpacity="0.5" strokeWidth="2" />
      <g clipPath="url(#jar-inside)">
        <rect x="48" y="150" width="144" height="80" fill="#ffcf5c" fillOpacity="0.35" />
        {[
          [78, 208], [118, 214], [160, 206], [96, 190], [140, 192], [118, 172], [164, 178], [76, 174],
        ].map(([cx, cy], index) => (
          <g key={index}>
            <ellipse cx={cx} cy={cy + 4} rx="22" ry="9" fill="#c9821a" />
            <ellipse cx={cx} cy={cy} rx="22" ry="9" fill="url(#jar-coin)" />
            <ellipse cx={cx} cy={cy} rx="13" ry="5" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.5" />
          </g>
        ))}
      </g>
      <rect x="58" y="92" width="14" height="96" rx="7" fill="#fff" fillOpacity="0.85" />
      <rect x="78" y="98" width="6" height="40" rx="3" fill="#fff" fillOpacity="0.6" />
      <rect x="62" y="44" width="116" height="34" rx="14" fill="url(#jar-lid)" />
      <rect x="92" y="54" width="56" height="8" rx="4" fill="#7c2d12" fillOpacity="0.55" />
      <rect x="72" y="50" width="96" height="5" rx="2.5" fill="#fff" fillOpacity="0.45" />
      <g>
        <ellipse cx="120" cy="30" rx="20" ry="20" fill="#c9821a" />
        <ellipse cx="117" cy="28" rx="20" ry="20" fill="url(#jar-coin)" />
        <path d="M117 18l3 6.5 7 .8-5.2 4.8 1.4 7-6.2-3.6-6.2 3.6 1.4-7-5.2-4.8 7-.8z" fill="#fff" fillOpacity="0.75" />
      </g>
    </svg>
  );
}

function ResultScene() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <FluidArt className="opacity-25" />
      <motion.div
        className="absolute bottom-[14%] h-[5%] w-[44%] rounded-[50%] bg-black/25 blur-md"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1, ease: ease.out }}
      />
      <motion.div
        className="relative w-[58%] origin-bottom"
        initial={{ y: "-70%", opacity: 0, scaleX: 0.92, scaleY: 1.1 }}
        animate={{ y: ["-70%", "0%", "0%", "0%"], opacity: [0, 1, 1, 1], scaleX: [0.92, 1.12, 0.97, 1], scaleY: [1.1, 0.86, 1.04, 1] }}
        transition={{ duration: 0.85, times: [0, 0.45, 0.72, 1], ease: "easeOut" }}
      >
        <CoinJar />
      </motion.div>
    </div>
  );
}

const steps: StepDemoStep[] = [
  { id: "style", title: "Pick a style", description: "Browse looks made for product visuals and choose one.", scene: <StyleScene /> },
  { id: "settings", title: "Copy its settings", description: "Every style carries its palette, light and material.", scene: <SwatchScene /> },
  { id: "prompt", title: "Prompt your agent", description: "Paste the style and say what you need in a few words.", scene: <PromptScene /> },
  { id: "asset", title: "Use the asset", description: "Drop the finished visual straight into your app.", scene: <ResultScene /> },
];

const muted = "text-muted-foreground";

export function Default() {
  return (
    <StepDemoShowcase
      title={
        <>
          <span className={muted}>From</span> idea <span className={muted}>to app-ready</span> visuals <span className={muted}>in seconds</span>
        </>
      }
      steps={steps}
    />
  );
}

export function Manual() {
  return <StepDemoShowcase steps={steps.slice(0, 3)} autoplay={false} />;
}
