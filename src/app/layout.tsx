import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import { caveat, firaCode, geistMono, geistPixel, playfair, sourceSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { themeScript } from "@/components/site/theme-switch";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} · Animated React components`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: ["React components", "animated components", "Motion", "Tailwind CSS", "shadcn", "Next.js", "accessible UI", "UI library", "micro-interactions"],
  authors: [{ name: siteConfig.shortName, url: siteConfig.github }],
  creator: siteConfig.shortName,
  // Each page's canonical URL is its own path.
  alternates: { canonical: "./" },
  // No title/description here: Next fills them from each page's own title and description.
  openGraph: { type: "website", siteName: siteConfig.name, locale: "en_US" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#161412" },
  ],
};

const originTrialToken = process.env.NEXT_PUBLIC_HTML_IN_CANVAS_OT_TOKEN;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme is set by the inline script before React hydrates, hence suppressHydrationWarning.
    <html lang="en" suppressHydrationWarning className={cn(sourceSans.variable, playfair.variable, firaCode.variable, geistMono.variable, geistPixel.variable, caveat.variable)}>
      <head>
        {/* Applies the stored theme (or the OS preference) before the first paint, so nothing flashes. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Opts the site into the HTML-in-Canvas origin trial when a token is configured. */}
        {originTrialToken ? <meta httpEquiv="origin-trial" content={originTrialToken} /> : null}
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
