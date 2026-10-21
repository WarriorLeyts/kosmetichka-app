import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, themed, useTheme } from "@/theme";
import { useAuth } from "@/store/auth";
import { useFavorites } from "@/store/favorites";
import { useWaitlistStore } from "@/store/waitlist";
import { Silk } from "@/components/Silk";
import { LOGO } from "@/components/PageTitle";
import { Button, tap } from "@/components/ui";

const PRICE_LABELS: Record<string, string> = {
  retail: "Розничный покупатель",
  discount: "Постоянный клиент",
  wholesale: "Оптовый клиент",
  big_wholesale: "Крупный опт",
};

type Row = { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress: () => void; danger?: boolean };

function Menu({ rows }: { rows: Row[] }) {
  return (
    <View style={styles.menu}>
      {rows.map((r, i) => (
        <Pressable
          key={r.label}
          onPress={() => { tap(); r.onPress(); }}
          style={({ pressed }) => [styles.row, i > 0 && styles.sep, pressed && { backgroundColor: colors.soft }]}
        >
          <Ionicons name={r.icon} size={20} color={r.danger ? colors.danger : colors.text} />
          <Text style={[styles.rowText, r.danger && { color: colors.danger }]}>{r.label}</Text>
          {r.value ? <Text style={styles.rowValue}>{r.value}</Text> : null}
          {!r.danger && <Ionicons name="chevron-forward" size={18} color={colors.faint} />}
        </Pressable>
      ))}
    </View>
  );
}

export default function Profile() {
  const insets = useSafeAreaInsets();
  const customer = useAuth((s) => s.customer);
  const logout = useAuth((s) => s.logout);
  const favCount = useFavorites((s) => s.items.length);
  const waitCount = useWaitlistStore((s) => s.ids.length);
  const mode = useTheme((s) => s.mode);
  const toggleTheme = useTheme((s) => s.toggle);

  const common: Row[] = [
    { icon: "heart-outline", label: "Избранное", value: favCount ? String(favCount) : undefined, onPress: () => router.push("/favorites") },
    { icon: "storefront-outline", label: "Наши магазины", onPress: () => router.push("/stores") },
    { icon: "call-outline", label: "Контакты и документы", onPress: () => router.push("/info") },
    { icon: mode === "dark" ? "sunny-outline" : "moon-outline", label: mode === "dark" ? "Светлая тема" : "Тёмная тема", onPress: toggleTheme },
  ];

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <Image source={LOGO} style={{ width: 30, height: 30 }} contentFit="contain" />
      <Text style={styles.title}>Профиль</Text>
    </View>
  );

  if (!customer) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {header}
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4 }}>
          <View style={styles.card}>
            <Silk />
            <Ionicons name="person-circle-outline" size={52} color="#fff" />
            <Text style={styles.name}>Добро пожаловать!</Text>
            <Text style={styles.sub}>Войдите, чтобы видеть оптовые цены, оформлять заказы и общаться с менеджером</Text>
          </View>
          <Button title="Войти" onPress={() => router.push("/login")} style={{ marginTop: 16 }} />
          <Button title="Зарегистрироваться" variant="outline" onPress={() => router.push("/register")} style={{ marginTop: 10 }} />
          <Menu rows={common} />
        </ScrollView>
      </View>
    );
  }

  const title = customer.companyName || customer.name || customer.phone || "Мой профиль";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 32 }}>
        <View style={styles.card}>
          <Silk />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{title.trim().charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{title}</Text>
              <Text style={styles.sub}>{PRICE_LABELS[customer.priceType ?? ""] ?? "Покупатель"}</Text>
            </View>
          </View>
          {customer.manager ? (
            <View style={styles.manager}>
              <Ionicons name="person-outline" size={14} color="#fff" />
              <Text style={styles.managerText}>Ваш менеджер: {customer.manager}</Text>
            </View>
          ) : null}
        </View>

        <Menu
          rows={[
            { icon: "person-outline", label: "Мои данные", onPress: () => router.push("/edit-profile") },
            { icon: "receipt-outline", label: "Мои заказы", onPress: () => router.navigate("/orders") },
            { icon: "notifications-outline", label: "Лист ожидания", value: waitCount ? String(waitCount) : undefined, onPress: () => router.push("/waitlist") },
            ...common,
          ]}
        />

        <Menu
          rows={[
            {
              icon: "log-out-outline",
              label: "Выйти",
              danger: true,
              onPress: () =>
                Alert.alert("Выйти из аккаунта?", undefined, [
                  { text: "Отмена", style: "cancel" },
                  { text: "Выйти", style: "destructive", onPress: () => logout() },
                ]),
            },
          ]}
        />
      </ScrollView>
    </View>
  );
}

const styles = themed(() => ({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  card: { borderRadius: 22, padding: 20, overflow: "hidden", minHeight: 130, justifyContent: "center" },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "800" },
  name: { color: "#fff", fontSize: 19, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 3, lineHeight: 18 },
  manager: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  managerText: { color: "#fff", fontSize: 12.5, fontWeight: "600" },
  menu: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, marginTop: 16, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, minHeight: 54 },
  sep: { borderTopWidth: 1, borderTopColor: colors.border },
  rowText: { flex: 1, fontSize: 15, color: colors.text },
  rowValue: { color: colors.muted, fontWeight: "600" },
}));
