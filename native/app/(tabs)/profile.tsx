import { Alert, ImageBackground, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, themed, useTheme } from "@/theme";
import { useAuth } from "@/store/auth";
import { useFavorites } from "@/store/favorites";
import { useWaitlistStore } from "@/store/waitlist";
import { LOGO } from "@/components/PageTitle";
import { Button, tap } from "@/components/ui";

// Design sources: «Косметичка — исходники экрана Профиль» (palette.json, web/style.css)
const SCREEN_BG = require("../../assets/profile/screen_bg.jpg");
const CARD_BG = require("../../assets/profile/card_bg.png");
const CARD_ART = require("../../assets/profile/card_art.png");

const TIER: Record<string, { label: string; pill: string }> = {
  retail: { label: "Розничный покупатель", pill: "Розница" },
  discount: { label: "Постоянный клиент", pill: "Скидка" },
  wholesale: { label: "Оптовый клиент", pill: "Опт" },
  big_wholesale: { label: "Крупный оптовый клиент", pill: "Крупный опт" },
};

type IconName = keyof typeof Ionicons.glyphMap;
type Row = { icon: IconName; title: string; sub: string; badge?: number; onPress: () => void };

function Chevron({ red }: { red?: boolean }) {
  return (
    <View style={[styles.chev, red && { borderColor: "rgba(255,39,107,0.35)" }]}>
      <Ionicons name="chevron-forward" size={18} color={red ? "#ff377f" : "#fff6fd"} />
    </View>
  );
}

function MenuPanel({ rows }: { rows: Row[] }) {
  return (
    <LinearGradient colors={[colors.card2, colors.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.menu}>
      {rows.map((r, i) => (
        <Pressable
          key={r.title}
          onPress={() => { tap(); r.onPress(); }}
          style={({ pressed }) => [styles.item, i < rows.length - 1 && styles.itemSep, pressed && { opacity: 0.75 }]}
        >
          <View style={styles.iconbox}>
            <Ionicons name={r.icon} size={25} color={colors.pinkLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{r.title}</Text>
            <Text style={styles.itemSub} numberOfLines={1}>{r.sub}</Text>
          </View>
          {r.badge ? (
            <View style={styles.count}>
              <Text style={styles.countText}>{r.badge}</Text>
            </View>
          ) : null}
          <Chevron />
        </Pressable>
      ))}
    </LinearGradient>
  );
}

export default function Profile() {
  const insets = useSafeAreaInsets();
  const dark = useTheme((s) => s.mode) === "dark";
  const customer = useAuth((s) => s.customer);
  const logout = useAuth((s) => s.logout);
  const favCount = useFavorites((s) => s.items.length);
  const waitCount = useWaitlistStore((s) => s.ids.length);

  const name = customer ? customer.companyName || customer.name || customer.phone || "Мой профиль" : "Добро пожаловать!";
  const tier = TIER[customer?.priceType ?? ""] ?? { label: "Покупатель", pill: "Клиент" };

  const rows: Row[] = customer
    ? [
        { icon: "person-outline", title: "Мои данные", sub: "Личные данные, адрес, пароль", onPress: () => router.push("/edit-profile") },
        { icon: "receipt-outline", title: "Мои заказы", sub: "История заказов, статусы, повторить заказ", onPress: () => router.navigate("/orders") },
        { icon: "notifications-outline", title: "Лист ожидания", sub: "Товары, которые вы ожидаете", badge: waitCount || undefined, onPress: () => router.push("/waitlist") },
        { icon: "heart-outline", title: "Избранное", sub: "Сохранённые товары", badge: favCount || undefined, onPress: () => router.push("/favorites") },
        { icon: "storefront-outline", title: "Наши магазины", sub: "Адреса и часы работы", onPress: () => router.push("/stores") },
        { icon: "call-outline", title: "Контакты и документы", sub: "Телефоны, email, реквизиты, документы", onPress: () => router.push("/info") },
      ]
    : [
        { icon: "heart-outline", title: "Избранное", sub: "Сохранённые товары", badge: favCount || undefined, onPress: () => router.push("/favorites") },
        { icon: "storefront-outline", title: "Наши магазины", sub: "Адреса и часы работы", onPress: () => router.push("/stores") },
        { icon: "call-outline", title: "Контакты и документы", sub: "Телефоны, email, реквизиты, документы", onPress: () => router.push("/info") },
      ];

  const body = (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 17, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
      {/* header: logo + serif title + subheading (no settings button) */}
      <View style={styles.header}>
        <Image source={LOGO} style={{ width: 52, height: 52 }} contentFit="contain" />
        <View>
          <Text style={styles.heading}>Профиль</Text>
          <Text style={styles.subheading}>КОСМЕТИКА И ПАРФЮМЕРИЯ</Text>
        </View>
      </View>

      {/* client card */}
      <ImageBackground source={CARD_BG} resizeMode="cover" style={styles.client} imageStyle={{ borderRadius: 27 }}>
        <Image source={CARD_ART} style={styles.art} contentFit="contain" />
        <View style={styles.topRow}>
          <View style={styles.avatar}>
            {customer ? (
              <Text style={styles.avatarText}>{name.trim().charAt(0).toUpperCase()}</Text>
            ) : (
              <Ionicons name="person-outline" size={32} color="#fff6fd" />
            )}
          </View>
          <View style={{ flex: 1, paddingRight: 110 }}>
            <Text style={styles.name} numberOfLines={2}>{name}</Text>
            <Text style={styles.tierText} numberOfLines={2}>
              {customer ? tier.label : "Войдите, чтобы видеть свои цены и заказы"}
            </Text>
          </View>
        </View>
        {customer ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{tier.pill}</Text>
          </View>
        ) : null}
        {customer?.manager ? <Text style={styles.manager}>Ваш менеджер: {customer.manager}</Text> : null}

        {/* bonus panel — MAXMA integration later; no fake amount */}
        {customer ? (
          <View style={styles.balance}>
            <View style={styles.gift}>
              <Ionicons name="gift-outline" size={29} color="#ffd6f0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>Бонусный баланс</Text>
              <Text style={styles.balanceValue}>Скоро</Text>
            </View>
            <Chevron />
          </View>
        ) : (
          <View style={{ marginTop: 18, gap: 10 }}>
            <Button title="Войти" onPress={() => router.push("/login")} />
            <Button title="Зарегистрироваться" variant="outline" onPress={() => router.push("/register")} />
          </View>
        )}
      </ImageBackground>

      <MenuPanel rows={rows} />

      {customer ? (
        <Pressable
          onPress={() => {
            tap();
            Alert.alert("Выйти из аккаунта?", undefined, [
              { text: "Отмена", style: "cancel" },
              { text: "Выйти", style: "destructive", onPress: () => logout() },
            ]);
          }}
          style={({ pressed }) => [pressed && { opacity: 0.8 }]}
        >
          <LinearGradient colors={["#4e0a30", "#520d39"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.logout}>
            <View style={[styles.iconbox, styles.logoutIcon]}>
              <Ionicons name="log-out-outline" size={25} color="#ff377f" />
            </View>
            <Text style={styles.logoutText}>Выйти</Text>
            <Chevron red />
          </LinearGradient>
        </Pressable>
      ) : null}
    </ScrollView>
  );

  // dark theme = exactly the mockup (photo background); light theme keeps the same layout on the light palette
  return dark ? (
    <ImageBackground source={SCREEN_BG} resizeMode="cover" style={{ flex: 1, backgroundColor: "#130517" }}>
      {body}
    </ImageBackground>
  ) : (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>{body}</View>
  );
}

const styles = themed(() => ({
  header: { flexDirection: "row", alignItems: "center", gap: 13, marginBottom: 22 },
  heading: { fontFamily: fonts.serif, fontSize: 38, lineHeight: 42, color: colors.text },
  subheading: { fontSize: 9, letterSpacing: 3, color: colors.muted, marginTop: 2 },
  client: {
    borderWidth: 1,
    borderColor: "#c02682",
    borderRadius: 27,
    paddingTop: 22,
    paddingHorizontal: 17,
    paddingBottom: 17,
    backgroundColor: "#4f0c39",
    overflow: "hidden",
  },
  art: { position: "absolute", right: -2, top: -12, width: 210, height: 202 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1,
    borderColor: "#e168b9",
    backgroundColor: "rgba(177,43,138,0.44)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ff6ac0",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  avatarText: { fontFamily: fonts.serif, fontSize: 36, color: "#fff6fd" },
  name: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 33, color: "#fff6fd" },
  tierText: { color: "#f2d4ea", fontSize: 14.5, marginTop: 4 },
  pill: {
    alignSelf: "flex-start",
    marginTop: 12,
    backgroundColor: "#a41970",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 7,
  },
  pillText: { color: "#fff6fd", fontSize: 14, fontWeight: "700" },
  manager: { color: "#f2d4ea", fontSize: 12.5, marginTop: 10 },
  balance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e05ba4",
    borderRadius: 20,
    backgroundColor: "rgba(91,18,80,0.85)",
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  gift: { width: 56, height: 56, borderRadius: 16, backgroundColor: "#9c0c72", alignItems: "center", justifyContent: "center" },
  balanceLabel: { color: "#d6a4ce", fontSize: 13 },
  balanceValue: { color: "#fff6fd", fontSize: 24, fontWeight: "700", marginTop: 1 },
  chev: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(165,42,127,0.6)",
    backgroundColor: "rgba(85,18,61,0.56)",
    alignItems: "center",
    justifyContent: "center",
  },
  menu: { marginTop: 17, paddingHorizontal: 16, paddingVertical: 4, borderWidth: 1, borderColor: "#9d286d", borderRadius: 25 },
  item: { flexDirection: "row", alignItems: "center", gap: 16, minHeight: 82 },
  itemSep: { borderBottomWidth: 1, borderBottomColor: colors.border },
  iconbox: {
    width: 49,
    height: 49,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#8f1b67",
    backgroundColor: colors.violetSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: "600" },
  itemSub: { color: colors.muted, fontSize: 12, marginTop: 3 },
  count: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.pink, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  countText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  logout: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#de2c70",
    borderRadius: 22,
  },
  logoutIcon: { borderColor: "#ae1d55", backgroundColor: "rgba(174,29,85,0.25)" },
  logoutText: { flex: 1, color: "#ff377f", fontSize: 17, fontWeight: "700" },
}));
