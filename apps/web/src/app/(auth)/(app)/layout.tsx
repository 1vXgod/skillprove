import type { ReactNode } from "react";
import { AppShell } from "../../../components/shell/app-shell";
import { UserMenu } from "../../../components/shell/user-menu";
import { isDesignSystemEnabled } from "../../../lib/design-system";
import { ClerkTokenProvider } from "../../../lib/token-context";

/** Signed-in pages. The proxy has already required a session; Clerk is provided by (auth). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkTokenProvider>
      <AppShell account={<UserMenu />} showDesignSystem={isDesignSystemEnabled()}>
        {children}
      </AppShell>
    </ClerkTokenProvider>
  );
}
