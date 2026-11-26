import { createTranslator } from "@skillprove/shared/i18n";
import type { Metadata } from "next";
import { HomeDashboard } from "../../../../components/home/home-dashboard";
import { getRequestPreferences } from "../../../../lib/preferences-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = createTranslator((await getRequestPreferences()).locale);
  return { title: `${t("home.title")} · SkillProve` };
}

export default function HomePage() {
  return <HomeDashboard />;
}
