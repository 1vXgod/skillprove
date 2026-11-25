import type { ReactNode } from "react";
import { SignedInAppShell } from "../../../components/shell/signed-in-app-shell";
import { isDesignSystemEnabled } from "../../../lib/design-system";
import { ClerkTokenProvider } from "../../../lib/token-context";

/** Signed-in pages. The proxy has already required a session; Clerk is provided by (auth). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkTokenProvider>
      <SignedInAppShell showDesignSystem={isDesignSystemEnabled()}>{children}</SignedInAppShell>
    </ClerkTokenProvider>
  );
}
