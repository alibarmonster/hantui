"use client";

import { useState } from "react";
import { InviteCodeReveal } from "@/components/ui/invite-code-reveal/invite-code-reveal";

export function Default() {
  return <InviteCodeReveal code="BRIGHT-OTTER-42" />;
}

export function Accents() {
  return (
    <div className="flex w-full max-w-[360px] flex-col gap-2">
      <InviteCodeReveal code="QUIET-HERON-07" accent="#1d4ed8" revealLabel="Your beta pass is ready" label="Your beta code" />
      <InviteCodeReveal code="AMBER-FOX-19" accent="#18181b" revealLabel="Your referral is ready" label="Your referral code" />
    </div>
  );
}

export function Controlled() {
  const [open, setOpen] = useState(true);
  const [copies, setCopies] = useState(0);
  return (
    <div className="flex w-full max-w-[360px] flex-col items-center gap-4">
      <InviteCodeReveal code="LUCKY-WREN-88" open={open} onOpenChange={setOpen} onCopy={() => setCopies((n) => n + 1)} />
      <p className="text-[13px] text-muted-foreground tabular-nums">
        {open ? "Revealed" : "Folded"} · copied {copies} {copies === 1 ? "time" : "times"}
      </p>
    </div>
  );
}
