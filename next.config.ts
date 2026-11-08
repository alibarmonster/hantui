import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  compress: true,
  // Used only at build time to read component sources and highlight code.
  serverExternalPackages: ["typescript", "shiki"],
  // `bun run typecheck` (run by CI before every build) checks types separately. On small machines,
  // set SKIP_BUILD_TYPECHECK=1 to skip Next's second, memory-hungry pass; by default it still runs.
  typescript: { ignoreBuildErrors: process.env.SKIP_BUILD_TYPECHECK === "1" },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        // Registry items are fetched cross-origin by the shadcn CLI and other tools.
        source: "/r/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
