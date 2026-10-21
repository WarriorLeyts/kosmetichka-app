import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme";

/**
 * Decorative «silk» backdrop from the mockup: deep plum base with soft pink
 * ribbons (rotated translucent gradients). Pure views — no images needed.
 */
export function Silk({ style, intensity = 1 }: { style?: ViewStyle; intensity?: number }) {
  const o = (v: number) => Math.min(1, v * intensity);
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }, style]} pointerEvents="none">
      <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Ribbon top="-8%" left="-40%" w="180%" h="38%" rotate="-18deg" opacity={o(0.55)} />
      <Ribbon top="34%" left="-30%" w="170%" h="30%" rotate="14deg" opacity={o(0.4)} />
      <Ribbon top="66%" left="-50%" w="200%" h="34%" rotate="-10deg" opacity={o(0.5)} />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.35)"]}
        start={{ x: 0.5, y: 0.3 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function Ribbon({ top, left, w, h, rotate, opacity }: { top: `${number}%`; left: `${number}%`; w: `${number}%`; h: `${number}%`; rotate: string; opacity: number }) {
  return (
    <LinearGradient
      colors={["transparent", "rgba(255,45,149,0.55)", "rgba(255,140,200,0.35)", "transparent"]}
      locations={[0, 0.45, 0.6, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        position: "absolute",
        top,
        left,
        width: w,
        height: h,
        borderRadius: 999,
        opacity,
        transform: [{ rotate }],
      }}
    />
  );
}
