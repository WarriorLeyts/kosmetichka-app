import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "../store/cart";
import { tap } from "./ui";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  cart: "bag-handle-outline",
  catalog: "grid-outline",
  orders: "clipboard-outline",
  waitlist: "heart-outline",
  profile: "person-outline",
};

const LABELS: Record<string, string> = {
  cart: "Корзина",
  catalog: "Каталог",
  orders: "Заказы",
  waitlist: "Ожидание",
  profile: "Профиль",
};

/** Floating bottom bar — same look as the site's .mobile-bottom-nav */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  return (
    <View style={[styles.wrap, { bottom: Math.max(12, insets.bottom) }]}>
      {state.routes.map((route, index) => {
        const name = route.name;
        if (!ICONS[name]) return null;
        const focused = state.index === index;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              tap();
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={[styles.item, focused && styles.active]}
          >
            <View>
              <Ionicons name={ICONS[name]} size={24} color={focused ? "#7c3aed" : "#94a3b8"} />
              {name === "cart" && count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, focused && { color: "#7c3aed" }]}>{LABELS[name]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Space screens should leave at the bottom so content isn't hidden behind the bar. */
export const TAB_BAR_SPACE = 100;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    height: 66,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.13,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 8, borderRadius: 14 },
  active: { backgroundColor: "#f3f0ff" },
  label: { fontSize: 10, fontWeight: "600", color: "#94a3b8" },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: "#ec4899",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
});
