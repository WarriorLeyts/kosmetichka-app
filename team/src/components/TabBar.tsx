import { useEffect, useRef, useState } from "react";
import { disabled } from "../debugFlags";
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useBadges } from "../store/badges";
import { useAuth, type Role } from "../store/auth";
import { useIOS } from "../ios";
import { tap } from "./ui";
import { useDesktop } from "../useDesktop";

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: "Главная", icon: "home-outline", active: "home" },
  orders: { label: "Заказы", icon: "document-text-outline", active: "document-text" },
  customers: { label: "Клиенты", icon: "people-outline", active: "people" },
  products: { label: "Товары", icon: "cube-outline", active: "cube" },
  picker: { label: "Сборка", icon: "basket-outline", active: "basket" },
  more: { label: "Ещё", icon: "ellipsis-horizontal-circle-outline", active: "ellipsis-horizontal-circle" },
};

export function tabsFor(role?: Role) {
  // phones: the frequent sections; everything else is in «Ещё» (on a computer — the side menu)
  return role === "picker" ? ["picker", "more"] : ["index", "orders", "picker", "customers", "more"];
}

/** Brand violet → pink (exact project colors) — buttons, chips */
export const VIOLET_PINK = ["#8b3dff", "#b832e0", "#e82c87"] as const;
/** Active tab capsule — magenta at the edges, deep violet in the middle (as on the mockup) */
const CAPSULE = ["#c400fb", "#7a05fd", "#5a06f6", "#b80dfc"] as const;
const INACTIVE = "#515B89";

const BAR_HEIGHT = 70;

/** Space a tab screen must leave at the bottom so content scrolls fully above the floating bar. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  const desktop = useDesktop();
  if (desktop) return 32;
  return BAR_HEIGHT + Math.max(insets.bottom, 10) + 18;
}

/** Floating translucent bottom bar; the violet capsule slides smoothly to the selected tab. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const badges = useBadges((s) => s.counts);
  // the tabs of this role (pickers: assembly + more; managers and admin: everything else)
  const role = useAuth((s) => s.user?.role);
  const allowed = tabsFor(role);
  const routes = state.routes.filter((r) => TABS[r.name] && allowed.includes(r.name));
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
        <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "rgba(33,16,50,0.65)" : "rgba(250,250,255,0.78)" }]} />

        {/* sliding capsule */}
        {itemW > 0 && !disabled("capsule") ? (
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
            (badges[route.name] ?? 0) > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badges[route.name] > 99 ? "99+" : badges[route.name]}</Text>
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
              {disabled("fade") ? (
                <View style={styles.content}>
                  <Ionicons name={focused ? t.active : t.icon} size={25} color={focused ? "#8b3dff" : INACTIVE} />
                  <Text numberOfLines={1} style={[styles.label, { color: focused ? "#8b3dff" : INACTIVE }]}>
                    {t.label}
                  </Text>
                </View>
              ) : null}
              {disabled("fade") ? null : <>
              <Animated.View style={[styles.content, { opacity: off }]}>
                <View>
                  <Ionicons name={t.icon} size={25} color={dark ? "#C3AECF" : INACTIVE} />
                  {badge}
                </View>
                <Text numberOfLines={1} style={[styles.label, { color: dark ? "#C3AECF" : INACTIVE }]}>
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
              </>}
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
    boxShadow: disabled("shadow") ? undefined : "0 8px 26px rgba(60,40,140,0.12)",
  },
  capsule: { position: "absolute", top: 6, bottom: 6 },
  capsuleFill: { flex: 1, borderRadius: 29, boxShadow: disabled("shadow") ? undefined : "0 6px 18px rgba(130,0,255,0.45)" },
  item: { flex: 1, height: BAR_HEIGHT - 12, alignItems: "center", justifyContent: "center" },
  content: { alignItems: "center", justifyContent: "center", gap: 3 },
  label: { fontSize: 12, fontWeight: "500" },
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
