"use client";

import type { ThemePreference } from "@skillprove/shared/design";
import type { Locale } from "@skillprove/shared/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { I18nProvider } from "../lib/i18n";
import { ThemeProvider } from "../lib/theme";

export function Providers({
  locale,
  theme,
  children,
}: {
  locale: Locale;
  theme: ThemePreference;
  children: ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale={locale}>
        <ThemeProvider initialPreference={theme}>{children}</ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
