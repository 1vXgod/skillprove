import { designTokensCss } from "@skillprove/shared/design";
import type { Metadata } from "next";
import { DM_Serif_Display, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { getRequestPreferences } from "../lib/preferences-server";
import "./globals.css";
import { Providers } from "./providers";

// latin-ext covers every Albanian letter. Plus Jakarta Sans for text and the wordmark, DM Serif
// Display for headlines (see fontFamilies in the design tokens).
const sans = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-sans", display: "swap" });
const display = DM_Serif_Display({ subsets: ["latin", "latin-ext"], weight: "400", style: ["normal", "italic"], variable: "--font-display", display: "swap" });
const tokensCss = designTokensCss();

export const metadata: Metadata = {
  title: "SkillProve",
  description: "People should demonstrate their skills rather than simply claim them.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, theme } = await getRequestPreferences();
  return (
    <html lang={locale} data-theme={theme} className={`${sans.variable} ${display.variable}`}>
      <head>
        <style id="sp-tokens">{tokensCss}</style>
      </head>
      <body className="min-h-dvh">
        <Providers locale={locale} theme={theme}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
