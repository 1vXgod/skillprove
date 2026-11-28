import type { AssessmentStatus } from "@skillprove/shared";
import type { IconName } from "./ui";

/** The icon tile for each assessment status, shared by the list and the detail screen. */
export const STATUS_TILE: Record<AssessmentStatus, { icon: IconName; tone: "warning" | "success" | "neutral" }> = {
  DRAFT: { icon: "edit-3", tone: "warning" },
  PUBLISHED: { icon: "check-circle", tone: "success" },
  ARCHIVED: { icon: "archive", tone: "neutral" },
};
