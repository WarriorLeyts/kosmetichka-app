import { useRef, type ReactNode } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { tap } from "../ui";
import { useReduceMotion } from "../../useReduceMotion";
import { FitText } from "../FitText";
import { useTheme } from "../../theme";

const GRAD = ["#8b1ee6", "#c21ad0", "#f0388f"] as const; // violet → magenta → pink, as on the mockups

/** Press feedback: shrink to 0.98 and back (instant with «reduce motion»). */
function usePressScale() {
  const reduce = useReduceMotion();
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    reduce ? s.setValue(1) : Animated.timing(s, { toValue: v, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  return { s, onPressIn: () => to(0.98), onPressOut: () => to(1) };
}

/** Wide violet-pink gradient button with loading state (taps are ignored while loading/disabled). */
export function GradientButton({
  title, onPress, loading, disabled, icon, style,
}: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap; style?: ViewStyle }) {
  const p = usePressScale();
  const off = disabled || loading;
  return (
    <Pressable
      onPress={() => {
        if (off) return;
        tap();
        onPress();
      }}
      onPressIn={p.onPressIn}
      onPressOut={p.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale: p.s }], opacity: disabled ? 0.5 : 1 }}>
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.grad}>
          {loading ? <ActivityIndicator color="#fff" /> : icon ? <Ionicons name={icon} size={20} color="#fff" /> : null}
          <Text style={styles.gradText} numberOfLines={1}>
            {title}
          </Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

/** Light button with a violet frame. */
export function OutlineButton({
  title, onPress, loading, disabled, style, children,
}: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean; style?: ViewStyle; children?: ReactNode }) {
  const p = usePressScale();
  const dark = useTheme((st) => st.mode) === "dark";
  const off = disabled || loading;
  return (
    <Pressable
      onPress={() => {
        if (off) return;
        tap();
        onPress();
      }}
      onPressIn={p.onPressIn}
      onPressOut={p.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={style}
    >
      <Animated.View style={[styles.outline, dark && styles.outlineDark, { transform: [{ scale: p.s }], opacity: disabled ? 0.5 : 1 }]}>
        {loading ? <ActivityIndicator color={dark ? "#D9BBFF" : "#8b1ee6"} /> : null}
        <FitText style={[styles.outlineText, dark && styles.outlineTextDark]}>
          {title}
        </FitText>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grad: { height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 16, boxShadow: "0 8px 20px rgba(194,26,208,0.28)" },
  gradText: { color: "#fff", fontSize: 18, fontWeight: "700", flexShrink: 1 },
  outline: { minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: "#8b1ee6", backgroundColor: "rgba(194,26,208,0.06)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 },
  outlineText: { color: "#7a12d4", fontSize: 17, fontWeight: "700", flexShrink: 1 },
  // dark theme: the light-theme violet had a contrast of 2.2 on the plum cards
  outlineDark: { borderColor: "#B57CFF", backgroundColor: "rgba(181,124,255,0.10)" },
  outlineTextDark: { color: "#D9BBFF" },
});
