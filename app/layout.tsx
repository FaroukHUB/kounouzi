import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE, directionOf, t } from "@/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: t(DEFAULT_LOCALE, "app.name"),
  description: t(DEFAULT_LOCALE, "app.tagline"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} dir={directionOf(DEFAULT_LOCALE)} className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[var(--k-sand)] text-[var(--k-ink)]">{children}</body>
    </html>
  );
}
