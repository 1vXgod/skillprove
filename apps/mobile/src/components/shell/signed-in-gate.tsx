import { useAuth } from "@clerk/expo";
import type { ReactNode } from "react";
import { clerkPublishableKey } from "../../lib/auth-config";
import { useI18n } from "../../theme/preferences-provider";
import { AccountSection } from "../account-panel";
import { AppText, Spinner } from "../ui";

function SignedInOnly({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <Spinner />;
  if (!isSignedIn) {
    return (
      <>
        <AppText tone="mutedForeground">{t("common.signInRequired")}</AppText>
        <AccountSection />
      </>
    );
  }
  return children;
}

/**
 * Candidate screens need a session. Without Clerk keys the app says sign-in is not
 * configured; signed out, it offers sign-in. Nothing is shown with placeholder data.
 */
export function SignedInGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  if (!clerkPublishableKey) return <AppText tone="mutedForeground">{t("auth.notConfiguredMobile")}</AppText>;
  return <SignedInOnly>{children}</SignedInOnly>;
}
