import { useEffect, useRef, useState } from "react";
import { disabled } from "../debugFlags";
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "../store/cart";
import { useIOS } from "../ios";
import { tap } from "./ui";

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: "Главная", icon: "home-outline", active: "home" },
  catalog: { label: "Каталог", icon: "grid-outline", active: "grid" },
  cart: { label: "Корзина", icon: "bag-outline", active: "bag" },
  orders: { label: "Заказы", icon: "document-text-outline", active: "document-text" },
  profile: { label: "Профиль", icon: "person-outline", active: "person" },
};

/** Brand violet → pink (exact project colors) — buttons, chips */
export const VIOLET_PINK = ["#8b3dff", "#b832e0", "#e82c87"] as const;
/** Active tab capsule — magenta at the edges, deep violet in the middle (as on the mockup) */
const CAPSULE = ["#c400fb", "#7a05fd", "#5a06f6", "#b80dfc"] as const;
const INACTIVE = "#515B89";

const BAR_HEIGHT = 70;

/** Space a tab screen must leave at the bottom so content scrolls fully above the floating bar. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + Math.max(insets.bottom, 10) + 18;
}

/** Floating translucent bottom bar; the violet capsule slides smoothly to the selected tab. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const routes = state.routes.filter((r) => TABS[r.name]);
  const activeIdx = Math.max(0, routes.findIndex((r) => r.key === state.routes[state.index]?.key));
  const pos = useRef(new Animated.Value(activeIdx)).current;
  // bar width from the screen size (measuring it with onLayout + state looped the layout on RN 0.88 and froze taps)
  const { width: screenW } = useWindowDimensions();
  const barW = screenW - 20; // wrap: left 10, right 10
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);

  useEffect(() => {
    if (reduce) pos.setValue(activeIdx);
    else Animated.timing(pos, { toValue: activeIdx, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [activeIdx, reduce, pos]);

  const PAD = 6;
  const itemW = barW > 0 ? (barW - PAD * 2) / routes.length : 0;
  const n = routes.length;

  return (
    <View style={[styles.wrap, { pointerEvents: "box-none" }, { bottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.bar, { borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(81,91,137,0.08)" }]}>
        {disabled("blur") ? null : <BlurView
          intensity={70}
          tint={c.blurTint}
          experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
          style={StyleSheet.absoluteFill}
        />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "rgba(28,28,30,0.65)" : "rgba(250,250,255,0.78)" }]} />

        {/* sliding capsule */}
        {itemW > 0 ? (
          <Animated.View
            style={[
              styles.capsule,
              { pointerEvents: "none" },
              {
                left: PAD,
                width: itemW,
                transform: [{ translateX: pos.interpolate({ inputRange: [0, Math.max(1, n - 1)], outputRange: [0, itemW * Math.max(1, n - 1)] }) }],
              },
            ]}
          >
            <LinearGradient colors={CAPSULE} locations={[0, 0.42, 0.62, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.capsuleFill} />
          </Animated.View>
        ) : null}

        {routes.map((route, i) => {
          const t = TABS[route.name];
          const focused = i === activeIdx;
          const onPress = () => {
            tap();
            const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };
          // active look fades in as the capsule arrives
          const on = pos.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [0, 1, 0], extrapolate: "clamp" });
          const off = pos.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [1, 0, 1], extrapolate: "clamp" });
          const badge =
            route.name === "cart" && count > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
              </View>
            ) : null;
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t.label}
              style={styles.item}
            >
              <Animated.View style={[styles.content, { opacity: off }]}>
                <View>
                  <Ionicons name={t.icon} size={25} color={dark ? "#AEB4D0" : INACTIVE} />
                  {badge}
                </View>
                <Text numberOfLines={1} style={[styles.label, { color: dark ? "#AEB4D0" : INACTIVE }]}>
                  {t.label}
                </Text>
              </Animated.View>
              <Animated.View style={[styles.content, StyleSheet.absoluteFill, { opacity: on }]}>
                <View>
                  <Ionicons name={t.active} size={25} color="#fff" />
                  {badge}
                </View>
                <Text numberOfLines={1} style={[styles.label, { color: "#fff", fontWeight: "700" }]}>
                  {t.label}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 10, right: 10 },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: 35,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    borderWidth: 1,
    boxShadow: "0 8px 26px rgba(60,40,140,0.12)",
  },
  capsule: { position: "absolute", top: 6, bottom: 6 },
  capsuleFill: { flex: 1, borderRadius: 29, boxShadow: "0 6px 18px rgba(130,0,255,0.45)" },
  item: { flex: 1, height: BAR_HEIGHT - 12, alignItems: "center", justifyContent: "center" },
  content: { alignItems: "center", justifyContent: "center", gap: 3 },
  label: { fontSize: 12, fontWeight: "500" },
  btn: { flex: 1, height: BAR_HEIGHT - 12, marginVertical: 6, alignItems: "center", justifyContent: "center" },
  btnCapsule: { ...StyleSheet.absoluteFillObject, pointerEvents: "none" },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#e82c87",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: { color: "#fff", fontSize: 9.5, fontWeight: "800" },
});

// ───────── iOS: the standard bottom tab bar styled like ours (a fully custom bar froze taps on iOS / SDK 58) ─────────

/** Rounded translucent background with blur for the standard tab bar. */
export function TabBarBackdrop() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: 35, overflow: "hidden" }]}>
      {disabled("blur") ? null : <BlurView intensity={70} tint={c.blurTint} style={StyleSheet.absoluteFill} />}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "rgba(28,28,30,0.65)" : "rgba(250,250,255,0.78)" }]} />
    </View>
  );
}

/** One tab: outline icon + label; the active one gets the violet capsule, fading in smoothly. */
export function TabButton({ tab, focused, onPress, onLongPress }: { tab: string; focused: boolean; onPress?: (e: never) => void; onLongPress?: (e: never) => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const t = TABS[tab];
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const v = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);
  useEffect(() => {
    if (reduce) v.setValue(focused ? 1 : 0);
    else Animated.timing(v, { toValue: focused ? 1 : 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [focused, reduce, v]);
  if (!t) return null;
  const off = v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const badge =
    tab === "cart" && count > 0 ? (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
      </View>
    ) : null;
  return (
    <Pressable
      onPress={(e) => {
        tap();
        onPress?.(e as never);
      }}
      onLongPress={onLongPress as never}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={t.label}
      style={styles.btn}
    >
      <Animated.View style={[styles.btnCapsule, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
        <LinearGradient colors={CAPSULE} locations={[0, 0.42, 0.62, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.capsuleFill} />
      </Animated.View>
      <Animated.View style={[styles.content, { opacity: off }]}>
        <View>
          <Ionicons name={t.icon} size={25} color={dark ? "#AEB4D0" : INACTIVE} />
          {badge}
        </View>
        <Text numberOfLines={1} style={[styles.label, { color: dark ? "#AEB4D0" : INACTIVE }]}>
          {t.label}
        </Text>
      </Animated.View>
      <Animated.View style={[styles.content, StyleSheet.absoluteFill, { opacity: v }]}>
        <View>
          <Ionicons name={t.active} size={25} color="#fff" />
          {badge}
        </View>
        <Text numberOfLines={1} style={[styles.label, { color: "#fff", fontWeight: "700" }]}>
          {t.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** Options for the standard tab bar so it floats and looks like ours. */
export function useStyledTabBarOptions() {
  const insets = useSafeAreaInsets();
  return {
    tabBarShowLabel: false,
    tabBarStyle: {
      position: "absolute" as const,
      left: 10,
      right: 10,
      bottom: Math.max(insets.bottom, 10),
      height: BAR_HEIGHT,
      paddingBottom: 0,
      paddingTop: 0,
      paddingHorizontal: 6,
      borderTopWidth: 0,
      borderRadius: 35,
      backgroundColor: "transparent",
      elevation: 0,
      boxShadow: "0 8px 26px rgba(60,40,140,0.12)",
    },
    tabBarBackground: () => <TabBarBackdrop />,
  };
}
