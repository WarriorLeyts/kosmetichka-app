import type { ReactNode } from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * «Glass» panel from the profile mockup: translucent plum fill, thin bright-pink
 * rim with an outer glow, and a mirror-like gloss on the upper part.
 */
export function Glass({
  children,
  style,
  radius = 22,
  fill = ["rgba(114,12,72,0.55)", "rgba(52,6,40,0.62)"],
  rim = "rgba(225,60,160,0.85)",
  glow = "rgba(255,44,167,0.35)",
  gloss = 0.13,
}: {
  children?: ReactNode;
  style?: ViewStyle | ViewStyle[];
  radius?: number;
  fill?: readonly [string, string, ...string[]];
  rim?: string;
  glow?: string;
  gloss?: number;
}) {
  return (
    <View
      style={[
        {
          borderRadius: radius,
          borderWidth: 1,
          borderColor: rim,
          overflow: "hidden",
          boxShadow: `0 0 14px ${glow}`,
        },
        style,
      ]}
    >
      <LinearGradient colors={fill} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* mirror gloss: bright on top, fading to nothing by the middle */}
      <LinearGradient
        colors={[`rgba(255,255,255,${gloss})`, `rgba(255,255,255,${gloss * 0.35})`, "rgba(255,255,255,0)"]}
        locations={[0, 0.18, 0.55]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* inner top highlight line */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: radius / 2, right: radius / 2, height: 1, backgroundColor: "rgba(255,190,230,0.35)" }}
      />
      {children}
    </View>
  );
}
