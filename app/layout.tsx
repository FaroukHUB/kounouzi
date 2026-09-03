import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE, directionOf, t } from "@/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: t(DEFAULT_LOCALE, "app.name"),
  description: t(DEFAULT_LOCALE, "app.tagline"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} dir={directionOf(DEFAULT_LOCALE)} className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
