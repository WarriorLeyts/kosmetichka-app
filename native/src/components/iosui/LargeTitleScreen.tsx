import { useRef, type ReactNode } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { iosText, useIOS } from "../../ios";

/**
 * iOS large-title screen: big bold title scrolls with the content; once it's
 * scrolled away, a compact centered title fades in on a translucent blurred bar.
 */
export function LargeTitleScreen({ title, left, children }: { title: string; left?: ReactNode; children: ReactNode }) {
  const c = useIOS();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(0)).current;
  const barH = insets.top + 44;

  const barOpacity = y.interpolate({ inputRange: [30, 52], outputRange: [0, 1], extrapolate: "clamp" });
  const bigScale = y.interpolate({ inputRange: [-120, 0], outputRange: [1.12, 1], extrapolate: "clamp" });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingTop: barH, paddingBottom: 32 }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true })}
      >
        <Animated.View style={[styles.large, { transform: [{ scale: bigScale }] }]}>
          {left}
          <Text style={[iosText.largeTitle, { color: c.label }]}>{title}</Text>
        </Animated.View>
        {children}
      </Animated.ScrollView>

      {/* compact bar */}
      <Animated.View pointerEvents="none" style={[styles.bar, { height: barH, opacity: barOpacity }]}>
        <BlurView intensity={60} tint={c.blurTint} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bar, opacity: 0.55 }]} />
        <View style={[styles.barContent, { paddingTop: insets.top }]}>
          <Text style={[iosText.headline, { color: c.label }]}>{title}</Text>
        </View>
        <View style={[styles.hairline, { backgroundColor: c.separator }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  large: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14, transformOrigin: "left" },
  bar: { position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" },
  barContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  hairline: { position: "absolute", left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
});
