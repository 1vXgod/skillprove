import { PROFILE_SECTIONS, type ProfileSection } from "@skillprove/shared";
import { notFound } from "./http";

/** An unknown section name is a 404, like any other unknown path. */
export function parseSection(value: string): ProfileSection {
  const section = PROFILE_SECTIONS.find((name) => name === value);
  if (!section) throw notFound();
  return section;
}
