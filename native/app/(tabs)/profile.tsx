import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, gradient, radius } from "@/theme";
import { useAuth } from "@/store/auth";
import { useFavorites } from "@/store/favorites";
import { useWaitlistStore } from "@/store/waitlist";
import { Button, tap } from "@/components/ui";
import { TAB_BAR_SPACE } from "@/components/TabBar";

const PRICE_LABELS: Record<string, string> = {
  retail: "Розница",
  discount: "Скидка",
  wholesale: "Опт",
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
          <View style={[styles.rowIcon, r.danger && { backgroundColor: colors.dangerBg }]}>
            <Ionicons name={r.icon} size={19} color={r.danger ? colors.danger : colors.violet} />
          </View>
          <Text style={[styles.rowText, r.danger && { color: colors.danger }]}>{r.label}</Text>
          {r.value ? <Text style={styles.rowValue}>{r.value}</Text> : null}
          {!r.danger && <Ionicons name="chevron-forward" size={18} color={colors.faint} />}
        </Pressable>
      ))}
    </View>
  );
}

export default function Profile() {
  const customer = useAuth((s) => s.customer);
  const logout = useAuth((s) => s.logout);
  const favCount = useFavorites((s) => s.items.length);
  const waitCount = useWaitlistStore((s) => s.ids.length);

  const common: Row[] = [
    { icon: "heart-outline", label: "Избранное", value: favCount ? String(favCount) : undefined, onPress: () => router.push("/favorites") },
    { icon: "call-outline", label: "Контакты и документы", onPress: () => router.push("/info") },
  ];

  if (!customer) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_SPACE }}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <Ionicons name="person-circle-outline" size={52} color="#fff" />
          <Text style={styles.name}>Добро пожаловать!</Text>
          <Text style={styles.sub}>Войдите, чтобы видеть оптовые цены, оформлять заказы и общаться с менеджером</Text>
        </LinearGradient>
        <Button title="Войти" icon="log-in-outline" onPress={() => router.push("/login")} style={{ marginTop: 16 }} />
        <Button title="Зарегистрироваться" variant="outline" onPress={() => router.push("/register")} style={{ marginTop: 10 }} />
        <Menu rows={common} />
      </ScrollView>
    );
  }

  const title = customer.companyName || customer.name || customer.phone || "Мой профиль";

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_SPACE }}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{title.trim().charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{title}</Text>
        {customer.companyName && customer.name ? <Text style={styles.sub}>{customer.name}</Text> : null}
        <View style={styles.tags}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{PRICE_LABELS[customer.priceType ?? ""] ?? "Покупатель"}</Text>
          </View>
          {customer.manager ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Менеджер: {customer.manager}</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <Menu
        rows={[
          { icon: "person-outline", label: "Мои данные", onPress: () => router.push("/edit-profile") },
          { icon: "receipt-outline", label: "Мои заказы", onPress: () => router.navigate("/orders") },
          { icon: "notifications-outline", label: "Лист ожидания", value: waitCount ? String(waitCount) : undefined, onPress: () => router.navigate("/waitlist") },
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
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: 22, alignItems: "flex-start" },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "900" },
  name: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 12 },
  sub: { color: "rgba(255,255,255,0.88)", fontSize: 14, marginTop: 4, lineHeight: 20 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  tag: { backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  menu: { backgroundColor: "#fff", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, marginTop: 16, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, minHeight: 56 },
  sep: { borderTopWidth: 1, borderTopColor: colors.soft },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.violetSoft, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  rowValue: { color: colors.muted, fontWeight: "700" },
});
