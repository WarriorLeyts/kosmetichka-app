import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "@/store/cart";
import { colors } from "@/theme";
import { PageTitle } from "@/components/PageTitle";
import { TabBar } from "@/components/TabBar";
import { disabled } from "@/debugFlags";
import { PageLayout } from "@/components/PageBackdrop";

type IconName = keyof typeof Ionicons.glyphMap;

function icon(active: IconName, inactive: IconName) {
  return ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabsLayout() {
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  return (
    <Tabs
      screenLayout={disabled("layout") ? undefined : ({ children }) => <PageLayout>{children}</PageLayout>}
      tabBar={disabled("tabbar") ? undefined : (props) => <TabBar {...props} />}
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
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Главная", headerShown: false, tabBarIcon: icon("home", "home-outline") }} />
      <Tabs.Screen name="catalog" options={{ title: "Каталог", headerShown: false, tabBarIcon: icon("grid", "grid-outline") }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Корзина",
          headerShown: false,
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
