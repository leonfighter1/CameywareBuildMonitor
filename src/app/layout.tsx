import "@mantine/core/styles.css";
import "@/generated/globals.css";
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
      <body style={{ background: "var(--t-background)" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
