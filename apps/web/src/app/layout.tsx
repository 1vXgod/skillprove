import { designTokensCss } from "@skillprove/shared/design";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { getRequestPreferences } from "../lib/preferences-server";
import "./globals.css";
import { Providers } from "./providers";

// latin-ext covers every Albanian letter.
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const tokensCss = designTokensCss();

export const metadata: Metadata = {
  title: "SkillProve",
  description: "People should demonstrate their skills rather than simply claim them.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, theme } = await getRequestPreferences();
  return (
    <html lang={locale} data-theme={theme} className={inter.variable}>
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
