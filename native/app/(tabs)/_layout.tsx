import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "@/store/cart";
import { colors } from "@/theme";
import { tap } from "@/components/ui";

type IconName = keyof typeof Ionicons.glyphMap;

function icon(active: IconName, inactive: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={23} color={color} />
  );
}

export default function TabsLayout() {
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  return (
    <Tabs
      screenListeners={{ tabPress: () => tap() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.pink,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "600" },
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border, borderTopWidth: 1 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Главная", tabBarIcon: icon("home", "home-outline") }} />
      <Tabs.Screen name="catalog" options={{ title: "Каталог", tabBarIcon: icon("grid", "grid-outline") }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Корзина",
          tabBarIcon: icon("bag-handle", "bag-handle-outline"),
          tabBarBadge: count > 0 ? (count > 99 ? "99+" : count) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.pink, color: "#fff", fontSize: 10, fontWeight: "800" },
        }}
      />
      <Tabs.Screen name="orders" options={{ title: "Заказы", tabBarIcon: icon("receipt", "receipt-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Профиль", tabBarIcon: icon("person", "person-outline") }} />
    </Tabs>
  );
}
