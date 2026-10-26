import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/store/auth";
import { useFavorites } from "@/store/favorites";
import { useWaitlistStore } from "@/store/waitlist";
import { iosText, useIOS } from "@/ios";
import { BrandHeader } from "@/components/iosui/BrandHeader";
import { useTabBarSpace, VIOLET_PINK } from "@/components/TabBar";
import { tap } from "@/components/ui";
import { FavHeart } from "@/components/FavHeart";
import { EmptyLoyaltyCard, LoyaltyCardPanel } from "@/components/LoyaltyCard";
import { Sheet, SheetOptions } from "@/components/iosui/Sheet";
import { useTheme, type ThemePref } from "@/theme";
import { api } from "@/api";
import type { LoyaltyCard } from "@/loyalty";

type IconName = keyof typeof Ionicons.glyphMap;

// brand colors from the project
const VIOLET = "#8b3dff";
const PINK = "#e82c87";

const TIER: Record<string, string> = {
  retail: "Розничный покупатель",
  discount: "Постоянный клиент · скидка",
  wholesale: "Оптовый клиент",
  big_wholesale: "Крупный оптовый клиент",
};

type Item = { icon: IconName; title: string; pink?: boolean; fav?: boolean; count?: number; value?: string; needsAuth?: boolean; onPress: () => void };

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
  const [canLink, setCanLink] = useState(false);
  const customerId = customer?.id;
  useFocusEffect(
    useCallback(() => {
      if (!customerId) {
        setCard(null);
        setCanLink(false);
        return;
      }
      let alive = true;
      api
        .loyalty()
        .then((r) => {
          if (!alive) return;
          const c = r.card;
          setCanLink(r.reason !== "not_configured");
          setCard(c ? { level: c.level, name: c.name, cashback: c.cashback, bonuses: c.bonuses, pendingBonuses: c.pendingBonuses, barcode: c.number } : null);
        })
        .catch(() => {
          /* keep what is shown; no card on a failed first load */
        });
      return () => {
        alive = false;
      };
    }, [customerId])
  );
  const logout = useAuth((s) => s.logout);
  const themePref = useTheme((s) => s.pref);
  const setThemePref = useTheme((s) => s.setPref);
  const [themeOpen, setThemeOpen] = useState(false);
  const favCount = useFavorites((s) => s.items.length);
  const waitCount = useWaitlistStore((s) => s.ids.length);

  // signed-out users go to the login screen for account-only sections (existing behaviour of those screens)
  const go = (path: string, needsAuth?: boolean) => router.push(needsAuth && !customer ? "/login" : (path as never));

  const items: Item[] = [
    { icon: "person-outline", title: "Мои данные", needsAuth: true, onPress: () => go("/edit-profile", true) },
    { icon: "cube-outline", title: "Мои заказы", needsAuth: true, onPress: () => (customer ? router.navigate("/orders") : router.push("/login")) },
    { icon: "time-outline", title: "Лист ожидания", needsAuth: true, count: customer ? waitCount : 0, onPress: () => go("/waitlist", true) },
    { icon: "heart-outline", title: "Избранное", fav: true, count: favCount, onPress: () => go("/favorites") },
    { icon: "document-text-outline", title: "Контакты и документы", onPress: () => go("/info") },
    { icon: "contrast-outline", title: "Оформление", value: THEME_LABEL[themePref], onPress: () => setThemeOpen(true) },
  ];

  const name = customer ? customer.companyName || customer.name || customer.phone : null;

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: bottomSpace,
          paddingHorizontal: 16,
          width: "100%",
          maxWidth: 600,
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <BrandHeader title="Профиль" />

        {/* signed-in: real account name from the server (no invented data) */}
        {customer && name ? (
          <Text style={[iosText.subhead, { color: c.secondary, marginTop: -6, marginBottom: 14 }]} numberOfLines={1}>
            {name} · {TIER[customer.priceType ?? ""] ?? "Покупатель"}
          </Text>
        ) : null}

        {/* loyalty card from MAXMA (by phone); customers without a card see nothing */}
        {customer && card ? (
          <LoyaltyCardPanel
            card={card}
            width={cardW}
            onUnlink={() =>
              Alert.alert("Отвязать карту?", "Её можно будет добавить снова по номеру телефона или карты.", [
                { text: "Отмена", style: "cancel" },
                {
                  text: "Отвязать",
                  style: "destructive",
                  onPress: () => {
                    api.loyaltyUnlink().then(() => setCard(null)).catch((e) => Alert.alert("Не получилось", e instanceof Error ? e.message : ""));
                  },
                },
              ])
            }
          />
        ) : customer && canLink ? (
          <EmptyLoyaltyCard width={cardW} onAdd={() => router.push("/loyalty-add")} />
        ) : null}

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
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.cellPressed }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: it.pink ? "rgba(232,44,135,0.1)" : "rgba(139,61,255,0.1)" }]}>
                {it.fav ? <FavHeart size={21} /> : <Ionicons name={it.icon} size={21} color={it.pink ? PINK : VIOLET} />}
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

const THEME_LABEL: Record<ThemePref, string> = { system: "Как в телефоне", light: "Светлая", dark: "Тёмная" };
const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: "system", label: "Как в телефоне" },
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
];

const styles = StyleSheet.create({
  block: { borderRadius: 20, overflow: "hidden" },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.07)" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 60, paddingHorizontal: 14 },
  iconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  sep: { position: "absolute", left: 66, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  login: {
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    boxShadow: "0 8px 20px rgba(139,61,255,0.35)",
  },
  loginText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  logout: { marginTop: 22, height: 54, borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
