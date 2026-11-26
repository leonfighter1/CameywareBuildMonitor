import type { NextConfig } from "next";

// The page: a static export served at /ops/ beside the website (preview.cameyware.com/ops/: the web group's nginx, from
// its ops-site folder), calling its backend at the company's services (src/lib/api.ts).
const config: NextConfig = {
  output: "export",
  basePath: "/ops",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
