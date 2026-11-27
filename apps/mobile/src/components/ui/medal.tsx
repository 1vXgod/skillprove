import type { SkillMedal as Medal } from "@skillprove/shared";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../../theme/preferences-provider";

/** Same drawing as the web medal: ribbon tails, a rimmed disc and a star, on a 24 × 28 grid. */
const STAR = "M12 13.6l1.3 2.7 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z";
const SIZES = { sm: 18, md: 26 } as const;
const TOKENS = {
  gold: ["medalGold", "medalGoldRim"],
  silver: ["medalSilver", "medalSilverRim"],
  bronze: ["medalBronze", "medalBronzeRim"],
} as const;

/**
 * A skill medal. Display only. `label` is the translated medal name, read by VoiceOver.
 * `faded` marks outdated evidence; the "Outdated" badge beside it says why.
 */
export function SkillMedal({ medal, label, size = "sm", faded = false }: { medal: Medal; label: string; size?: keyof typeof SIZES; faded?: boolean }) {
  const { colors } = useTheme();
  const [faceToken, rimToken] = TOKENS[medal];
  const face = colors[faceToken];
  const rim = colors[rimToken];
  const width = SIZES[size];
  return (
    <Svg accessible accessibilityRole="image" accessibilityLabel={label} width={width} height={(width * 28) / 24} viewBox="0 0 24 28" opacity={faded ? 0.6 : 1}>
      <Path d="M6.5 1h4.5l2.2 8.5H8.7z" fill={rim} />
      <Path d="M17.5 1H13l-2.2 8.5h4.5z" fill={rim} opacity={0.8} />
      <Circle cx={12} cy={18} r={8.75} fill={face} stroke={rim} strokeWidth={1.5} />
      <Path d={STAR} fill={rim} />
    </Svg>
  );
}
