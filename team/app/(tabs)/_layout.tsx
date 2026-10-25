import { Redirect, Tabs } from "expo-router";
import { TabBar } from "@/components/TabBar";
import { useAuth } from "@/store/auth";
import { PageLayout } from "@/components/PageBackdrop";
import { RoleGuard } from "@/components/RoleGuard";

export default function TabLayout() {
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  if (!user && !loading) return <Redirect href="/login" />;
  return (
    <Tabs
      screenLayout={({ children, route }) => (
        <PageLayout>
          <RoleGuard route={route.name}>{children}</RoleGuard>
        </PageLayout>
      )}
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, animation: "fade", sceneStyle: { backgroundColor: "transparent" } }}
      initialRouteName={user?.role === "picker" ? "picker" : "index"}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="customers" />
      <Tabs.Screen name="products" />
      <Tabs.Screen name="picker" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
