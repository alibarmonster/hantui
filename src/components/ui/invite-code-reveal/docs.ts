import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { InviteCodeReveal } from "@/components/ui/invite-code-reveal/invite-code-reveal";

export function Invite() {
  return <InviteCodeReveal code="BRIGHT-OTTER-42" onCopy={(code) => console.info("copied", code)} />;
}`,
  a11y: [
    "While closed, the whole pill is one button with aria-expanded=\"false\". Once open, the label pill above is the toggle (aria-expanded=\"true\") and the copy button is a separate button.",
    "Opening moves focus to the label pill, and closing returns it to the closed pill. Escape closes from anywhere inside.",
    "The code is real, selectable text, so it can be read and copied by hand.",
    "A polite live region says \"Code copied\" once after each successful copy.",
    "With reduced motion enabled, the two states crossfade: no rise, blur or stretch.",
  ],
  notes: [
    "The green circle and the copy button are one shared layout element, so the circle stretches into the pill with a transform, not a width animation.",
    "The component keeps room for the label pill above itself in both states, so nothing around it shifts when it opens.",
    "Copy uses the shared useCopy hook, which falls back to document.execCommand(\"copy\") outside secure contexts. The copied state lasts 1.6 seconds.",
    "accent takes any CSS color. The button text is white, so keep the accent dark enough for 4.5:1 contrast.",
  ],
};
