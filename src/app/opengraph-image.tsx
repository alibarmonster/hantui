import { ImageResponse } from "next/og";
import { categories, readyComponents } from "@/content/components";
import { OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const alt = "hantui: animated, accessible React components";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.02 }}>
          Components that feel&nbsp;<span style={{ color: "#c2410c" }}>alive.</span>
        </div>
        <div style={{ display: "flex", marginTop: 26, fontSize: 30, color: "#6b635d", maxWidth: 900, lineHeight: 1.35 }}>
          {readyComponents.length} animated, accessible React components. Copy the source or install with the shadcn CLI.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 40, maxWidth: 1000 }}>
          {categories.slice(0, 6).map((category) => (
            <div key={category.id} style={{ display: "flex", padding: "8px 16px", borderRadius: 999, border: "1px solid #d6d3d1", background: "#f5f5f4", fontSize: 20, color: "#1c1917" }}>
              {category.name}
            </div>
          ))}
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
