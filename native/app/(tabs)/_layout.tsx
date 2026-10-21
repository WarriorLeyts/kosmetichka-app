import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "@/store/cart";
import { LinearGradient } from "expo-linear-gradient";
import { colors, useTheme } from "@/theme";
import { PageTitle } from "@/components/PageTitle";
import { tap } from "@/components/ui";

type IconName = keyof typeof Ionicons.glyphMap;

function icon(active: IconName, inactive: IconName) {
  return ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabsLayout() {
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const dark = useTheme((s) => s.mode) === "dark";

  return (
    <Tabs
      screenListeners={{ tabPress: () => tap() }}
      screenOptions={{
        tabBarActiveTintColor: dark ? "#ff5dcb" : colors.pink,
        tabBarInactiveTintColor: dark ? "#baa0b7" : colors.faint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        // dark: bar from the profile mockup (.navbar) — plum gradient, pink top line, rounded top
        tabBarStyle: dark
          ? { borderTopColor: "#953075", borderTopWidth: 1, backgroundColor: "transparent", borderTopLeftRadius: 26, borderTopRightRadius: 26, elevation: 0 }
          : { borderTopColor: colors.border, backgroundColor: colors.card },
        tabBarBackground: dark
          ? () => (
              <LinearGradient
                colors={["#330c2e", "#24091e"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26 }}
              />
            )
          : undefined,
        headerTitleStyle: { fontWeight: "800", fontSize: 20 },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Главная", headerShown: false, tabBarIcon: icon("home", "home-outline") }} />
      <Tabs.Screen name="catalog" options={{ title: "Каталог", headerShown: false, tabBarIcon: icon("grid", "grid-outline") }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Корзина",
          // like the site's .cart-header h2: 30px, 900, brand gradient text
          headerTitle: () => <PageTitle title="Корзина" />,
          headerTitleAlign: "left",
          tabBarIcon: icon("bag", "bag-outline"),
          tabBarBadge: count > 0 ? (count > 99 ? "99+" : count) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.pink, fontSize: 10, fontWeight: "800" },
        }}
      />
      <Tabs.Screen name="orders" options={{ title: "Заказы", headerShown: false, tabBarIcon: icon("receipt", "receipt-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Профиль", headerShown: false, tabBarIcon: icon("person", "person-outline") }} />
    </Tabs>
  );
}
