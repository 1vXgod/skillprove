"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useI18n } from "../../lib/i18n";
import { SignOutIcon, UserIcon } from "../icons";
import { Avatar, DropdownMenu, Skeleton } from "../ui";

/** Must render inside ClerkProvider. Shows the Clerk user and its account actions. */
export function UserMenu() {
  const { t } = useI18n();
  const router = useRouter();
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) return <Skeleton className="size-9 rounded-full" />;
  if (!user) return null;

  const name = user.fullName || user.username || user.primaryEmailAddress?.emailAddress || "SkillProve";
  const email = user.primaryEmailAddress?.emailAddress;

  return (
    <DropdownMenu
      header={
        email && (
          <p className="truncate type-caption text-muted-foreground">{t("shell.signedInAs", { email })}</p>
        )
      }
      trigger={(props) => (
        <button type="button" {...props} aria-label={t("shell.userMenu")} className="rounded-full">
          <Avatar name={name} src={user.hasImage ? user.imageUrl : null} size="sm" />
        </button>
      )}
      groups={[
        {
          items: [
            { key: "account", label: t("nav.account"), icon: <UserIcon size={16} />, onSelect: () => router.push("/account") },
            { key: "sign-out", label: t("auth.signOut"), icon: <SignOutIcon size={16} />, onSelect: () => void signOut({ redirectUrl: "/" }) },
          ],
        },
      ]}
    />
  );
}
