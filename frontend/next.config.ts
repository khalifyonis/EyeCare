import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // @ts-ignore - Next.js 15 devIndicators type can be boolean or object depending on minor version
  devIndicators: false,
  turbopack: {
    root: projectRoot,
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:5000/api/:path*" },
      { source: "/uploads/:path*", destination: "http://localhost:5000/uploads/:path*" },
    ];
  },
};

export default nextConfig;
