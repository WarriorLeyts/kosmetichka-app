import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, imageUrl } from "@/api";
import { colors, themed } from "@/theme";
import { date, money } from "@/format";
import { useAuth } from "@/store/auth";
import { orderCache } from "@/orderCache";
import { Chip, Empty, ErrorView, Loading, tap } from "@/components/ui";
import { LoginRequired } from "@/components/LoginRequired";
import { alpha, STATUS_LABELS, STATUS_TONE, type Order, type OrdersPage } from "@/types";

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Все" },
  { key: "pending", label: "Ожидают" },
  { key: "assembly", label: "Сборка" },
  { key: "consultation", label: "Консультация" },
  { key: "payment", label: "К оплате" },
  { key: "exported", label: "Выполнены" },
  { key: "cancelled", label: "Отменены" },
];

function OrderCard({ order, unread }: { order: Order; unread: boolean }) {
  const tone = STATUS_TONE[order.status] ?? { color: "#9aa0ad", icon: "cube-outline" as const };
  const needsConfirm = order.status === "consultation" && !order.customerConfirmed;
  const thumbs = order.items
    .map((it) => (it.variantImageUrl ? imageUrl(it.variantImageUrl) : imageUrl(it.imagePath)))
    .filter(Boolean)
    .slice(0, 4) as string[];
  const more = order.items.length - thumbs.length;

  return (
    <Pressable onPress={() => { tap(); router.push(`/order/${order.id}`); }} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.cardTop}>
        <View style={[styles.icon, { backgroundColor: alpha(tone.color, 0.14) }]}>
          <Ionicons name={tone.icon} size={18} color={tone.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.num}>Заказ №{order.id}</Text>
          <Text style={styles.meta}>
            {date(order.createdAt)} · {money(order.total)}
          </Text>
        </View>
        {unread && <Ionicons name="chatbubble-ellipses" size={16} color={colors.pink} style={{ marginRight: 4 }} />}
        <View style={[styles.pill, { backgroundColor: alpha(tone.color, 0.14), borderColor: alpha(tone.color, 0.45) }]}>
          <Text style={[styles.pillText, { color: tone.color }]}>{STATUS_LABELS[order.status] ?? order.status}</Text>
        </View>
      </View>

      {thumbs.length > 0 && (
        <View style={styles.thumbs}>
          {thumbs.map((u, i) => (
            <View key={u + i} style={styles.thumb}>
              <Image source={{ uri: u }} style={{ width: "86%", height: "86%" }} contentFit="contain" />
            </View>
          ))}
          {more > 0 ? (
            <View style={[styles.thumb, { backgroundColor: colors.soft }]}>
              <Text style={styles.moreText}>+{more}</Text>
            </View>
          ) : null}
        </View>
      )}

      {needsConfirm && (
        <View style={styles.notice}>
          <Ionicons name="create-outline" size={16} color={colors.pink} />
          <Text style={styles.noticeText}>Менеджер изменил заказ. Проверьте и подтвердите изменения →</Text>
        </View>
      )}
      {order.status === "consultation" && order.customerConfirmed && (
        <View style={[styles.notice, { backgroundColor: colors.successBg }]}>
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
          <Text style={[styles.noticeText, { color: colors.success }]}>Вы подтвердили изменения</Text>
        </View>
      )}
    </Pressable>
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

  const title = (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.title}>Мои заказы</Text>
    </View>
  );

  if (!customer)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {title}
        <LoginRequired text="Здесь появится история ваших заказов и переписка с менеджером" />
      </View>
    );
  if (error && orders.length === 0)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {title}
        <ErrorView message={error} onRetry={() => load(1, "replace")} />
      </View>
    );
  if (!data && loading)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {title}
        <Loading />
      </View>
    );

  const stats = data?.stats;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {title}
      <FlatList
        data={orders}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, "refresh")} tintColor={colors.pink} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!loading && data && data.page < data.totalPages) load(data.page + 1, "append");
        }}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {FILTERS.map((f) => (
                <Chip key={f.key} label={f.label} active={status === f.key} onPress={() => setStatus(f.key)} />
              ))}
            </ScrollView>
            {stats && stats.totalOrders > 0 && !status && (
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Заказов</Text>
                  <Text style={styles.statValue}>{stats.totalOrders}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>На сумму</Text>
                  <Text style={styles.statValue}>{money(stats.totalSum)}</Text>
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ margin: 40 }} color={colors.pink} />
          ) : (
            <Empty
              icon="receipt-outline"
              title={status ? "Нет заказов с таким статусом" : "Заказов пока нет"}
              text={status ? undefined : "Соберите корзину в каталоге и оформите первый заказ"}
              action={status ? undefined : "В каталог"}
              onAction={() => router.navigate("/catalog")}
            />
          )
        }
        ListFooterComponent={loading && orders.length > 0 ? <ActivityIndicator style={{ margin: 20 }} color={colors.pink} /> : null}
        renderItem={({ item }) => <OrderCard order={item} unread={unread.has(item.id)} />}
      />
    </View>
  );
}

const styles = themed(() => ({
  header: { paddingHorizontal: 18, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  statLabel: { color: colors.muted, fontSize: 12 },
  statValue: { color: colors.text, fontSize: 19, fontWeight: "800", marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  num: { fontWeight: "700", color: colors.text, fontSize: 15.5 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  pill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 150 },
  pillText: { fontSize: 11, fontWeight: "700" },
  thumbs: { flexDirection: "row", gap: 8 },
  thumb: { width: 46, height: 52, borderRadius: 10, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  moreText: { color: colors.muted, fontWeight: "700", fontSize: 13 },
  notice: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.pinkSoft, borderRadius: 12, padding: 10 },
  noticeText: { flex: 1, color: colors.pink, fontSize: 12.5, fontWeight: "600", lineHeight: 17 },
}));
