import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/api";
import { colors, themed } from "@/theme";
import { date, money } from "@/format";
import { useAuth } from "@/store/auth";
import { orderCache } from "@/orderCache";
import { Badge, Empty, ErrorView, Loading, tap } from "@/components/ui";
import { GradientText } from "@/components/GradientText";
import { LoginRequired } from "@/components/LoginRequired";
import { PageTitle } from "@/components/PageTitle";
import { STATUS_COLORS, STATUS_ICONS, STATUS_LABELS, type Order, type OrdersPage } from "@/types";

// Tailwind colors used by the site's orders page
const T = {
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate700: "#334155",
  slate800: "#1e293b",
  pink500: "#ec4899",
  purple500: "#a855f7",
  blue600: "#2563eb",
  blue700: "#1d4ed8",
};

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Все" },
  { key: "pending", label: "Ожидают" },
  { key: "assembly", label: "Сборка" },
  { key: "consultation", label: "Консультация" },
  { key: "payment", label: "К оплате" },
  { key: "exported", label: "Выполнены" },
  { key: "cancelled", label: "Отменены" },
];

/** One order — same look as the site's OrderCard; tap opens the order with chat. */
function OrderCard({ order, unread }: { order: Order; unread: boolean }) {
  const c = STATUS_COLORS[order.status] ?? { fg: colors.muted, bg: colors.soft, border: colors.border };
  const needsConfirm = order.status === "consultation" && !order.customerConfirmed;
  const confirmed = order.status === "consultation" && order.customerConfirmed;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => {
          tap();
          router.push(`/order/${order.id}`);
        }}
        style={({ pressed }) => [styles.cardHead, pressed && { backgroundColor: colors.soft }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
          <LinearGradient colors={[colors.pinkSoft, colors.violetSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}>
            <Text style={{ fontSize: 20 }}>{STATUS_ICONS[order.status] ?? "📦"}</Text>
          </LinearGradient>
          <View style={{ gap: 2, flexShrink: 1 }}>
            <Text style={styles.num}>Заказ №{order.id}</Text>
            <Text style={styles.meta}>
              {date(order.createdAt)} · {money(order.total)}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {unread && <Ionicons name="chatbubble-ellipses" size={16} color={T.pink500} />}
          <Badge text={STATUS_LABELS[order.status] ?? order.status} fg={c.fg} bg={c.bg} border={c.border} />
          <Text style={{ color: colors.faint, fontSize: 12 }}>▼</Text>
        </View>
      </Pressable>

      {needsConfirm && (
        <Pressable onPress={() => router.push(`/order/${order.id}`)} style={[styles.note, { backgroundColor: "#fff7ed", borderColor: "#fed7aa" }]}>
          <Text style={{ color: "#9a3412", fontSize: 14, fontWeight: "600" }}>
            Менеджер изменил заказ. Проверьте и подтвердите изменения →
          </Text>
        </Pressable>
      )}
      {confirmed && (
        <View style={[styles.note, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
          <Text style={{ color: "#15803d", fontSize: 14 }}>✓ Вы подтвердили изменения</Text>
        </View>
      )}

    </View>
  );
}

export default function Orders() {
  const insets = useSafeAreaInsets();
  const customer = useAuth((s) => s.customer);
  const [status, setStatus] = useState("");
  const [data, setData] = useState<OrdersPage | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState<Set<number>>(new Set());

  const load = useCallback(
    async (page: number, mode: "replace" | "append" | "refresh") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const r = await api.orders(page, status);
        r.orders.forEach((o) => orderCache.set(o.id, o));
        setData(r);
        setOrders((prev) => (mode === "append" ? [...prev, ...r.orders] : r.orders));
        api
          .orderStatus()
          .then((s) => setUnread(new Set(s.managerMessages.map((m) => m.orderId))))
          .catch(() => {});
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status]
  );

  useEffect(() => {
    if (customer) load(1, "replace");
  }, [customer, load]);

  useFocusEffect(
    useCallback(() => {
      if (customer && data) load(1, "refresh");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer])
  );

  const bg = (child: ReactNode) => (
    <LinearGradient colors={colors.pageGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      {child}
    </LinearGradient>
  );

  if (!customer) return bg(<LoginRequired text="Здесь появится история ваших заказов и переписка с менеджером" />);
  if (error && orders.length === 0) return bg(<ErrorView message={error} onRetry={() => load(1, "replace")} />);
  if (!data && loading) return bg(<Loading />);

  const stats = data?.stats;

  return bg(
    <FlatList
      data={orders}
      keyExtractor={(o) => String(o.id)}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 32, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, "refresh")} tintColor={T.purple500} />}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (!loading && data && data.page < data.totalPages) load(data.page + 1, "append");
      }}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <PageTitle title="Мои заказы" colors={[T.pink500, T.purple500, T.blue700]} />

          {stats && stats.totalOrders > 0 && (
            <View style={styles.statsGrid}>
              <View style={[styles.stat, { shadowColor: "#ec4899" }]}>
                <Text style={styles.statLabel}>🛒 Заказов</Text>
                <GradientText style={styles.statValueBig} colors={[T.pink500, T.purple500]}>{stats.totalOrders}</GradientText>
              </View>
              <View style={[styles.stat, { shadowColor: "#8b5cf6" }]}>
                <Text style={styles.statLabel}>💰 Сумма</Text>
                <GradientText style={styles.statValue} colors={[T.purple500, T.blue600]}>{money(stats.totalSum)}</GradientText>
              </View>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FILTERS.map((f) => {
              const on = status === f.key;
              return (
                <Pressable key={f.key} onPress={() => { tap(); setStatus(f.key); }}>
                  {on ? (
                    <LinearGradient colors={[T.pink500, T.purple500, T.blue700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.chip}>
                      <Text style={[styles.chipText, { color: "#fff" }]}>{f.label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.chip, styles.chipOff]}>
                      <Text style={styles.chipText}>{f.label}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator style={{ margin: 40 }} color={T.purple500} />
        ) : status ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontWeight: "700", color: colors.strong }}>Заказов не найдено</Text>
          </View>
        ) : (
          <View style={[styles.emptyBox, { paddingVertical: 48 }]}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>🛍️</Text>
            <Text style={{ fontSize: 20, fontWeight: "900", color: colors.strong, marginBottom: 4 }}>Заказов пока нет</Text>
            <Text style={{ color: colors.faint, marginBottom: 20, textAlign: "center" }}>Оформите первый заказ в каталоге</Text>
            <Pressable onPress={() => router.navigate("/catalog")}>
              <LinearGradient colors={[T.pink500, T.purple500, T.blue700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.openBtn}>
                <Text style={[styles.openText, { paddingHorizontal: 18 }]}>Перейти в каталог</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )
      }
      ListFooterComponent={loading && orders.length > 0 ? <ActivityIndicator style={{ margin: 20 }} color={T.purple500} /> : null}
      renderItem={({ item }) => <OrderCard order={item} unread={unread.has(item.id)} />}
    />
  );
}

const cardShadow = {
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

const styles = themed(() => ({
  title: { fontSize: 30, fontWeight: "900", lineHeight: 36 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  statWide: { flexBasis: "100%" },
  statLabel: { fontSize: 12, fontWeight: "600", color: colors.faint, marginBottom: 4 },
  statValueBig: { fontSize: 24, fontWeight: "900", lineHeight: 30 },
  statValue: { fontSize: 20, fontWeight: "900", lineHeight: 26 },
  top: { fontSize: 14, fontWeight: "700", color: colors.strong },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 999, justifyContent: "center" },
  chipOff: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipText: { fontWeight: "700", color: colors.strong, fontSize: 13 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#a855f7",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: "hidden",
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.violetBorder,
  },
  num: { fontWeight: "900", color: colors.strong, fontSize: 16 },
  meta: { fontSize: 12, color: colors.faint, fontWeight: "500" },
  note: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  body: { borderTopWidth: 1, borderTopColor: colors.soft, paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemName: { flex: 1, fontSize: 13, color: colors.strong },
  itemQty: { fontSize: 12, color: colors.faint },
  itemSum: { fontSize: 13, fontWeight: "700", color: colors.strong, minWidth: 70, textAlign: "right" },
  comment: { fontSize: 13, color: colors.muted, fontStyle: "italic" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.soft, paddingTop: 10 },
  openBtn: { height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 4 },
  openText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyBox: { backgroundColor: colors.card, borderRadius: 24, padding: 32, alignItems: "center" },
}));
