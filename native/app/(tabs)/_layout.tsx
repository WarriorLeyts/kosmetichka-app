import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "@/store/cart";
import { colors } from "@/theme";
import { PageTitle } from "@/components/PageTitle";
import { TabBar, TabButton, useStyledTabBarOptions } from "@/components/TabBar";
import { disabled } from "@/debugFlags";

type IconName = keyof typeof Ionicons.glyphMap;

function icon(active: IconName, inactive: IconName) {
  return ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabsLayout() {
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const styled = useStyledTabBarOptions();
  // Android (SDK 54): our own bar with the sliding capsule. iOS: the standard bar styled the same way —
  // a fully custom bar froze all taps on iOS with the new SDK.
  const custom = Platform.OS === "android" && !disabled("tabbar");
  const btn = (tab: string) =>
    custom
      ? {}
      : {
          tabBarButton: (p: { onPress?: unknown; onLongPress?: unknown; accessibilityState?: { selected?: boolean }; "aria-selected"?: boolean }) => (
            <TabButton
              tab={tab}
              focused={!!(p.accessibilityState?.selected ?? p["aria-selected"])}
              onPress={p.onPress as never}
              onLongPress={p.onLongPress as never}
            />
          ),
        };

  return (
    <Tabs
      tabBar={custom ? (props) => <TabBar {...props} /> : undefined}
      screenOptions={{
        tabBarActiveTintColor: colors.pink,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.card },
        headerTitleStyle: { fontWeight: "800", fontSize: 20 },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        sceneStyle: { backgroundColor: colors.bg },
        // smooth cross-fade between tabs
        animation: "fade",
        ...(custom ? {} : styled),
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Главная", headerShown: false, tabBarIcon: icon("home", "home-outline"), ...btn("index") }} />
      <Tabs.Screen name="catalog" options={{ title: "Каталог", headerShown: false, tabBarIcon: icon("grid", "grid-outline"), ...btn("catalog") }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Корзина",
          headerShown: false,
          tabBarIcon: icon("bag", "bag-outline"),
          tabBarBadge: count > 0 ? (count > 99 ? "99+" : count) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.pink, fontSize: 10, fontWeight: "800" },
          ...btn("cart"),
          ...(custom ? {} : { tabBarBadge: undefined }),
        }}
      />
      <Tabs.Screen name="orders" options={{ title: "Заказы", headerShown: false, tabBarIcon: icon("receipt", "receipt-outline"), ...btn("orders") }} />
      <Tabs.Screen name="profile" options={{ title: "Профиль", headerShown: false, tabBarIcon: icon("person", "person-outline"), ...btn("profile") }} />
    </Tabs>
  );
}
