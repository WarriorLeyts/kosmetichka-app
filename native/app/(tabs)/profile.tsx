import { LoyaltyActions } from "@/components/LoyaltyActions";
import { useCallback, useState } from "react";
import { Platform, Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, applyCardState } from "@/store/auth";
import { useFavorites } from "@/store/favorites";
import { useWaitlistStore } from "@/store/waitlist";
import { iosText, useIOS } from "@/ios";
import { BrandHeader } from "@/components/iosui/BrandHeader";
import { useTabBarSpace, VIOLET_PINK } from "@/components/TabBar";
import { tap } from "@/components/ui";
import { FavHeart } from "@/components/FavHeart";
import { EmptyLoyaltyCard, LoyaltyCardPanel } from "@/components/LoyaltyCard";
import { Sheet, SheetOptions } from "@/components/iosui/Sheet";
import { RoleSheet } from "@/components/RoleSheet";
import { NotifySheet } from "@/components/NotifySheet";
import { useTheme, type ThemePref, colors } from "@/theme";
import { api } from "@/api";
import type { LoyaltyCard } from "@/loyalty";
import { RETAIL_ENABLED, SITE_RETAIL_DISCOUNT } from "@/siteMode";
import { useDesktop, DESKTOP_WIDE } from "@/useDesktop";
import { EmbeddedPane } from "@/embedded";
import EditProfile from "../edit-profile";
import Waitlist from "../waitlist";
import Favorites from "../favorites";
import Info from "../info";

type IconName = keyof typeof Ionicons.glyphMap;

// brand colors from the project
const PINK = "#e82c87";

const TIER: Record<string, string> = {
  retail: "Розничный покупатель",
  discount: "Постоянный клиент · скидка",
  wholesale: "Оптовый клиент",
  big_wholesale: "Крупный оптовый клиент",
};

type Pane = "data" | "waitlist" | "favorites" | "info";
type Item = { pane?: Pane; icon: IconName; title: string; pink?: boolean; fav?: boolean; count?: number; value?: string; needsAuth?: boolean; onPress: () => void };

/** Profile — iOS style: brand header, large title, one rounded menu block, gradient sign-in button. */
export default function Profile() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  // card width: screen minus page and panel paddings, not wider than 420
  const customer = useAuth((s) => s.customer);
  const { width: screenW } = useWindowDimensions();
  const cardW = Math.min(Math.min(screenW, 600) - 32 - 28, 420);
  // MAXMA card by phone: refreshed when the tab opens (the site caches it for a minute)
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  // «Добавить карту» only once the site's MAXMA connection is set up

  const customerId = customer?.id;
  const wholesale = customer?.priceType === "wholesale" || customer?.priceType === "big_wholesale";
  // the price type / data may have been changed by a manager meanwhile
  useFocusEffect(
    useCallback(() => {
      if (customerId) useAuth.getState().reloadCustomer();
    }, [customerId])
  );
  useFocusEffect(
    useCallback(() => {
      if (!customerId) {
        setCard(null);

        return;
      }
      let alive = true;
      const loadCard = () => api
        .loyalty()
        .then((r) => {
          if (!alive) return;
          const c = r.card;

          setCard(c ? { level: c.level, name: c.name, cashback: c.cashback, bonuses: c.bonuses, pendingBonuses: c.pendingBonuses, barcode: c.number, balanceUnavailable: c.balanceUnavailable } : null);
        })
        .catch(() => {
          /* keep what is shown; no card on a failed first load */
        });
      void loadCard();
      const timer = setInterval(() => {
        void useAuth.getState().reloadCustomer();
        void loadCard();
      }, 30_000);
      return () => {
        alive = false;
        clearInterval(timer);
      };
    }, [customerId])
  );
  const logout = useAuth((s) => s.logout);
  const themePref = useTheme((s) => s.pref);
  const setThemePref = useTheme((s) => s.setPref);
  const [themeOpen, setThemeOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const favCount = useFavorites((s) => s.items.length);
  const waitCount = useWaitlistStore((s) => s.ids.length);

  // computer: the menu on the left, the chosen section on the right (signed-in customers)
  const desktop = useDesktop();
  const split = desktop && !!customer;
  const [pane, setPane] = useState<Pane>("data");
  // signed-out users go to the login screen for account-only sections (existing behaviour of those screens)
  const go = (path: string, needsAuth?: boolean) => router.push(needsAuth && !customer ? "/login" : (path as never));
  const open = (p: Pane, path: string, needsAuth?: boolean) => (split ? setPane(p) : go(path, needsAuth));

  const items: Item[] = [
    { pane: "data", icon: "person-outline", title: "Мои данные", needsAuth: true, onPress: () => open("data", "/edit-profile", true) },
    ...(customer
      ? [{ icon: "pricetags-outline" as IconName, title: "Тип цен", value: PRICE_LABEL[customer.priceType ?? ""] ?? undefined, onPress: () => setRoleOpen(true) }]
      : []),
    ...(customer ? [{ icon: "notifications-outline" as IconName, title: "Уведомления", onPress: () => setNotifyOpen(true) }] : []),
    { icon: "cube-outline", title: "Мои заказы", needsAuth: true, onPress: () => (customer ? router.navigate("/orders") : router.push("/login")) },
    { pane: "waitlist", icon: "time-outline", title: "Лист ожидания", needsAuth: true, count: customer ? waitCount : 0, onPress: () => open("waitlist", "/waitlist", true) },
    { pane: "favorites", icon: "heart-outline", title: "Избранное", fav: true, count: favCount, onPress: () => open("favorites", "/favorites") },
    { pane: "info", icon: "document-text-outline", title: "Контакты и документы", onPress: () => open("info", "/info") },
    { icon: "contrast-outline", title: "Оформление", value: THEME_LABEL[themePref], onPress: () => setThemeOpen(true) },
  ];

  const name = customer ? customer.companyName || customer.name || customer.phone : null;

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <View style={split ? styles.deskRow : { flex: 1 }}>
      <ScrollView
        style={split ? styles.deskMenu : undefined}
        contentContainerStyle={
          split
            ? { paddingTop: 8, paddingBottom: 30 }
            : {
                paddingTop: insets.top,
                paddingBottom: bottomSpace,
                paddingHorizontal: 16,
                width: "100%",
                maxWidth: 600,
                alignSelf: "center",
              }
        }
        showsVerticalScrollIndicator={false}
      >
        <BrandHeader title="Профиль" />

        {/* signed-in: real account name from the server (no invented data) */}
        {customer && name ? (
          <Text style={[iosText.subhead, { color: c.secondary, marginTop: -6, marginBottom: 14 }]} numberOfLines={1}>
            {name} · {TIER[customer.priceType ?? ""] ?? "Покупатель"}
          </Text>
        ) : null}

        {/* loyalty card from MAXMA (by phone); customers without a card see nothing.
            Wholesale prices give no bonuses, so a wholesale customer sees no card (it shows after a switch to retail). */}
        {!(RETAIL_ENABLED || SITE_RETAIL_DISCOUNT) || wholesale ? null : customer && card ? (
          <LoyaltyCardPanel
            card={card}
            width={cardW}
            onUnlink={() => {
              const unlink = async () => {
                const current = useAuth.getState().customer;
                try {
                  await api.loyaltyUnlink();
                  setCard(null);
                  if (current) applyCardState(current.id, { hasCard: false, cardLinked: false, cardType: null });
                  await useAuth.getState().reloadCustomer();
                } catch (e) { Alert.alert("Не получилось", e instanceof Error ? e.message : ""); }
              };
              if (Platform.OS === "web") {
                if (window.confirm("Отвязать карту? Цены в корзине пересчитаются. Карту можно будет добавить снова вручную.")) void unlink();
              } else Alert.alert("Отвязать карту?", "Цены в корзине пересчитаются. Карту можно будет добавить снова вручную.", [
                { text: "Отмена", style: "cancel" },
                { text: "Отвязать", style: "destructive", onPress: () => void unlink() },
              ]);
            }}
          />
        ) : customer && !customer.hasCard && !customer.cardLinked ? (
          <EmptyLoyaltyCard width={cardW} onAdd={() => router.push("/loyalty-add")} />
        ) : null}

        {customer?.priceType === "retail" && !customer.hasCard && card ? <LoyaltyActions /> : null}

        {/* one rounded menu block */}
        <View style={[styles.block, { backgroundColor: c.cell }, !dark && styles.shadow]}>
          {items.map((it, i) => (
            <Pressable
              key={it.title}
              onPress={() => {
                tap();
                it.onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={it.title}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.cellPressed }, split && it.pane === pane && { backgroundColor: dark ? "rgba(139,61,255,0.22)" : "#F4EBFF" }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: it.pink ? "rgba(232,44,135,0.1)" : "rgba(139,61,255,0.1)" }]}>
                {it.fav ? <FavHeart size={21} /> : <Ionicons name={it.icon} size={21} color={it.pink ? PINK : colors.brand} />}
              </View>
              <Text style={[iosText.body, { color: c.label, flex: 1 }]} numberOfLines={1}>
                {it.title}
              </Text>
              {it.count ? <Text style={[iosText.body, { color: c.secondary }]}>{it.count}</Text> : null}
              {it.value ? <Text style={[iosText.body, { color: c.secondary }]}>{it.value}</Text> : null}
              <Ionicons name="chevron-forward" size={19} color={c.chevron} />
              {i < items.length - 1 ? <View style={[styles.sep, { backgroundColor: c.separator }]} /> : null}
            </Pressable>
          ))}
        </View>

        {/* sign in (guest) / sign out (signed-in, existing logic) */}
        {customer ? (
          <Pressable
            onPress={() => {
              tap();
              Alert.alert("Выйти из аккаунта?", undefined, [
                { text: "Отмена", style: "cancel" },
                { text: "Выйти", style: "destructive", onPress: () => logout() },
              ]);
            }}
            accessibilityRole="button"
            accessibilityLabel="Выйти из аккаунта"
            style={({ pressed }) => [styles.logout, { backgroundColor: c.cell }, !dark && styles.shadow, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="log-out-outline" size={21} color="#FF3B30" />
            <Text style={[iosText.body, { color: "#FF3B30", fontWeight: "600" }]}>Выйти</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              tap();
              router.push("/login");
            }}
            accessibilityRole="button"
            accessibilityLabel="Войти"
            style={({ pressed }) => [{ marginTop: 22, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
          >
            <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.login}>
              <Ionicons name="log-in-outline" size={22} color="#fff" />
              <Text style={styles.loginText}>Войти</Text>
            </LinearGradient>
          </Pressable>
        )}
      </ScrollView>
      {split ? (
        <View style={[styles.deskPane, { backgroundColor: c.cell }, !dark && styles.shadow]}>
          <EmbeddedPane.Provider value>
            {pane === "data" ? <EditProfile /> : pane === "waitlist" ? <Waitlist /> : pane === "favorites" ? <Favorites /> : <Info />}
          </EmbeddedPane.Provider>
        </View>
      ) : null}
      </View>
      <RoleSheet open={roleOpen} onClose={() => setRoleOpen(false)} />
      <NotifySheet open={notifyOpen} onClose={() => setNotifyOpen(false)} />
      <Sheet open={themeOpen} onClose={() => setThemeOpen(false)} title="Оформление">
        <SheetOptions
          options={THEME_OPTIONS}
          value={themePref}
          onSelect={(v) => {
            setThemeOpen(false);
            if (v !== themePref) setThemePref(v);
          }}
        />
      </Sheet>
    </View>
  );
}

const PRICE_LABEL: Record<string, string> = { retail: "Розница", discount: "Скидка по карте", wholesale: "Опт", big_wholesale: "Крупный опт" };
const THEME_LABEL: Record<ThemePref, string> = { system: "Как в телефоне", light: "Светлая", dark: "Тёмная" };
const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: "system", label: "Как в телефоне" },
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
];

const styles = StyleSheet.create({
  deskRow: { flex: 1, flexDirection: "row", gap: 24, width: "100%", maxWidth: DESKTOP_WIDE, alignSelf: "center", paddingHorizontal: 20 },
  deskMenu: { width: 360, flexGrow: 0 },
  deskPane: { flex: 1, borderRadius: 22, marginTop: 24, marginBottom: 24, paddingHorizontal: 12, overflow: "hidden" },
  block: { borderRadius: 20, overflow: "hidden" },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.07)" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 60, paddingHorizontal: 14 },
  iconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  sep: { position: "absolute", left: 66, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  login: {
    height: 52,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    boxShadow: "0 8px 20px rgba(139,61,255,0.35)",
  },
  loginText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  logout: { marginTop: 22, height: 54, borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
