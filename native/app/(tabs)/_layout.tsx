import { Tabs } from "expo-router";
import { colors } from "@/theme";
import { TabBar } from "@/components/TabBar";

export const unstable_settings = { initialRouteName: "catalog" };

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="catalog"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerTitleStyle: { fontWeight: "900", fontSize: 22, color: colors.text },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTitleAlign: "left",
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="cart" options={{ title: "Корзина" }} />
      <Tabs.Screen name="catalog" options={{ title: "Каталог", headerShown: false }} />
      <Tabs.Screen name="orders" options={{ title: "Мои заказы" }} />
      <Tabs.Screen name="waitlist" options={{ title: "Лист ожидания" }} />
      <Tabs.Screen name="profile" options={{ title: "Мой профиль" }} />
      <Tabs.Screen name="index" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
