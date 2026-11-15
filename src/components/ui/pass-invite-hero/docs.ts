import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { PassInviteHero } from "@/components/ui/pass-invite-hero/pass-invite-hero";

export function InvitePage() {
  return (
    <PassInviteHero
      highlight="Spirit Pass"
      code="7UG9-VBMW"
      brand="Nimbra"
      primaryAction={{ label: "Download for iPhone", href: "/download" }}
      secondaryAction={{ label: "Join the Android & web waitlist", href: "/waitlist" }}
      onCopy={(code) => track("invite_copied", code)}
    />
  );
}`,
  a11y: [
    "The pass is role=\"img\" with a label that includes the code. A separate Flip pass button turns it from the keyboard, so dragging is never required.",
    "The headline is an h1 by default; set as when the page already has one.",
    "The code is real, selectable text. Copy code is a button, and a polite live region says \"Code copied\".",
    "Both actions are real links (with href) or buttons, 48px tall, and stack on narrow containers.",
    "With reduced motion enabled the rays do not turn and the pass does not drop, float, tilt or spin by itself. It appears in place, and Flip pass swaps faces at once.",
  ],
  notes: [
    "The pass is DOM with CSS 3D. One animation frame loop drives its float, hover tilt (up to 12°), spin momentum and the ghost's eyes through Motion values and refs, and it runs only while the section is in view.",
    "Drag to spin the pass around its vertical axis; it coasts and settles on the nearest face. With autoSpin it also turns once about every six seconds while nobody is touching it.",
    "The ghost's eyes follow the pointer, a press on the pass makes it blink and blush, and it hops when the code is copied. Pass mascot to replace it with your own artwork; the hop still applies.",
    "The back shows the code and a code-style square pattern generated from the code with a seeded generator. It is decoration and does not scan.",
    "The rays are a CSS conic gradient with a mask, and the foil is the Foil Card Drift gradient tied to the pass's angle. Store buttons use a neutral phone glyph, not an official badge.",
    "The ticket notches are a CSS mask. palette changes the gradient, the headline highlight and the background wash.",
  ],
};
