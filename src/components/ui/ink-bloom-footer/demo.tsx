"use client";

import { InkBloomFooter } from "@/components/ui/ink-bloom-footer/ink-bloom-footer";

export function Paper() {
  return <InkBloomFooter className="rounded-2xl" />;
}

export function Studio() {
  return (
    <InkBloomFooter
      wordmark="Halvane"
      quote={null}
      resting={false}
      paper="#f3efe8"
      inks={["#1f8a8a", "#e8692c", "#6b3fa0"]}
      note="© 2026 Halvane Studio"
      columns={[
        { title: "Studio", links: [{ label: "Work", href: "#" }, { label: "Process", href: "#" }, { label: "Prints", href: "#" }] },
        { title: "Say hi", links: [{ label: "Email", href: "#" }, { label: "Newsletter", href: "#" }] },
      ]}
      className="rounded-2xl"
    />
  );
}
