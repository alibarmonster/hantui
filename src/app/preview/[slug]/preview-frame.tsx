"use client";

import { useSearchParams } from "next/navigation";
import { DemoRenderer } from "@/components/site/demo-renderer";

/** The demo on a full-page stage. `?variant=` picks the style and `?theme=` the light or dark stage. */
export function PreviewFrame({ slug, name, variants }: { slug: string; name: string; variants: string[] }) {
  const params = useSearchParams();
  const asked = params.get("variant");
  const variant = asked && variants.includes(asked) ? asked : variants[0];
  const theme = params.get("theme");

  return (
    <main
      data-theme={theme === "light" || theme === "dark" ? theme : undefined}
      className="dot-grid flex min-h-dvh items-center justify-center bg-surface p-6"
    >
      <h1 className="sr-only">{name} preview</h1>
      {variant ? <DemoRenderer slug={slug} name={variant} /> : null}
    </main>
  );
}
