import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme";

/**
 * Page background of every screen — the same as the home header:
 * light theme — white with a soft pink glow on the left and lavender on the right;
 * dark theme — deep plum with a pink glow on the left and violet on the right (the dark header mockup).
 */
export function PageBackdrop() {
  const dark = useTheme((s) => s.mode) === "dark";
  if (dark)
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#170D25", pointerEvents: "none" }]}>
        <LinearGradient
          colors={["rgba(214,48,150,0.42)", "rgba(23,13,37,0)", "rgba(110,32,210,0.5)"]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.65 }}
          end={{ x: 1, y: 0.35 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(23,13,37,0)", "rgba(23,13,37,0.35)", "rgba(23,13,37,0)"]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF", pointerEvents: "none" }]}>
      <LinearGradient
        colors={["rgba(239,65,154,0.13)", "rgba(255,255,255,0)", "rgba(155,110,240,0.16)"]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.6 }}
        end={{ x: 1, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/** Wraps each screen of a navigator so the backdrop sits under the screen's content. */
export function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <PageBackdrop />
      {children}
    </View>
  );
}
