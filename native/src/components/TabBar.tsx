import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
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
  cart: { label: "Корзина", icon: "bag-handle-outline", active: "bag-handle" },
  orders: { label: "Заказы", icon: "receipt-outline", active: "receipt" },
  profile: { label: "Профиль", icon: "person-outline", active: "person" },
};

/** Brand violet → pink (exact project colors) */
export const VIOLET_PINK = ["#8b3dff", "#b832e0", "#e82c87"] as const;

const BAR_HEIGHT = 66;

/** Space a tab screen must leave at the bottom so content scrolls fully above the floating bar. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + Math.max(insets.bottom, 10) + 18;
}

/** Floating translucent bottom bar with blur; the active tab is a violet-pink capsule. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const c = useIOS();
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.bar, { borderColor: c.separator }]}>
        <BlurView
          intensity={70}
          tint={c.blurTint}
          experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.blurTint === "dark" ? "rgba(28,28,30,0.6)" : "rgba(255,255,255,0.62)" }]} />
        {state.routes.map((route, index) => {
          const t = TABS[route.name];
          if (!t) return null;
          const focused = state.index === index;
          const onPress = () => {
            tap();
            const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };
          const content = (
            <>
              <View>
                <Ionicons name={focused ? t.active : t.icon} size={23} color={focused ? "#fff" : c.secondary} />
                {route.name === "cart" && count > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
                  </View>
                ) : null}
              </View>
              <Text numberOfLines={1} style={[styles.label, { color: focused ? "#fff" : c.secondary }]}>
                {t.label}
              </Text>
            </>
          );
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t.label}
              style={styles.item}
            >
              {focused ? (
                <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.capsule}>
                  {content}
                </LinearGradient>
              ) : (
                <View style={styles.plain}>{content}</View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12 },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: 33,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: "0 8px 24px rgba(31,41,55,0.12)",
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center" },
  plain: { alignItems: "center", justifyContent: "center", gap: 3, height: 54, width: "100%" },
  capsule: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: 54,
    width: "100%",
    borderRadius: 27,
    boxShadow: "0 6px 16px rgba(139,61,255,0.45)",
  },
  label: { fontSize: 11, fontWeight: "500" },
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
