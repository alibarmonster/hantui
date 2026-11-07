import localFont from "next/font/local";
import { Fira_Code, Playfair_Display, Source_Sans_3 } from "next/font/google";

/*
 * Fonts come from next/font: Google faces are downloaded at build time and self-hosted, so pages
 * make no runtime request to Google. Only the body face is preloaded.
 */

/** Source Sans 3 for UI and body text (400 and 600). Preloaded: it renders almost every word. */
export const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

/**
 * Playfair Display for display type (headlines and the wordmark, 700). Not preloaded. Also stands in
 * for Geist Serif: components asking for `var(--font-geist-serif)` get it (see globals.css).
 */
export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
});

/** Fira Code for code, props tables and figures (`font-mono`). Ligatures are off in code (globals.css). */
export const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
  preload: false,
});

/**
 * Geist Mono, kept for the glyph engine: ASCII and glyph-art components draw their characters in
 * `--font-geist-mono`, and their cell layouts are tuned to its widths. Not preloaded.
 */
export const geistMono = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  preload: false,
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Roboto Mono", "Menlo", "Monaco", "Liberation Mono", "DejaVu Sans Mono", "Courier New", "monospace"],
});

/**
 * Geist Pixel (square cut) for pixel-style labels, e.g. the Retro Desktop Hero
 * (`var(--font-geist-pixel)` with a monospace fallback). Not preloaded.
 */
export const geistPixel = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-pixel/GeistPixel-Square.woff2",
  variable: "--font-geist-pixel",
  weight: "400",
  preload: false,
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

/**
 * Caveat (OFL) for handwritten notes, e.g. Crumple Notes (`var(--font-hand)` with a cursive
 * fallback). Not preloaded.
 */
export const caveat = localFont({
  src: [
    { path: "../../node_modules/@fontsource/caveat/files/caveat-latin-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/caveat/files/caveat-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-hand",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Bradley Hand", "Segoe Print", "Comic Sans MS", "cursive"],
});
