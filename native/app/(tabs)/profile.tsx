import { Alert, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { Glass } from "@/components/Glass";

// Design sources: «Косметичка — исходники экрана Профиль» (palette.json, web/style.css)
const SCREEN_BG = require("../../assets/profile/screen_bg.jpg");
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
    <Glass
      radius={16}
      gloss={0.16}
      fill={red ? ["rgba(110,14,52,0.55)", "rgba(60,8,32,0.6)"] : ["rgba(90,24,78,0.6)", "rgba(52,12,46,0.6)"]}
      rim={red ? "rgba(255,55,127,0.45)" : "rgba(190,80,160,0.4)"}
      glow="rgba(0,0,0,0)"
      style={styles.chev}
    >
      <Ionicons name="chevron-forward" size={15} color={red ? "#ff377f" : "#fff6fd"} />
    </Glass>
  );
}

function IconBox({ name, red }: { name: IconName; red?: boolean }) {
  return (
    <Glass
      radius={11}
      gloss={0.18}
      fill={red ? ["rgba(150,20,70,0.55)", "rgba(80,10,40,0.6)"] : ["rgba(128,18,88,0.75)", "rgba(80,10,58,0.75)"]}
      rim={red ? "rgba(255,55,127,0.7)" : "rgba(214,70,160,0.75)"}
      glow={red ? "rgba(255,39,107,0.35)" : "rgba(255,44,167,0.3)"}
      style={styles.iconbox}
    >
      <Ionicons name={name} size={19} color={red ? "#ff377f" : "#ffc6ec"} />
    </Glass>
  );
}

function MenuPanel({ rows }: { rows: Row[] }) {
  return (
    <Glass radius={22} fill={["rgba(58,24,56,0.72)", "rgba(36,8,32,0.78)"]} rim="rgba(160,50,125,0.75)" glow="rgba(255,44,167,0.22)" gloss={0.08} style={styles.menu}>
      {rows.map((r, i) => (
        <Pressable
          key={r.title}
          onPress={() => { tap(); r.onPress(); }}
          style={({ pressed }) => [styles.item, i < rows.length - 1 && styles.itemSep, pressed && { opacity: 0.75 }]}
        >
          <IconBox name={r.icon} />
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
    </Glass>
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
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 26 }} showsVerticalScrollIndicator={false}>
      {/* header: logo + serif title + subheading (no settings button) */}
      <View style={styles.header}>
        <Image source={LOGO} style={{ width: 44, height: 44 }} contentFit="contain" />
        <View>
          <Text style={styles.heading}>Профиль</Text>
          <Text style={styles.subheading}>КОСМЕТИКА И ПАРФЮМЕРИЯ</Text>
        </View>
      </View>

      {/* client card */}
      <Glass radius={24} fill={["rgba(114,12,72,0.78)", "rgba(62,10,46,0.82)", "rgba(46,5,40,0.86)"]} rim="#cd2a8b" glow="rgba(255,44,167,0.45)" gloss={0.12} style={styles.client}>
        <Image source={CARD_ART} style={styles.art} contentFit="contain" />
        <View style={styles.topRow}>
          <View style={styles.avatar}>
            {customer ? (
              <Text style={styles.avatarText}>{name.trim().charAt(0).toUpperCase()}</Text>
            ) : (
              <Ionicons name="person-outline" size={28} color="#fff6fd" />
            )}
          </View>
          <View style={{ flex: 1, paddingRight: 96 }}>
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
          <Glass radius={17} fill={["rgba(110,24,90,0.62)", "rgba(74,14,57,0.7)"]} rim="rgba(224,91,164,0.8)" glow="rgba(255,44,167,0.3)" gloss={0.14} style={styles.balance}>
            <Glass radius={13} fill={["#a0186e", "#801258"]} rim="rgba(255,120,200,0.6)" glow="rgba(255,44,167,0.45)" gloss={0.2} style={styles.gift}>
              <Ionicons name="gift-outline" size={23} color="#ffd6f0" />
            </Glass>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>Бонусный баланс</Text>
              <Text style={styles.balanceValue}>Скоро</Text>
            </View>
            <Chevron />
          </Glass>
        ) : (
          <View style={{ marginTop: 18, gap: 10 }}>
            <Button title="Войти" onPress={() => router.push("/login")} />
            <Button title="Зарегистрироваться" variant="outline" onPress={() => router.push("/register")} />
          </View>
        )}
      </Glass>

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
          <Glass radius={20} fill={["rgba(78,10,48,0.75)", "rgba(41,8,29,0.8)"]} rim="rgba(222,44,112,0.85)" glow="rgba(255,39,107,0.35)" gloss={0.1} style={styles.logout}>
            <IconBox name="log-out-outline" red />
            <Text style={styles.logoutText}>Выйти</Text>
            <Chevron red />
          </Glass>
        </Pressable>
      ) : null}
    </ScrollView>
  );

  // dark theme = exactly the mockup (photo background); light theme keeps the same layout on the light palette
  return dark ? (
    <ImageBackground source={SCREEN_BG} resizeMode="cover" style={{ flex: 1, backgroundColor: "#1a041b" }}>
      <LinearGradient
        colors={["rgba(26,4,27,0.82)", "rgba(20,3,21,0.78)", "rgba(26,4,27,0.7)"]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {body}
    </ImageBackground>
  ) : (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>{body}</View>
  );
}

const styles = themed(() => ({
  header: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 16 },
  heading: { fontFamily: fonts.serif, fontSize: 31, lineHeight: 34, color: colors.text },
  subheading: { fontSize: 8, letterSpacing: 2.6, color: colors.muted, marginTop: 1 },
  client: { paddingTop: 16, paddingHorizontal: 14, paddingBottom: 14 },
  cardGlow: {
    position: "absolute",
    right: -40,
    top: -30,
    width: 220,
    height: 200,
    borderRadius: 110,
    backgroundColor: "rgba(255,44,167,0.16)",
  },
  art: { position: "absolute", right: -4, top: -10, width: 172, height: 166 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: "#e168b9",
    backgroundColor: "rgba(177,43,138,0.35)",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 14px rgba(255,106,192,0.45)",
  },
  avatarText: { fontFamily: fonts.serif, fontSize: 30, color: "#fff6fd" },
  name: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 29, color: "#fff6fd" },
  tierText: { color: "#e7c3de", fontSize: 13, marginTop: 3 },
  pill: {
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: "#a41970",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 5,
    boxShadow: "0 0 10px rgba(255,44,167,0.35)",
  },
  pillText: { color: "#fff6fd", fontSize: 12.5, fontWeight: "700" },
  manager: { color: "#e7c3de", fontSize: 11.5, marginTop: 8 },
  balance: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: 13, paddingVertical: 9, paddingHorizontal: 10 },
  gift: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  balanceLabel: { color: "#d6a4ce", fontSize: 11.5 },
  balanceValue: { color: "#fff6fd", fontSize: 20, fontWeight: "700", marginTop: 1 },
  chev: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  menu: { marginTop: 14, paddingHorizontal: 13 },
  item: { flexDirection: "row", alignItems: "center", gap: 13, minHeight: 64 },
  itemSep: { borderBottomWidth: 1, borderBottomColor: "rgba(120,40,95,0.55)" },
  iconbox: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  itemTitle: { color: colors.text, fontSize: 14.5, fontWeight: "600" },
  itemSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  count: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.pink, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  countText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  logout: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 9, paddingHorizontal: 13 },
  logoutText: { flex: 1, color: "#ff377f", fontSize: 15.5, fontWeight: "700" },
}));
