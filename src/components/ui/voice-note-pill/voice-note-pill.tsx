"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { Check, Mic, Play, Send, Square, X } from "lucide-react";
import { RollingDigits } from "@/components/ui/rolling-digits/rolling-digits";
import { cn } from "@/lib/utils";
import { duration, ease, spring } from "@/lib/motion";

export type VoiceNoteState = "idle" | "recording" | "review" | "playing" | "blocked";

export interface VoiceNotePillProps extends Omit<ComponentProps<"div">, "children"> {
  /** Longest recording in seconds. Recording stops by itself when it is reached. @default 60 */
  maxDuration?: number;
  /** Fake the microphone: levels and timers run, nothing is recorded and no permission is asked. For docs, tests and server-rendered demos. @default false */
  simulate?: boolean;
  /** Called when the note is sent, with the recording (null in simulate mode) and its length in seconds. */
  onSend?: (recording: Blob | null, duration: number) => void;
  /** Called when a recording is thrown away. */
  onDiscard?: () => void;
  /** Called whenever the pill moves between idle, recording, review, playing and blocked. */
  onStateChange?: (state: VoiceNoteState) => void;
  /** Record while the mic is held and review on release. "auto" holds on touch and clicks with a mouse. @default "auto" */
  holdToRecord?: boolean | "auto";
  /** Recording and playback color, as any CSS color. White text sits on it while playing, so keep it at 4.5:1 or better. @default "#dc2626" */
  accent?: string;
}

const BARS = 6;
/** Width of the middle part per state, in px. The outer buttons sit this far apart. */
const WIDTH: Record<VoiceNoteState, number> = { idle: 44, recording: 104, review: 96, playing: 96, blocked: 128 };
const GAP = 8;

// Resting values are the same in both motion modes: they are server-rendered as inline styles.
const REST = { opacity: 1, scale: 1, filter: "blur(0px)" };

/** A calm, speech-like level for simulate mode, from time alone. */
const fakeLevel = (t: number) => Math.min(1, Math.max(0.06, 0.42 + 0.3 * Math.sin(t * 7.1) * Math.sin(t * 2.3) + 0.22 * Math.sin(t * 17.3 + 1)));

export function VoiceNotePill({
  maxDuration = 60,
  simulate = false,
  onSend,
  onDiscard,
  onStateChange,
  holdToRecord = "auto",
  accent = "#dc2626",
  className,
  style,
  onKeyDown,
  ...props
}: VoiceNotePillProps) {
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<VoiceNoteState>("idle");
  /** Whole seconds: the recorded length in review, the time left while playing. */
  const [seconds, setSeconds] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  const middleRef = useRef<HTMLButtonElement>(null);
  const barsRef = useRef<HTMLSpanElement>(null);
  const arcRef = useRef<SVGRectElement>(null);
  const session = useRef<{
    stream?: MediaStream;
    recorder?: MediaRecorder;
    context?: AudioContext;
    analyser?: AnalyserNode;
    chunks: Blob[];
    blob: Blob | null;
    url?: string;
    audio?: HTMLAudioElement;
    startedAt: number;
    length: number;
    frame: number;
    timer: number;
    /** True from a hold-to-record press until that recording ends. */
    holdMode: boolean;
    holding: boolean;
    swallowClick: boolean;
  }>({ chunks: [], blob: null, startedAt: 0, length: 0, frame: 0, timer: 0, holdMode: false, holding: false, swallowClick: false });
  const latest = useRef({ onSend, onDiscard, onStateChange, maxDuration });
  useEffect(() => {
    latest.current = { onSend, onDiscard, onStateChange, maxDuration };
  });

  const go = useCallback((next: VoiceNoteState, message?: string) => {
    setState(next);
    if (message !== undefined) setAnnouncement(message);
    latest.current.onStateChange?.(next);
  }, []);

  /** Stops the microphone, the meter loop and any timers. Keeps the finished recording. */
  const stopCapture = useCallback(() => {
    const s = session.current;
    cancelAnimationFrame(s.frame);
    window.clearInterval(s.timer);
    window.clearTimeout(s.timer);
    s.stream?.getTracks().forEach((track) => track.stop());
    s.stream = undefined;
    void s.context?.close().catch(() => undefined);
    s.context = undefined;
    s.analyser = undefined;
  }, []);

  const stopPlayback = useCallback(() => {
    const s = session.current;
    window.clearInterval(s.timer);
    if (s.audio) {
      s.audio.pause();
      s.audio.onended = null;
      s.audio = undefined;
    }
  }, []);

  const forget = useCallback(() => {
    const s = session.current;
    if (s.url) URL.revokeObjectURL(s.url);
    s.url = undefined;
    s.blob = null;
    s.chunks = [];
    s.recorder = undefined;
  }, []);

  useEffect(
    () => () => {
      const s = session.current;
      if (s.recorder && s.recorder.state !== "inactive") {
        s.recorder.ondataavailable = null;
        s.recorder.onstop = null;
        s.recorder.stop();
      }
      stopCapture();
      stopPlayback();
      forget();
    },
    [stopCapture, stopPlayback, forget],
  );

  const review = useCallback(() => {
    const s = session.current;
    if (!s.startedAt) return;
    s.length = Math.min(latest.current.maxDuration, Math.max(1, Math.round((performance.now() - s.startedAt) / 1000)));
    s.startedAt = 0;
    s.holdMode = false;
    if (s.recorder && s.recorder.state !== "inactive") s.recorder.stop();
    stopCapture();
    setSeconds(s.length);
    go("review", `Recorded ${s.length} ${s.length === 1 ? "second" : "seconds"}`);
  }, [go, stopCapture]);

  /** One loop while recording: moves the bars and traces the arc, straight to the DOM. */
  const meter = useCallback(() => {
    const s = session.current;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const samples = s.analyser ? new Uint8Array(s.analyser.fftSize) : null;
    const history = new Float32Array(BARS);
    let smooth = 0;
    let last = performance.now();
    let shifted = last;
    const tick = (now: number) => {
      const elapsed = (now - s.startedAt) / 1000;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let level: number;
      if (samples && s.analyser) {
        s.analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          const v = (samples[i] - 128) / 128;
          sum += v * v;
        }
        level = Math.min(1, Math.sqrt(sum / samples.length) * 4);
      } else {
        level = fakeLevel(elapsed);
      }
      // Smoothed over roughly 80ms.
      smooth += (level - smooth) * Math.min(1, dt / 0.08);
      if (now - shifted > 70) {
        shifted = now;
        history.copyWithin(1, 0);
      }
      history[0] = smooth;
      const bars = barsRef.current?.children;
      if (bars) {
        for (let i = 0; i < bars.length; i++) {
          // Under reduced motion the bars are one level meter: they light up left to right, they don't travel.
          const value = still ? (smooth * BARS > i ? 1 : 0.25) : 0.2 + history[i] * 0.8;
          (bars[i] as HTMLElement).style.transform = `scaleY(${value.toFixed(3)})`;
        }
      }
      const progress = Math.min(1, elapsed / latest.current.maxDuration);
      arcRef.current?.style.setProperty("stroke-dashoffset", String(1 - progress));
      if (progress >= 1) {
        review();
        return;
      }
      s.frame = requestAnimationFrame(tick);
    };
    s.frame = requestAnimationFrame(tick);
  }, [review]);

  const block = useCallback(() => {
    stopCapture();
    forget();
    session.current.startedAt = 0;
    session.current.holdMode = false;
    go("blocked", "Microphone blocked");
    session.current.timer = window.setTimeout(() => go("idle"), 2000);
  }, [forget, go, stopCapture]);

  const record = useCallback(async () => {
    const s = session.current;
    forget();
    if (!simulate) {
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Recording is unavailable");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.stream = stream;
        const recorder = new MediaRecorder(stream);
        s.recorder = recorder;
        s.chunks = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size) s.chunks.push(event.data);
        };
        recorder.onstop = () => {
          s.blob = new Blob(s.chunks, { type: recorder.mimeType || "audio/webm" });
        };
        recorder.start();
        const context = new AudioContext();
        s.context = context;
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(stream).connect(analyser);
        s.analyser = analyser;
      } catch {
        block();
        return;
      }
    }
    s.startedAt = performance.now();
    go("recording", "Recording");
    meter();
    // Released before the microphone was ready: stop right away.
    if (s.holdMode && !s.holding) review();
  }, [simulate, forget, go, meter, block, review]);

  const play = useCallback(() => {
    const s = session.current;
    const finish = () => {
      stopPlayback();
      setSeconds(s.length);
      go("review");
    };
    let left = s.length;
    setSeconds(left);
    s.timer = window.setInterval(() => {
      left -= 1;
      if (left <= 0 && !s.audio) finish();
      else setSeconds(Math.max(left, 1));
    }, 1000);
    if (s.blob && s.blob.size) {
      s.url ??= URL.createObjectURL(s.blob);
      const audio = new Audio(s.url);
      s.audio = audio;
      audio.onended = finish;
      audio.play().catch(finish);
    }
    go("playing");
  }, [go, stopPlayback]);

  const stopPlaying = useCallback(() => {
    stopPlayback();
    setSeconds(session.current.length);
    go("review");
  }, [go, stopPlayback]);

  const finish = useCallback(
    (how: "send" | "discard") => {
      const s = session.current;
      const wasRecording = s.startedAt > 0;
      if (wasRecording && s.recorder && s.recorder.state !== "inactive") {
        s.recorder.onstop = null;
        s.recorder.stop();
      }
      s.startedAt = 0;
      s.holdMode = false;
      stopCapture();
      stopPlayback();
      if (how === "send") latest.current.onSend?.(s.blob && s.blob.size ? s.blob : null, s.length);
      else latest.current.onDiscard?.();
      forget();
      go("idle", how === "send" ? "Sent" : "Discarded");
      // The pressed button is about to fold away, so focus returns to the mic.
      middleRef.current?.focus({ preventScroll: true });
    },
    [forget, go, stopCapture, stopPlayback],
  );

  function onMiddleClick() {
    const s = session.current;
    if (s.swallowClick) {
      s.swallowClick = false;
      return;
    }
    if (state === "idle") void record();
    else if (state === "recording") review();
    else if (state === "review") play();
    else if (state === "playing") stopPlaying();
  }

  function onMiddlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    const hold = holdToRecord === true || (holdToRecord === "auto" && event.pointerType === "touch");
    if (!hold || state !== "idle" || event.button !== 0) return;
    const s = session.current;
    s.holdMode = true;
    s.holding = true;
    s.swallowClick = true;
    const release = () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      s.holding = false;
      review();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    void record();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Escape" && state !== "idle" && state !== "blocked") {
      event.preventDefault();
      finish("discard");
    } else if (event.key === "Enter" && event.target === middleRef.current && (state === "review" || state === "playing")) {
      event.preventDefault();
      finish("send");
    }
  }

  const expanded = state === "recording" || state === "review" || state === "playing";
  const offset = WIDTH[state] / 2 + GAP + 22;
  const move = reduceMotion ? { duration: 0 } : spring.smooth;
  const swap: Variants = reduceMotion
    ? { initial: { ...REST, opacity: 0 }, animate: REST, exit: { ...REST, opacity: 0 } }
    : { initial: { opacity: 0, scale: 0.8, filter: "blur(4px)" }, animate: REST, exit: { opacity: 0, scale: 0.8, filter: "blur(4px)" } };
  const swapTransition = { duration: duration.quick, ease: ease.out };
  const side =
    "absolute top-0 left-1/2 -ml-[22px] grid size-11 cursor-pointer place-items-center rounded-full border border-black/[0.08] bg-white text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06),0_4px_12px_-4px_rgb(0_0_0/0.14)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const clock = (value: number) => (
    <span className="tabular-nums">
      <RollingDigits value={value} format={{ minimumIntegerDigits: 2 }} animateOnMount={false} stagger={0} />s
    </span>
  );

  const middleLabel = {
    idle: "Record voice note",
    recording: "Stop recording",
    review: `Play, ${seconds} ${seconds === 1 ? "second" : "seconds"}`,
    playing: `Stop, ${seconds} ${seconds === 1 ? "second" : "seconds"} left`,
    blocked: "Microphone blocked",
  }[state];

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{ "--voice-accent": accent, ...style } as CSSProperties}
      className={cn("relative flex h-11 w-[208px] items-center justify-center", className)}
      {...props}
    >
      <motion.button
        type="button"
        aria-label="Discard"
        aria-hidden={!expanded}
        tabIndex={expanded ? 0 : -1}
        disabled={!expanded}
        onClick={() => finish("discard")}
        initial={false}
        animate={{ x: expanded ? -offset : 0, scale: expanded ? 1 : 0.6, opacity: expanded ? 1 : 0 }}
        transition={move}
        className={side}
      >
        <X aria-hidden="true" className="size-[18px]" strokeWidth={2.25} />
      </motion.button>

      <motion.button
        type="button"
        aria-label={state === "recording" ? "Stop and review" : "Send"}
        aria-hidden={!expanded}
        tabIndex={expanded ? 0 : -1}
        disabled={!expanded}
        onClick={() => (state === "recording" ? review() : finish("send"))}
        initial={false}
        animate={{ x: expanded ? offset : 0, scale: expanded ? 1 : 0.6, opacity: expanded ? 1 : 0 }}
        transition={move}
        className={side}
      >
        <span className="grid place-items-center *:[grid-area:1/1]">
          <AnimatePresence initial={false}>
            <motion.span key={state === "recording" ? "check" : "send"} variants={swap} initial="initial" animate="animate" exit="exit" transition={swapTransition}>
              {state === "recording" ? <Check aria-hidden="true" className="size-[18px]" strokeWidth={2.5} /> : <Send aria-hidden="true" className="size-4" strokeWidth={2.25} />}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.button>

      <motion.button
        ref={middleRef}
        type="button"
        layout
        aria-label={middleLabel}
        aria-disabled={state === "blocked" || undefined}
        onClick={onMiddleClick}
        onPointerDown={onMiddlePointerDown}
        animate={state === "blocked" && !reduceMotion ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ layout: move, x: { duration: duration.slow } }}
        style={{ borderRadius: 22, width: WIDTH[state] }}
        className={cn(
          "relative z-10 grid h-11 cursor-pointer touch-none place-items-center overflow-hidden text-sm font-semibold outline-none transition-colors duration-200 select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          state === "recording" && "bg-[color-mix(in_oklab,var(--voice-accent)_14%,white)] text-(--voice-accent)",
          state === "playing" && "bg-(--voice-accent) text-white",
          (state === "idle" || state === "review" || state === "blocked") && "border border-black/[0.08] bg-white text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06),0_4px_12px_-4px_rgb(0_0_0/0.14)]",
        )}
      >
        <motion.span layout transition={move} className="grid place-items-center *:[grid-area:1/1]">
          <AnimatePresence initial={false}>
            <motion.span key={state} variants={swap} initial="initial" animate="animate" exit="exit" transition={swapTransition} className="flex items-center gap-1.5 whitespace-nowrap">
              {state === "idle" ? <Mic aria-hidden="true" className="size-[18px]" strokeWidth={2.25} /> : null}
              {state === "recording" ? (
                <span ref={barsRef} aria-hidden="true" className="flex h-5 items-center gap-[3px]">
                  {Array.from({ length: BARS }, (_, i) => (
                    <span key={i} className="h-5 w-[3px] rounded-full bg-(--voice-accent)" style={{ transform: "scaleY(0.2)" }} />
                  ))}
                </span>
              ) : null}
              {state === "review" ? (
                <>
                  <Play aria-hidden="true" className="size-3.5" fill="currentColor" strokeWidth={0} />
                  <span aria-hidden="true">{clock(seconds)}</span>
                </>
              ) : null}
              {state === "playing" ? (
                <>
                  <Square aria-hidden="true" className="size-3" fill="currentColor" strokeWidth={0} />
                  <span aria-hidden="true">{clock(seconds)}</span>
                </>
              ) : null}
              {state === "blocked" ? <span className="text-[13px]">Mic blocked</span> : null}
            </motion.span>
          </AnimatePresence>
        </motion.span>
        {/* Time used, traced around the pill's edge. */}
        {state === "recording" ? (
          <svg aria-hidden="true" viewBox={`0 0 ${WIDTH.recording} 44`} preserveAspectRatio="none" fill="none" className="pointer-events-none absolute inset-0 size-full">
            <rect ref={arcRef} x="1.25" y="1.25" width={WIDTH.recording - 2.5} height="41.5" rx="20.75" pathLength={1} stroke="var(--voice-accent)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1" strokeDashoffset="1" />
          </svg>
        ) : null}
      </motion.button>

      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
