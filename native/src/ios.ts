/**
 * iOS look (Human Interface Guidelines): system grouped backgrounds, label colors,
 * separators. Accent = our brand pink. Values follow UIKit's dynamic system colors.
 */
import { Platform } from "react-native";
import { useTheme } from "./theme";

export const iosLight = {
  bg: "#F2F2F7", // systemGroupedBackground
  cell: "#FFFFFF", // secondarySystemGroupedBackground
  cellPressed: "#D1D1D6",
  label: "#000000",
  secondary: "rgba(60,60,67,0.6)", // secondaryLabel
  tertiary: "rgba(60,60,67,0.3)",
  separator: "rgba(60,60,67,0.29)",
  chevron: "#C4C4C7",
  bar: "rgba(249,249,249,0.94)",
  blurTint: "light" as "light" | "dark",
};

export const iosDark: typeof iosLight = {
  bg: "#000000",
  cell: "#1C1C1E",
  cellPressed: "#3A3A3C",
  label: "#FFFFFF",
  secondary: "rgba(235,235,245,0.6)",
  tertiary: "rgba(235,235,245,0.3)",
  separator: "rgba(84,84,88,0.65)",
  chevron: "#5A5A5E",
  bar: "rgba(22,22,23,0.92)",
  blurTint: "dark",
};

/** iOS system tint colors for settings-style icon squares */
export const sys = {
  pink: "#e82c87", // brand accent
  red: "#FF3B30",
  orange: "#FF9500",
  yellow: "#FFCC00",
  green: "#34C759",
  teal: "#30B0C7",
  blue: "#007AFF",
  indigo: "#5856D6",
  purple: "#AF52DE",
  gray: "#8E8E93",
};

export function useIOS() {
  return useTheme((s) => s.mode) === "dark" ? iosDark : iosLight;
}

/** SF Pro on iPhone (system font); Inter on Android — SF Pro may only be used on Apple platforms. */
export const iosFont = {
  regular: Platform.select({ ios: undefined, default: "Inter_400Regular" }),
  medium: Platform.select({ ios: undefined, default: "Inter_500Medium" }),
  semibold: Platform.select({ ios: undefined, default: "Inter_600SemiBold" }),
  bold: Platform.select({ ios: undefined, default: "Inter_700Bold" }),
};

/** weight only on iOS — on Android the Inter_* family already carries the weight */
const w = (v: "400" | "500" | "600" | "700") => (Platform.OS === "ios" ? v : undefined);

/** iOS text styles (Dynamic Type «Large» sizes) */
export const iosText = {
  largeTitle: { fontSize: 34, lineHeight: 41, letterSpacing: 0.37, fontWeight: w("700"), fontFamily: iosFont.bold },
  title2: { fontSize: 22, lineHeight: 28, letterSpacing: 0.35, fontWeight: w("600"), fontFamily: iosFont.semibold },
  headline: { fontSize: 17, lineHeight: 22, letterSpacing: -0.41, fontWeight: w("600"), fontFamily: iosFont.semibold },
  body: { fontSize: 17, lineHeight: 22, letterSpacing: -0.41, fontWeight: w("400"), fontFamily: iosFont.regular },
  subhead: { fontSize: 15, lineHeight: 20, letterSpacing: -0.24, fontWeight: w("400"), fontFamily: iosFont.regular },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: -0.08, fontWeight: w("400"), fontFamily: iosFont.regular },
};
