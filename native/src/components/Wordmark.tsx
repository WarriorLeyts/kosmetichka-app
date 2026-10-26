import { useRef, useState } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { useIOS } from "../ios";
import { setSplashTarget } from "../splashTarget";

export const BRAND_VIOLET = "#7925D6";
export const BRAND_PINK = "#EF419A";
const LOGO_RED = "#E8202A";

/**
 * «КОСМЕТИЧКА» wordmark, the same everywhere as in the home header: wide capitals in the brand
 * violet (light text on the dark theme), our K-heart logo in red above «И».
 * The word is ONE text, so every letter has exactly the same size; the logo is placed over «И»
 * by measuring the width of «КОСМЕТ» and «И» with invisible copies of the same text.
 */
export function Wordmark({ size = 19, light, style, anchor }: { size?: number; light?: boolean; style?: ViewStyle; anchor?: boolean }) {
  const logoRef = useRef<View>(null);
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const main = light ? "#ffffff" : dark ? "#FAF7FD" : BRAND_VIOLET;
  const spacing = size * 0.17;
  const t = { fontSize: size, letterSpacing: spacing, fontWeight: "400" as const, lineHeight: size * 1.25 };
  const logo = size * 0.62;
  const [pre, setPre] = useState(0); // width of «КОСМЕТ»
  const [withI, setWithI] = useState(0); // width of «КОСМЕТИ»
  const iCenter = pre + (withI - pre - spacing) / 2;
  return (
    <View style={[styles.wrap, { paddingTop: size * 0.5 }, style]} accessible accessibilityRole="header" accessibilityLabel="Косметичка">
      <Text style={[t, { color: main }]} numberOfLines={1}>
        КОСМЕТИЧКА
      </Text>
      {/* invisible measuring copies (same style) */}
      <View style={styles.measure} pointerEvents="none">
        <Text style={t} onLayout={(e) => setPre(e.nativeEvent.layout.width)}>
          КОСМЕТ
        </Text>
      </View>
      <View style={styles.measure} pointerEvents="none">
        <Text style={t} onLayout={(e) => setWithI(e.nativeEvent.layout.width)}>
          КОСМЕТИ
        </Text>
      </View>
      {withI > 0 ? (
        <View
          ref={logoRef}
          collapsable={false}
          onLayout={
            anchor
              ? () =>
                  setSplashTarget(
                    () =>
                      new Promise((resolve) => {
                        const v = logoRef.current;
                        if (!v) return resolve(null);
                        v.measureInWindow((x, y, w, h) => resolve(w > 0 ? { x, y, w, h } : null));
                      })
                  )
              : undefined
          }
          style={{ position: "absolute", width: logo, height: logo, top: size * 0.5 - logo * 0.78, left: iCenter - logo / 2 }}
        >
          <Image source={require("../../assets/home2/logo-white.png")} tintColor={LOGO_RED} contentFit="contain" style={{ width: logo, height: logo }} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center" },
  measure: { position: "absolute", left: 0, top: 0, opacity: 0, flexDirection: "row" },
});
