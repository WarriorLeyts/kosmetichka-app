import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TeamMark } from "./TeamHeader";
import { useAuth, ROLE_LABEL, type Role } from "../store/auth";
import { useBadges } from "../store/badges";
import { useTheme } from "../theme";
import { useIOS } from "../ios";

type IconName = keyof typeof Ionicons.glyphMap;
type Item = { href: string; label: string; icon: IconName; roles: Role[]; badge?: string; match?: (p: string) => boolean; external?: boolean };

const STAFF: Role[] = ["admin", "manager"];
const ALL: Role[] = ["admin", "manager", "picker"];

/** The sections of the admin site, in its order — the same app on phones has them in tabs and «Ещё». */
export const SECTIONS: { title?: string; items: Item[] }[] = [
  {
    items: [
      { href: "/", label: "Главная", icon: "home-outline", roles: STAFF, match: (p) => p === "/" },
      { href: "/orders", label: "Заказы", icon: "document-text-outline", roles: STAFF, badge: "orders", match: (p) => p.startsWith("/orders") || p.startsWith("/order/") },
      { href: "/picker", label: "Сборка", icon: "basket-outline", roles: ALL, badge: "picker", match: (p) => p.startsWith("/picker") || p.startsWith("/pick/") || p.startsWith("/assembly") },
      { href: "/customers", label: "Клиенты", icon: "people-outline", roles: STAFF, match: (p) => p.startsWith("/customers") || p.startsWith("/customer/") },
      { href: "/products", label: "Товары", icon: "cube-outline", roles: STAFF, match: (p) => p.startsWith("/products") || p.startsWith("/product/") },
      { href: "/stats", label: "Статистика", icon: "stats-chart-outline", roles: STAFF },
    ],
  },
  {
    title: "1С",
    items: [
      { href: "/export", label: "Выгрузка заказов", icon: "cloud-upload-outline", roles: STAFF },
      { href: "/import", label: "Импорт из 1С", icon: "cloud-download-outline", roles: STAFF },
    ],
  },
  {
    title: "Управление",
    items: [
      { href: "/academy/results", label: "Тесты сотрудников", icon: "school-outline", roles: STAFF, external: true },
      { href: "/users", label: "Сотрудники", icon: "people-circle-outline", roles: ["admin"], match: (p) => p.startsWith("/users") || p.startsWith("/user/") },
      { href: "/push", label: "Рассылки", icon: "megaphone-outline", roles: ["admin"] },
      { href: "/app-errors", label: "Ошибки приложений", icon: "bug-outline", roles: ["admin"] },
    ],
  },
];

/** Admin site on a computer: the menu on the left (sections of the site's admin), our colours. */
export function Sidebar() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const path = usePathname();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const badges = useBadges((s) => s.counts);
  const mode = useTheme((s) => s.mode);
  const toggleTheme = useTheme((s) => s.toggle);
  if (!user) return null;

  const open = (it: Item) => {
    if (it.external) {
      // a page of the site (not part of this app): opens in the same tab
      Linking.openURL(it.href).catch(() => {});
      return;
    }
    router.navigate(it.href as never);
  };

  return (
    <View style={[styles.bar, { backgroundColor: dark ? "rgba(28,15,44,0.96)" : "rgba(255,255,255,0.92)", borderRightColor: c.separator }]}>
      <View style={styles.brand}>
        <TeamMark size={17} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
        {SECTIONS.map((sec, si) => {
          const items = sec.items.filter((it) => it.roles.includes(user.role));
          if (!items.length) return null;
          return (
            <View key={si} style={{ marginTop: si ? 14 : 4 }}>
              {sec.title ? <Text style={[styles.section, { color: c.secondary }]}>{sec.title}</Text> : null}
              {items.map((it) => {
                const on = it.match ? it.match(path) : path === it.href || path.startsWith(it.href + "/");
                const n = it.badge ? badges[it.badge] ?? 0 : 0;
                return (
                  <Pressable
                    key={it.href}
                    onPress={() => open(it)}
                    accessibilityRole="link"
                    style={({ hovered }: { hovered?: boolean; pressed: boolean }) => [
                      styles.item,
                      on && { backgroundColor: dark ? "rgba(139,61,255,0.28)" : "rgba(139,61,255,0.12)" },
                      hovered && !on && { backgroundColor: dark ? "rgba(255,255,255,0.06)" : "rgba(139,61,255,0.06)" },
                    ]}
                  >
                    <Ionicons name={it.icon} size={20} color={on ? "#8b3dff" : c.label} />
                    <Text style={[styles.label, { color: on ? "#8b3dff" : c.label, fontWeight: on ? "700" : "500" }]} numberOfLines={1}>
                      {it.label}
                    </Text>
                    {n > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{n > 99 ? "99+" : n}</Text>
                      </View>
                    ) : it.external ? (
                      <Ionicons name="open-outline" size={14} color={c.secondary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: c.separator }]}>
        <Text style={[styles.user, { color: c.label }]} numberOfLines={1}>{user.name || user.login}</Text>
        <Text style={{ color: c.secondary, fontSize: 12.5 }}>{ROLE_LABEL[user.role]}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <Pressable onPress={toggleTheme} accessibilityRole="button" accessibilityLabel={mode === "dark" ? "Светлая тема" : "Тёмная тема"} style={[styles.small, { borderColor: c.separator }]}>
            <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} size={18} color={c.label} />
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert("Выйти из аккаунта?", undefined, [
                { text: "Отмена", style: "cancel" },
                {
                  text: "Выйти",
                  style: "destructive",
                  onPress: async () => {
                    await logout();
                    router.replace("/login");
                  },
                },
              ])
            }
            accessibilityRole="button"
            style={[styles.small, { borderColor: c.separator, flex: 1, flexDirection: "row", gap: 6 }]}
          >
            <Ionicons name="log-out-outline" size={18} color="#FF3B30" />
            <Text style={{ color: "#FF3B30", fontWeight: "600" }}>Выйти</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { width: 248, borderRightWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  brand: { paddingVertical: 20, paddingHorizontal: 6 },
  section: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, paddingHorizontal: 10, marginBottom: 4 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, height: 42, borderRadius: 12, paddingHorizontal: 10, marginBottom: 2 },
  label: { fontSize: 15, flex: 1 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: "#e82c87", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: "#fff", fontSize: 11.5, fontWeight: "800" },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 14, paddingHorizontal: 6 },
  user: { fontSize: 15, fontWeight: "700" },
  small: { height: 38, minWidth: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
});
