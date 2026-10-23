import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme";

/**
 * Page background of every screen — the same as the light home header: white with a soft pink
 * glow on the left and lavender on the right. The dark theme keeps its plain plum background.
 */
export function PageBackdrop() {
  const dark = useTheme((s) => s.mode) === "dark";
  if (dark) return <View style={[StyleSheet.absoluteFill, { backgroundColor: "#170D25", pointerEvents: "none" }]} />;
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
