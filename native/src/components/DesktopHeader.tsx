import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Wordmark } from "@/components/Wordmark";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { useNotifications } from "@/store/notifications";
import { useCatalog } from "@/store/catalog";
import { cartPriceTier, rawCartTotal } from "@/pricing";
import { money } from "@/format";
import { useIOS } from "@/ios";
import { useTheme } from "@/theme";
import { DESKTOP_MAX_CONTENT } from "@/useDesktop";

const VIOLET = "#8b3dff";
const PINK = "#e82c87";
type IconName = keyof typeof Ionicons.glyphMap;
/** react-native-web adds `hovered` to the pressable state */
type Hover = { hovered?: boolean; pressed: boolean };

const NAV: { href: string; label: string; match: (p: string) => boolean }[] = [
  { href: "/", label: "Главная", match: (p) => p === "/" },
  { href: "/catalog", label: "Каталог", match: (p) => p.startsWith("/catalog") || p.startsWith("/product") },
  { href: "/orders", label: "Заказы", match: (p) => p.startsWith("/orders") || p.startsWith("/order/") },
];

function IconBtn({ icon, label, badge, onPress, active }: { icon: IconName; label: string; badge?: number; onPress: () => void; active?: boolean }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}: ${badge}` : label}
      style={({ hovered, pressed }: Hover) => [
        styles.icon,
        { backgroundColor: active ? "rgba(139,61,255,0.14)" : hovered ? (dark ? "rgba(255,255,255,0.08)" : "rgba(139,61,255,0.08)") : "transparent" },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Ionicons name={icon} size={23} color={active ? VIOLET : c.label} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Website on a computer: one top bar instead of the phone's bottom tabs — logo, sections,
 * search, notifications, favourites, cart with the sum, profile. Same colours as the app.
 */
export function DesktopHeader() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const path = usePathname();
  const customer = useAuth((s) => s.customer);
  const cart = useCartStore((s) => s.items);
  const favCount = useFavorites((s) => s.items.length);
  const unread = useNotifications((s) => s.unread);
  const toggleTheme = useTheme((s) => s.toggle);
  const [q, setQ] = useState("");

  const count = cart.reduce((n, i) => n + i.quantity, 0);
  const total = rawCartTotal(cart, cartPriceTier(cart, customer));

  const search = () => {
    const s = q.trim();
    useCatalog.getState().reset();
    useCatalog.getState().set({ search: s });
    router.navigate("/catalog");
  };

  return (
    <View style={[styles.bar, { backgroundColor: dark ? "rgba(23,13,37,0.92)" : "rgba(255,255,255,0.92)", borderBottomColor: c.separator }]}>
      <View style={styles.inner}>
        <Pressable onPress={() => router.navigate("/")} accessibilityRole="link" accessibilityLabel="Косметичка — на главную" style={{ marginRight: 28 }}>
          <Wordmark size={19} />
        </Pressable>

        <View style={styles.nav}>
          {NAV.map((n) => {
            const on = n.match(path);
            return (
              <Pressable
                key={n.href}
                onPress={() => router.navigate(n.href as never)}
                accessibilityRole="link"
                style={({ hovered }: Hover) => [styles.navItem, on && { backgroundColor: "rgba(139,61,255,0.12)" }, hovered && !on && { backgroundColor: dark ? "rgba(255,255,255,0.06)" : "rgba(139,61,255,0.06)" }]}
              >
                <Text style={[styles.navText, { color: on ? VIOLET : c.label, fontWeight: on ? "700" : "500" }]}>{n.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.search, { backgroundColor: dark ? "rgba(255,255,255,0.08)" : "#F3EEFA" }]}>
          <Ionicons name="search-outline" size={19} color={dark ? "#C3AECF" : "#8A7CA6"} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={search}
            placeholder="Название, бренд, артикул"
            placeholderTextColor={dark ? "#9C88AE" : "#8A7CA6"}
            returnKeyType="search"
            style={[styles.searchInput, { color: c.label }]}
            accessibilityLabel="Поиск товаров"
          />
        </View>

        <View style={styles.actions}>
          <IconBtn icon={dark ? "sunny-outline" : "moon-outline"} label={dark ? "Светлая тема" : "Тёмная тема"} onPress={toggleTheme} />
          {customer ? (
            <IconBtn icon="notifications-outline" label="Уведомления" badge={unread} active={path.startsWith("/notifications")} onPress={() => router.navigate("/notifications")} />
          ) : null}
          <IconBtn icon="heart-outline" label="Избранное" badge={favCount} active={path.startsWith("/favorites")} onPress={() => router.navigate("/favorites")} />
          <Pressable
            onPress={() => router.navigate("/cart")}
            accessibilityRole="button"
            accessibilityLabel={`Корзина: ${count}`}
            style={({ hovered }: Hover) => [styles.cart, { opacity: hovered ? 0.92 : 1 }]}
          >
            <Ionicons name="bag-outline" size={20} color="#fff" />
            <Text style={styles.cartText}>{count > 0 ? money(total) : "Корзина"}</Text>
            {count > 0 ? (
              <View style={styles.cartCount}>
                <Text style={styles.cartCountText}>{count > 99 ? "99+" : count}</Text>
              </View>
            ) : null}
          </Pressable>
          <IconBtn
            icon={customer ? "person-circle-outline" : "log-in-outline"}
            label={customer ? "Профиль" : "Войти"}
            active={path.startsWith("/profile")}
            onPress={() => router.navigate(customer ? "/profile" : "/login")}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 72, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: "center", zIndex: 10 },
  inner: { width: "100%", maxWidth: DESKTOP_MAX_CONTENT, alignSelf: "center", paddingHorizontal: 24, flexDirection: "row", alignItems: "center" },
  nav: { flexDirection: "row", gap: 4, marginRight: 20 },
  navItem: { paddingHorizontal: 14, height: 40, borderRadius: 20, justifyContent: "center" },
  navText: { fontSize: 16 },
  search: { flex: 1, height: 44, borderRadius: 22, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, maxWidth: 460 },
  searchInput: { flex: 1, fontSize: 15, height: 44, outlineStyle: "none" } as object,
  actions: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto", paddingLeft: 16 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 4, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: PINK, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  cart: { flexDirection: "row", alignItems: "center", gap: 8, height: 44, borderRadius: 22, paddingHorizontal: 16, backgroundColor: VIOLET, marginHorizontal: 4 },
  cartText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cartCount: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  cartCountText: { color: VIOLET, fontSize: 12, fontWeight: "700" },
});
