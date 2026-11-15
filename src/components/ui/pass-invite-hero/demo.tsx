"use client";

import { PassInviteHero } from "@/components/ui/pass-invite-hero/pass-invite-hero";

export function Default() {
  return <PassInviteHero as="h2" brand="Nimbra" />;
}

/** An original mascot for the slot: a sleepy moon. */
function MoonMascot() {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className="size-full drop-shadow-[0_6px_10px_rgb(0_40_60/0.35)]">
      <circle cx="50" cy="52" r="32" fill="#fef9c3" />
      <circle cx="38" cy="40" r="6" fill="#fde68a" />
      <circle cx="64" cy="66" r="8" fill="#fde68a" />
      <path d="M38 54q4-4 8 0M54 54q4-4 8 0" stroke="#713f12" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M46 64q4 3 8 0" stroke="#713f12" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function CustomMascot() {
  return (
    <PassInviteHero
      as="h2"
      title="Your seat is saved for"
      highlight="Night Shift"
      description="An early look at the late show. Bring this pass and one friend."
      code="MOON-4471"
      brand="Orbiq"
      mascot={<MoonMascot />}
      palette={{ from: "#0e7490", to: "#4338ca", wash: "#eef6ff" }}
      primaryAction={{ label: "Add to my phone", href: "#pass" }}
      secondaryAction={{ label: "Email it to me" }}
      note={null}
      autoSpin={false}
    />
  );
}
