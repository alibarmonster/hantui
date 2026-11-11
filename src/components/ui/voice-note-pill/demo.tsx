"use client";

import { useState } from "react";
import { VoiceNotePill, type VoiceNoteState } from "@/components/ui/voice-note-pill/voice-note-pill";

export function Default() {
  const [useMic, setUseMic] = useState(false);
  const [state, setState] = useState<VoiceNoteState>("idle");
  const [sent, setSent] = useState<string | null>(null);
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <VoiceNotePill
        key={useMic ? "mic" : "simulated"}
        simulate={!useMic}
        maxDuration={15}
        onStateChange={setState}
        onSend={(recording, seconds) => setSent(`${seconds}s note${recording ? `, ${Math.max(1, Math.round(recording.size / 1024))} KB` : " (simulated)"}`)}
        onDiscard={() => setSent(null)}
      />
      <p className="h-5 text-[13px] text-muted-foreground">{state === "idle" ? (sent ? `Sent: ${sent}` : "Tap the mic to record up to 15 seconds.") : `State: ${state}`}</p>
      <label className="flex h-10 cursor-pointer items-center gap-2.5 text-sm text-foreground">
        <input type="checkbox" checked={useMic} onChange={(event) => setUseMic(event.target.checked)} className="size-4 accent-foreground" />
        Use my mic
      </label>
    </div>
  );
}

export function InComposer() {
  return (
    <div className="flex w-full max-w-md items-center gap-2 rounded-full border border-border bg-background py-1.5 pr-1.5 pl-5 shadow-sm">
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">Message Mira…</span>
      <VoiceNotePill simulate accent="#4338ca" maxDuration={30} className="w-auto min-w-11 justify-end" />
    </div>
  );
}
