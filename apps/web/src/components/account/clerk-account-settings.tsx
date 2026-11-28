"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { clerkAccountPortalUrl } from "@skillprove/shared";
import { AccountSettings } from "./account-settings";

const portalUrl = clerkAccountPortalUrl(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/** Must render inside ClerkProvider: fills Account and settings from the signed-in Clerk user. */
export function ClerkAccountSettings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const identity = user
    ? { name: user.fullName || user.username || user.primaryEmailAddress?.emailAddress || "SkillProve", imageUrl: user.hasImage ? user.imageUrl : null }
    : null;
  return <AccountSettings identity={identity} portalUrl={portalUrl} onSignOut={() => void signOut({ redirectUrl: "/" })} />;
}
