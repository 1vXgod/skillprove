"use client";

import type { SkillMedal as Medal } from "@skillprove/shared";
import { useI18n } from "../../lib/i18n";
import { SkillMedal } from "../ui";

/** The medal for a verified skill, labelled in the current language; nothing for no medal. */
export function MedalFor({ medal, outdated = false, size }: { medal: Medal | null; outdated?: boolean; size?: "sm" | "md" }) {
  const { t } = useI18n();
  if (!medal) return null;
  return <SkillMedal medal={medal} label={outdated ? `${t(`medals.${medal}`)}, ${t("passport.outdated")}` : t(`medals.${medal}`)} faded={outdated} size={size} />;
}
