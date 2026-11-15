import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { VoiceNotePill } from "@/components/ui/voice-note-pill/voice-note-pill";

export function Composer() {
  return (
    <VoiceNotePill
      maxDuration={60}
      onSend={(recording, seconds) => {
        if (recording) upload(recording, seconds);
      }}
    />
  );
}`,
  a11y: [
    "Every part is a button with its own label: \"Record voice note\", \"Discard\", \"Stop and review\", \"Play, 3 seconds\" and \"Send\". The folded-away buttons are disabled and hidden from assistive tech.",
    "Space on the middle button toggles recording or playback, Enter sends a reviewed note, and Escape discards from anywhere in the pill.",
    "A polite live region announces \"Recording\", \"Recorded 3 seconds\", \"Sent\", \"Discarded\" and \"Microphone blocked\", once each.",
    "After discarding or sending, focus returns to the mic button, since the button that was pressed folds away.",
    "Each target is 44px. With holdToRecord on \"auto\", touch presses record while held and review on release; mouse and keyboard click.",
    "With reduced motion enabled, parts swap in place without travel or blur, and the waveform becomes a level meter that lights up left to right.",
  ],
  notes: [
    "Recording uses getUserMedia and MediaRecorder, and the level comes from an AnalyserNode (RMS smoothed over about 80ms). Nothing touches the microphone until the mic is pressed.",
    "If the microphone is missing or permission is denied, the middle shows \"Mic blocked\" for two seconds with a shake and returns to idle.",
    "simulate fakes the levels and timers without asking for permission. onSend then receives null as the recording.",
    "One animation frame loop runs only while recording. It writes the bar heights and the progress arc straight to the DOM, with no React renders.",
    "Playback uses an Audio element on an object URL, which is revoked on discard, send and unmount. The stream's tracks and the audio context are closed as soon as recording stops.",
    "The pill reserves 208px so the outer buttons never push nearby content; override the width with className when you anchor it to one side.",
  ],
};
