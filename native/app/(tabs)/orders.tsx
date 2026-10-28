import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/api";
import { orderStatus } from "@/unread";
import { dateLong, money } from "@/format";
import { useAuth } from "@/store/auth";
import { orderCache } from "@/orderCache";
import { ErrorView, tap } from "@/components/ui";
import { LoginRequired } from "@/components/LoginRequired";
import { BrandHeader } from "@/components/iosui/BrandHeader";
import { useTabBarSpace, VIOLET_PINK } from "@/components/TabBar";
import { iosText, useIOS } from "@/ios";
import { statusLook } from "@/orderStatus";
import type { Order, OrdersPage } from "@/types";

const VIOLET = "#8b3dff";
const PINK = "#e82c87";

// existing filters (server-side status filter)
const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Все" },
  { key: "pending", label: "Ожидают" },
  { key: "assembly", label: "Сборка" },
  { key: "consultation", label: "Консультация" },
  { key: "payment", label: "Заказ оформлен" },
  { key: "exported", label: "Выполнены" },
  { key: "cancelled", label: "Отменены" },
];

/** One order card: status icon, number, date, status pill, total, chevron — the whole card opens the order. */
function OrderCard({ order, unread }: { order: Order; unread: boolean }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const s = statusLook(order.status, dark);
  const needsConfirm = !!order.needsConfirm;
  const confirmed = !needsConfirm && order.status === "consultation" && order.customerConfirmed;
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push(`/order/${order.id}`);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Заказ №${order.id}, ${s.label}, ${money(order.total)}${unread ? ", новое сообщение" : ""}`}
      style={({ pressed }) => [styles.card, { backgroundColor: pressed ? c.cellPressed : c.cell }, !dark && styles.shadow]}
    >
      <View style={styles.cardRow}>
        <View style={[styles.statusIcon, { backgroundColor: s.bg }]}>
          <Ionicons name={s.icon} size={30} color={s.fg} />
          {unread ? <View style={[styles.unreadDot, { borderColor: c.cell }]} /> : null}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.num, { color: c.label }]}>Заказ №{order.id}</Text>
          <Text style={[iosText.subhead, { color: c.secondary }]}>{dateLong(order.createdAt)}</Text>
          <View style={[styles.pill, { backgroundColor: s.bg }]}>
            <Ionicons name={s.icon} size={16} color={s.fg} />
            <Text style={[styles.pillText, { color: s.fg }]}>{s.label}</Text>
          </View>
          <Text style={[styles.total, { color: c.label }]}>{money(order.total)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.chevron} />
      </View>
      {needsConfirm ? (
        <View style={[styles.note, { backgroundColor: dark ? "rgba(255,149,0,0.15)" : "#fff7ed" }]}>
          <Ionicons name="alert-circle-outline" size={17} color="#c2410c" />
          <Text style={{ color: "#c2410c", fontSize: 14, flex: 1 }}>Менеджер изменил заказ. Проверьте и подтвердите изменения</Text>
        </View>
      ) : null}
      {confirmed ? (
        <View style={[styles.note, { backgroundColor: dark ? "rgba(52,199,89,0.15)" : "#f0fdf4" }]}>
          <Ionicons name="checkmark-circle-outline" size={17} color="#15803d" />
          <Text style={{ color: "#15803d", fontSize: 14, flex: 1 }}>Вы подтвердили изменения</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function Orders() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const customer = useAuth((s) => s.customer);
  const [status, setStatus] = useState("");
  const [data, setData] = useState<OrdersPage | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState<Set<number>>(new Set());

  const reqId = useRef(0);
  const load = useCallback(
    async (page: number, mode: "replace" | "append" | "refresh" | "silent") => {
      const id = ++reqId.current;
      if (mode === "refresh") setRefreshing(true);
      else if (mode !== "silent") setLoading(true);
      setError("");
      try {
        const r = await api.orders(page, status);
        if (id !== reqId.current) return; // a newer request (another filter) wins
        const list = Array.isArray(r?.orders) ? r.orders : [];
        list.forEach((o) => orderCache.set(o.id, o));
        setData(r);
        setOrders((prev) => {
          // background refresh: new statuses for the first page, new orders on top, loaded pages kept
          if (mode === "silent") {
            const fresh = new Map(list.map((o) => [o.id, o]));
            const kept = prev.map((o) => fresh.get(o.id) ?? o);
            const known = new Set(prev.map((o) => o.id));
            return [...list.filter((o) => !known.has(o.id)), ...kept];
          }
          if (mode !== "append") return list;
          const seen = new Set(prev.map((o) => o.id));
          return [...prev, ...list.filter((o) => !seen.has(o.id))];
        });
        orderStatus(true)
          .then((s) => setUnread(new Set(s.managerMessages.map((m) => m.orderId))))
          .catch(() => {});
      } catch (e) {
        if (id === reqId.current && mode !== "silent") setError(e instanceof Error ? e.message : "Ошибка");
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [status]
  );

  // another account (or logout): forget the previous list
  const customerId = customer?.id ?? null;
  useEffect(() => {
    reqId.current++; // a request still running for the previous account must not fill the list
    setOrders([]);
    setData(null);
    setUnread(new Set());
    setError("");
    setLoading(false);
    setRefreshing(false);
  }, [customerId]);

  useEffect(() => {
    if (customerId) load(1, "replace");
  }, [customerId, load]);

  // coming back to the tab: refresh (new orders, unread messages)
  const loadRef = useRef(load);
  loadRef.current = load;
  const hasData = useRef(false);
  hasData.current = !!data;
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (customerId && hasData.current) loadRef.current(1, "refresh");
    }, [customerId])
  );

  // while the list is open: statuses and new manager messages update by themselves every 20 s
  useFocusEffect(
    useCallback(() => {
      if (!customerId) return;
      const t = setInterval(() => {
        if (AppState.currentState === "active" && hasData.current) loadRef.current(1, "silent");
      }, 20000);
      return () => clearInterval(t);
    }, [customerId])
  );

  const bg = "transparent";
  const top = (
    <View style={{ paddingHorizontal: 16, paddingTop: insets.top, width: "100%", maxWidth: 640, alignSelf: "center" }}>
      <BrandHeader title="Мои заказы" />
    </View>
  );

  if (!customer)
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        {top}
        <LoginRequired text="Здесь появится история ваших заказов и переписка с менеджером" />
      </View>
    );
  if (error && orders.length === 0)
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        {top}
        <ErrorView message={error} onRetry={() => load(1, "replace")} />
      </View>
    );

  const stats = data?.stats;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <FlatList
        data={orders}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top, paddingBottom: bottomSpace + 8, gap: 12, width: "100%", maxWidth: 640, alignSelf: "center" }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, "refresh")} tintColor={VIOLET} colors={[VIOLET]} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!loading && data && data.page < data.totalPages) load(data.page + 1, "append");
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <BrandHeader title="Мои заказы" />

            {/* compact stats from the server */}
            {stats && stats.totalOrders > 0 ? (
              <View style={[styles.stats, { backgroundColor: c.cell }, !dark && styles.shadow]}>
                <View style={styles.statHalf}>
                  <View style={[styles.statIcon, { backgroundColor: "rgba(139,61,255,0.1)" }]}>
                    <Ionicons name="bag-handle-outline" size={26} color={VIOLET} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[iosText.subhead, { color: c.secondary }]}>Заказов</Text>
                    <Text style={[styles.statValue, { color: c.label }]} numberOfLines={1} adjustsFontSizeToFit>
                      {stats.totalOrders}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statSep, { backgroundColor: c.separator }]} />
                <View style={styles.statHalf}>
                  <View style={[styles.statIcon, { backgroundColor: "rgba(232,44,135,0.1)" }]}>
                    <Ionicons name="wallet-outline" size={26} color={PINK} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[iosText.subhead, { color: c.secondary }]}>Сумма</Text>
                    <Text style={[styles.statValue, { color: c.label }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                      {money(stats.totalSum)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* status filters — scroll horizontally when they don't fit */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }} style={{ marginHorizontal: -16 }}>
              <View style={{ width: 8 }} />
              {FILTERS.map((f) => {
                const on = status === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => {
                      tap();
                      setStatus(f.key);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    {on ? (
                      <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.chip, { boxShadow: "0 4px 12px rgba(139,61,255,0.3)" }]}>
                        <Text style={[styles.chipText, { color: "#fff", fontWeight: "600" }]}>{f.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.chip, { backgroundColor: c.cell, borderColor: dark ? "#43295A" : "#ECE8F5", borderWidth: 1 }]}>
                        <Text style={[styles.chipText, { color: c.secondary }]}>{f.label}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
              <View style={{ width: 8 }} />
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ margin: 40 }} color={VIOLET} />
          ) : (
            <View style={[styles.empty, { backgroundColor: c.cell }, !dark && styles.shadow]}>
              <View style={[styles.statIcon, { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(139,61,255,0.1)" }]}>
                <Ionicons name="receipt-outline" size={32} color={VIOLET} />
              </View>
              <Text style={[iosText.headline, { color: c.label, marginTop: 12 }]}>{status ? "Заказов не найдено" : "Заказов пока нет"}</Text>
              {!status ? (
                <>
                  <Text style={[iosText.subhead, { color: c.secondary, marginTop: 4, textAlign: "center" }]}>Оформите первый заказ в каталоге</Text>
                  <Pressable onPress={() => router.navigate("/catalog")} style={{ marginTop: 18, alignSelf: "stretch" }}>
                    <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                      <Text style={styles.ctaText}>Перейти в каталог</Text>
                    </LinearGradient>
                  </Pressable>
                </>
              ) : null}
            </View>
          )
        }
        ListFooterComponent={loading && orders.length > 0 ? <ActivityIndicator style={{ margin: 20 }} color={VIOLET} /> : null}
        renderItem={({ item }) => <OrderCard order={item} unread={unread.has(item.id)} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.07)" },
  stats: { flexDirection: "row", alignItems: "center", borderRadius: 22, paddingVertical: 14, paddingHorizontal: 12 },
  statHalf: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 },
  statIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statSep: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", marginHorizontal: 6 },
  statValue: { fontSize: 26, fontWeight: "700" },
  chip: { minHeight: 40, paddingHorizontal: 18, borderRadius: 20, justifyContent: "center" },
  chipText: { fontSize: 15 },
  card: { borderRadius: 22, padding: 14 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  statusIcon: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  unreadDot: { position: "absolute", top: -3, right: -3, width: 14, height: 14, borderRadius: 7, backgroundColor: PINK, borderWidth: 2 },
  num: { fontSize: 18, fontWeight: "700" },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginTop: 2, maxWidth: "100%" },
  pillText: { fontSize: 14, fontWeight: "500", flexShrink: 1 },
  total: { fontSize: 19, fontWeight: "700", marginTop: 3 },
  note: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  empty: { borderRadius: 22, padding: 28, alignItems: "center" },
  cta: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
