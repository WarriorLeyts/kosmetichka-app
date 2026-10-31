import { createElement } from "react";
import { Platform, Text, TextStyle } from "react-native";
import { disabled } from "../debugFlags";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Text filled with a gradient — the site's `bg-gradient-to-r ... bg-clip-text text-transparent`.
 * Default colors: from-pink-500 via-purple-500 to-blue-700.
 */
/** var(--gradient) on the site: #e82c87 → #8b3dff → #0036b8 */
export const BRAND_GRADIENT = ["#e82c87", "#8b3dff", "#0036b8"] as const;

export function GradientText({
  children,
  style,
  colors = ["#ec4899", "#a855f7", "#1d4ed8"],
}: {
  children: string | number;
  style?: TextStyle | TextStyle[];
  colors?: readonly [string, string, ...string[]];
}) {
  // Browser: MaskedView drew the words in plain black (invisible on the dark theme) — the CSS
  // way, a gradient background clipped to the letters, is what the browser does natively.
  if (Platform.OS === "web") {
    return (
      <Text style={style}>
        {createElement(
          "span",
          {
            style: {
              backgroundImage: `linear-gradient(90deg, ${colors.join(", ")})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent",
            },
          },
          children
        )}
      </Text>
    );
  }
  if (disabled("mask")) return <Text style={[style as TextStyle, { color: colors[0] }]}>{children}</Text>;
  return (
    <MaskedView style={{ alignSelf: "flex-start" }} maskElement={<Text style={style}>{children}</Text>}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={[style as TextStyle, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
