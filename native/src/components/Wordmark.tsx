import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientText } from "./GradientText";
import { useIOS } from "../ios";

const ACCENT = ["#b21fe0", "#e82c87"] as const; // «ЧКА» — violet → pink (brand colors)
const ACCENT_LIGHT = ["#ffd6f0", "#ffffff"] as const; // on the gradient hero

/**
 * «КОСМЕТИЧКА» wordmark as in the brand mockups: thin wide capitals,
 * «КОСМЕТ» dark, a pink heart above «И», «ЧКА» in the violet-pink gradient.
 */
export function Wordmark({ size = 19, light, style }: { size?: number; light?: boolean; style?: ViewStyle }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const main = light ? "#ffffff" : dark ? "#F2F2F7" : "#15163A";
  const spacing = size * 0.17;
  const t = { fontSize: size, letterSpacing: spacing, fontWeight: "400" as const, lineHeight: size * 1.25 };
  return (
    <View style={[styles.row, style]} accessible accessibilityRole="header" accessibilityLabel="Косметичка">
      <Text style={[t, { color: main }]}>КОСМЕТ</Text>
      <View>
        <Text style={[t, { color: main }]}>И</Text>
        <Ionicons
          name="heart"
          size={size * 0.48}
          color={light ? "#ffffff" : "#e82c87"}
          style={{ position: "absolute", top: -size * 0.42, left: (size * 0.72 - size * 0.48) / 2 }}
        />
      </View>
      <GradientText style={t} colors={light ? ACCENT_LIGHT : ACCENT}>
        ЧКА
      </GradientText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", paddingTop: 4 },
});
