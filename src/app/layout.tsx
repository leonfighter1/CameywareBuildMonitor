import "@mantine/core/styles.css";
import "@/generated/globals.css";
// This page's own skin over the company's tokens (the owner, 2026-11-26: 「有点赛博风格」).
import "./cyber.css";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { BASE } from "@/lib/base";

export const metadata: Metadata = {
  title: "部署监控 · Cameyware",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hans" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
        <link rel="manifest" href={`${BASE}app.webmanifest`} crossOrigin="use-credentials" />
      </head>
      <body className="cy-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
