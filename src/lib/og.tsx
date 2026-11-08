import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { H_PATH } from "@/components/site/logo";

/** Open Graph images are 1200 × 630. */
export const OG_SIZE = { width: 1200, height: 630 };

const font = (file: string) => readFile(join(process.cwd(), "node_modules/geist/dist/fonts", file));

let playfair: Promise<ArrayBuffer | null> | null = null;

/**
 * Playfair Display 700 for the wordmark, fetched once per build from Google Fonts (which serves
 * TrueType to plain clients, the format next/og reads). Null when offline: the wordmark falls back
 * to the sans face.
 */
function loadPlayfair() {
  playfair ??= (async () => {
    try {
      const css = await (await fetch("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700", { signal: AbortSignal.timeout(8000) })).text();
      const url = css.match(/src: url\((.+?)\) format\('truetype'\)/)?.[1];
      return url ? await (await fetch(url, { signal: AbortSignal.timeout(8000) })).arrayBuffer() : null;
    } catch {
      return null;
    }
  })();
  return playfair;
}

/** Fonts for next/og images: Geist for text, Playfair Display for the wordmark when it can be fetched. */
export async function ogFonts() {
  const [regular, semibold, mono, display] = await Promise.all([
    font("geist-sans/Geist-Regular.ttf"),
    font("geist-sans/Geist-SemiBold.ttf"),
    font("geist-mono/GeistMono-Regular.ttf"),
    loadPlayfair(),
  ]);
  return [
    { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Geist Mono", data: mono, weight: 400 as const, style: "normal" as const },
    ...(display ? [{ name: "Playfair Display", data: display, weight: 700 as const, style: "normal" as const }] : []),
  ];
}

const host = siteConfig.url.replace(/^https?:\/\//, "");

/** White canvas with the dot grid, the logo top-left and the site address bottom-right. */
export function OgFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#fafaf9",
        fontFamily: "Geist",
        color: "#1c1917",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle, #d6d3d1 1.6px, transparent 1.6px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 30% 40%, rgba(250,250,249,0.2), #fafaf9 75%)" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "64px 72px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="48" height="48" viewBox="0 0 24 24">
            <rect width="24" height="24" rx="6" fill="#fafaf9" />
            <path d={H_PATH} transform="translate(-1.44 0)" fill="#c2410c" fillOpacity="0.3" />
            <path d={H_PATH} fill="#1c1917" />
          </svg>
          <div style={{ display: "flex", fontFamily: "Playfair Display, Geist", fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {siteConfig.name}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", fontFamily: "Geist Mono", fontSize: 22, color: "#6b635d" }}>{host}</div>
      </div>
    </div>
  );
}
