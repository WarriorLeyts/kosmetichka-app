import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { useIOS } from "../ios";

export const BRAND_VIOLET = "#7925D6";
export const BRAND_PINK = "#EF419A";
const LOGO_RED = "#E8202A";

/**
 * «КОСМЕТИЧКА» wordmark, the same everywhere as in the home header: wide capitals in the brand
 * violet (light text on the dark theme), our K-heart logo in red above «И».
 */
export function Wordmark({ size = 19, light, style }: { size?: number; light?: boolean; style?: ViewStyle }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const main = light ? "#ffffff" : dark ? "#FAF7FD" : BRAND_VIOLET;
  const spacing = size * 0.17;
  const t = { fontSize: size, letterSpacing: spacing, fontWeight: "400" as const, lineHeight: size * 1.25, color: main };
  const logo = size * 0.62;
  return (
    <View style={[styles.row, { paddingTop: size * 0.5 }, style]} accessible accessibilityRole="header" accessibilityLabel="Косметичка">
      <Text style={t}>КОСМЕТ</Text>
      <View>
        <Text style={t}>И</Text>
        <Image
          source={require("../../assets/home2/logo-white.png")}
          tintColor={LOGO_RED}
          contentFit="contain"
          style={{ position: "absolute", width: logo, height: logo, top: -logo * 0.78, left: (size * 0.72 - logo) / 2 }}
        />
      </View>
      <Text style={t}>ЧКА</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end" },
});
