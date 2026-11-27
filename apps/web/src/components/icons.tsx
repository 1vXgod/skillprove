import type { SVGProps } from "react";

/** A small inline icon set on a 24px grid with 1.75 strokes. Decorative unless labelled. */
type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function icon(paths: string[]) {
  return function Icon({ size = 20, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  };
}

export const MenuIcon = icon(["M4 6h16", "M4 12h16", "M4 18h16"]);
export const CloseIcon = icon(["M6 6l12 12", "M18 6L6 18"]);
export const ChevronDownIcon = icon(["M6 9l6 6 6-6"]);
export const ChevronLeftIcon = icon(["M15 6l-6 6 6 6"]);
export const ChevronRightIcon = icon(["M9 6l6 6-6 6"]);
export const CheckIcon = icon(["M5 12.5l4.5 4.5L19 7.5"]);
export const EyeIcon = icon(["M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z", "M12 15a3 3 0 100-6 3 3 0 000 6z"]);
export const EyeOffIcon = icon([
  "M3 3l18 18",
  "M10.6 5.1A10 10 0 0112 5c6 0 9.5 7 9.5 7a17 17 0 01-3.2 4.2",
  "M6.6 6.6A16.5 16.5 0 002.5 12s3.5 7 9.5 7a9.6 9.6 0 005.4-1.6",
  "M9.9 9.9a3 3 0 004.2 4.2",
]);
export const SunIcon = icon([
  "M12 16a4 4 0 100-8 4 4 0 000 8z",
  "M12 2v2", "M12 20v2", "M4.9 4.9l1.4 1.4", "M17.7 17.7l1.4 1.4", "M2 12h2", "M20 12h2", "M4.9 19.1l1.4-1.4", "M17.7 6.3l1.4-1.4",
]);
export const MoonIcon = icon(["M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"]);
export const MonitorIcon = icon(["M3 5h18v11H3z", "M8 20h8", "M12 16v4"]);
export const GlobeIcon = icon(["M12 21a9 9 0 100-18 9 9 0 000 18z", "M3 12h18", "M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"]);
export const InfoIcon = icon(["M12 21a9 9 0 100-18 9 9 0 000 18z", "M12 11v5", "M12 8h.01"]);
export const SuccessIcon = icon(["M12 21a9 9 0 100-18 9 9 0 000 18z", "M8.5 12.5l2.5 2.5 4.5-5"]);
export const WarningIcon = icon(["M10.3 4.2L2.6 17.5A2 2 0 004.3 20.5h15.4a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z", "M12 10v4", "M12 17h.01"]);
export const ErrorIcon = icon(["M12 21a9 9 0 100-18 9 9 0 000 18z", "M12 8v5", "M12 16h.01"]);
export const InboxIcon = icon(["M3 13h5l1.5 3h5L16 13h5", "M5.5 5h13L21 13v6H3v-6z"]);
export const HomeIcon = icon(["M4 11l8-7 8 7", "M6 9.5V20h12V9.5", "M10 20v-6h4v6"]);
export const UserIcon = icon(["M12 12a4 4 0 100-8 4 4 0 000 8z", "M4 20a8 8 0 0116 0"]);
export const UsersIcon = icon(["M9 11a4 4 0 100-8 4 4 0 000 8z", "M2 20a7 7 0 0114 0", "M16 3.5a4 4 0 010 7.5", "M18 14a6 6 0 014 6"]);
export const ClipboardIcon = icon(["M9 4h6v3H9z", "M9 5H6v15h12V5h-3", "M9 13l2 2 4-4"]);
export const BriefcaseIcon = icon(["M3 8h18v12H3z", "M9 8V5h6v3", "M3 13h18"]);
export const PaletteIcon = icon(["M12 21a9 9 0 110-18c5 0 9 3.6 9 8a4 4 0 01-4 4h-2a2 2 0 00-1.5 3.3A1.6 1.6 0 0112 21z", "M7.5 11h.01", "M10 7.5h.01", "M14.5 7.5h.01"]);
export const SettingsIcon = icon([
  "M12 15a3 3 0 100-6 3 3 0 000 6z",
  "M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
]);
export const MoreIcon =icon(["M6 12h.01", "M12 12h.01", "M18 12h.01"]);
export const ClockIcon = icon(["M12 21a9 9 0 100-18 9 9 0 000 18z", "M12 7v5l3 2"]);
export const HelpIcon = icon(["M12 21a9 9 0 100-18 9 9 0 000 18z", "M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2", "M12 17h.01"]);
export const BarChartIcon = icon(["M5 20V11", "M12 20V5", "M19 20v-6"]);
export const SignOutIcon = icon(["M15 4h4v16h-4", "M10 8l-4 4 4 4", "M6 12h10"]);
