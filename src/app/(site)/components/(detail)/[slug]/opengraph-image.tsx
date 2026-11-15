import { ImageResponse } from "next/og";
import { categories, getComponent, readyComponents } from "@/content/components";
import { OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const alt = "Component preview from hantui";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return readyComponents.map((entry) => ({ slug: entry.slug }));
}

export default async function ComponentImage({ params }: { params: Promise<{ slug: string }> }) {
  const entry = getComponent((await params).slug);
  const category = categories.find((c) => c.id === entry?.category)?.name ?? "Component";
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#c2410c" }}>{category}</div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 92, fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.02 }}>{entry?.name ?? "hantui"}</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: "#6b635d", maxWidth: 940, lineHeight: 1.35 }}>{entry?.description ?? ""}</div>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            marginTop: 40,
            padding: "12px 20px",
            borderRadius: 12,
            border: "1px solid #d6d3d1",
            background: "#f5f5f4",
            fontFamily: "Geist Mono",
            fontSize: 22,
            color: "#1c1917",
          }}
        >
          <span style={{ color: "#8a827c" }}>$&nbsp;</span>npx shadcn@latest add @hantui/{entry?.slug}
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
