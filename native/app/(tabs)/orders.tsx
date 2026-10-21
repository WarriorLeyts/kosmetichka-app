import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/api";
import { colors, radius } from "@/theme";
import { date, money, plural } from "@/format";
import { useAuth } from "@/store/auth";
import { orderCache } from "@/orderCache";
import { Badge, Empty, ErrorView, Loading, tap } from "@/components/ui";
import { LoginRequired } from "@/components/LoginRequired";
import { STATUS_COLORS, STATUS_LABELS, type Order, type OrdersPage } from "@/types";

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Все" },
  { key: "pending", label: "Ожидают" },
  { key: "assembly", label: "Сборка" },
  { key: "consultation", label: "Консультация" },
  { key: "payment", label: "К оплате" },
  { key: "exported", label: "Выполнены" },
  { key: "cancelled", label: "Отменены" },
];

export default function Orders() {
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

  // refresh when coming back to the tab (status may have changed)
  useFocusEffect(
    useCallback(() => {
      if (customer && data) load(1, "refresh");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer])
  );

  if (!customer) return <LoginRequired text="Здесь появится история ваших заказов и переписка с менеджером" />;
  if (error && orders.length === 0) return <ErrorView message={error} onRetry={() => load(1, "replace")} />;
  if (!data && loading) return <Loading />;

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => String(o.id)}
      contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, "refresh")} tintColor={colors.violet} />}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (!loading && data && data.page < data.totalPages) load(data.page + 1, "append");
      }}
      ListHeaderComponent={
        <View>
          {data && data.stats.totalOrders > 0 && (
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.stats.totalOrders}</Text>
                <Text style={styles.statLabel}>{plural(data.stats.totalOrders, "заказ", "заказа", "заказов")}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{money(data.stats.totalSum)}</Text>
                <Text style={styles.statLabel}>на сумму</Text>
              </View>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
            {FILTERS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => { tap(); setStatus(f.key); }}
                style={[styles.chip, status === f.key && styles.chipActive]}
              >
                <Text style={[styles.chipText, status === f.key && { color: "#fff" }]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        loading ? <ActivityIndicator style={{ margin: 40 }} color={colors.violet} /> : (
          <Empty
            icon="receipt-outline"
            title={status ? "Нет заказов с таким статусом" : "Заказов пока нет"}
            text={status ? undefined : "Соберите корзину в каталоге и оформите первый заказ"}
            action={status ? undefined : "В каталог"}
            onAction={() => router.navigate("/catalog")}
          />
        )
      }
      ListFooterComponent={loading && orders.length > 0 ? <ActivityIndicator style={{ margin: 20 }} color={colors.violet} /> : null}
      renderItem={({ item }) => {
        const c = STATUS_COLORS[item.status] ?? { fg: colors.muted, bg: colors.soft };
        const qty = item.items.reduce((s, i) => s + i.quantity, 0);
        const needsConfirm = item.status === "consultation" && !item.customerConfirmed;
        return (
          <Pressable onPress={() => router.push(`/order/${item.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
            <View style={styles.cardTop}>
              <Text style={styles.num}>Заказ №{item.id}</Text>
              <Badge text={STATUS_LABELS[item.status] ?? item.status} fg={c.fg} bg={c.bg} />
            </View>
            <Text style={styles.meta}>
              {date(item.createdAt)} · {item.items.length} {plural(item.items.length, "позиция", "позиции", "позиций")}, {qty} шт.
            </Text>
            <Text style={styles.items} numberOfLines={2}>{item.items.map((i) => i.productName).join(", ")}</Text>
            <View style={styles.cardBottom}>
              <Text style={styles.total}>{money(item.total)}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {unread.has(item.id) && <Ionicons name="chatbubble-ellipses" size={18} color={colors.pink} />}
                {needsConfirm && <Text style={styles.confirm}>Нужно подтвердить</Text>}
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: 10, marginBottom: 4 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 18, fontWeight: "900", color: colors.text },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  chipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  chipText: { fontWeight: "700", color: colors.text, fontSize: 13 },
  card: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 14, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  num: { fontSize: 16, fontWeight: "900", color: colors.text },
  meta: { color: colors.muted, fontSize: 12, marginTop: 6 },
  items: { color: colors.text, fontSize: 13, marginTop: 6, lineHeight: 18 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  total: { fontSize: 18, fontWeight: "900", color: colors.pink },
  confirm: { color: colors.warning, fontWeight: "800", fontSize: 12 },
});
