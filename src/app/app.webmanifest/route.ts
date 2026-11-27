import { BASE } from "@/lib/base";

// The page as an app (the owner, 2026-11-26: 「给部署网站添加一个快捷访问方式」): Chrome's and Edge's 安装 puts it on the
// desktop, the taskbar or a phone's home screen with its own icon (src/app/icon.svg), opening in its own window. A route
// rather than Next's manifest.ts: the layout links it with credentials (the preview is behind Cloudflare Access, and a
// manifest is fetched without cookies otherwise; Next adds them only on Vercel's previews).
export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      name: "部署监控 · Cameyware",
      short_name: "部署监控",
      description: "服务器上正在做什么：部署、上传、容器、CMS 的发布和 GitHub 的构建",
      lang: "zh-Hans",
      start_url: BASE,
      scope: BASE,
      display: "standalone",
      background_color: "#f6f8fb",
      theme_color: "#1e7044",
      icons: [{ src: `${BASE}icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }],
    },
    { headers: { "content-type": "application/manifest+json; charset=utf-8" } },
  );
}
