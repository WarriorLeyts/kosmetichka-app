import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api";
import { useNotifications } from "@/store/notifications";
import { openNotificationLink } from "@/push";
import { ErrorView, tap } from "@/components/ui";
import { TitleBar } from "@/components/iosui/TitleBar";
import { useIOS } from "@/ios";
import type { AppNotification } from "@/types";

const VIOLET = "#8b3dff";
type IconName = keyof typeof Ionicons.glyphMap;

const KIND: Record<AppNotification["kind"], { icon: IconName; color: string }> = {
  order: { icon: "cube-outline", color: VIOLET },
  chat: { icon: "chatbubble-ellipses-outline", color: "#e82c87" },
  restock: { icon: "checkmark-circle-outline", color: "#1f8a3b" },
  bonus: { icon: "gift-outline", color: "#e82c87" },
  role: { icon: "pricetags-outline", color: VIOLET },
  promo: { icon: "sparkles-outline", color: "#e82c87" },
};

/** «сегодня, 14:05» / «вчера, 09:12» / «12 окт, 18:40» */
function when(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (day(now) - day(d)) / 86400000;
  if (diff === 0) return `сегодня, ${time}`;
  if (diff === 1) return `вчера, ${time}`;
  return `${d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "")}, ${time}`;
}

/** «Уведомления»: orders, manager messages, back in stock, bonuses, wholesale request, promo. */
export default function NotificationsScreen() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const setUnread = useNotifications((s) => s.set);
  const unread = useNotifications((s) => s.unread);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await api.notifications();
      setItems(r.items);
      setHasMore(r.hasMore);
      setUnread(r.unread);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить");
    } finally {
      setRefreshing(false);
    }
  }, [setUnread]);

  useEffect(() => {
    load();
  }, [load]);

  const more = async () => {
    if (!hasMore || loadingMore || !items?.length) return;
    setLoadingMore(true);
    try {
      const r = await api.notifications(items[items.length - 1].id);
      setItems((prev) => [...(prev ?? []), ...r.items]);
      setHasMore(r.hasMore);
    } catch {
      /* keep what is shown */
    } finally {
      setLoadingMore(false);
    }
  };

  const open = (n: AppNotification) => {
    tap();
    if (!n.read) {
      setItems((prev) => (prev ?? []).map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread(unread - 1);
      api.notificationsRead([n.id]).then((r) => setUnread(r.unread)).catch(() => {});
    }
    if (n.link) openNotificationLink(n.link);
  };

  const readAll = () => {
    tap();
    setItems((prev) => (prev ?? []).map((x) => ({ ...x, read: true })));
    setUnread(0);
    api.notificationsRead().catch(() => {});
  };

  const header = (
    <View style={styles.wrap}>
      <TitleBar title="Уведомления" />
      {items && items.some((x) => !x.read) ? (
        <Pressable onPress={readAll} hitSlop={8} accessibilityRole="button" style={styles.readAll}>
          <Text style={{ color: VIOLET, fontSize: 16, fontWeight: "500" }}>Прочитать все</Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (error || !items) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, paddingHorizontal: 16 }}>
        {header}
        {error ? <ErrorView message={error} onRetry={load} /> : <ActivityIndicator style={{ flex: 1 }} color={VIOLET} />}
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(n) => String(n.id)}
      contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
      showsVerticalScrollIndicator={false}
      onEndReached={more}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={VIOLET}
          colors={[VIOLET]}
        />
      }
      ListHeaderComponent={header}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={VIOLET} style={{ marginTop: 8 }} /> : null}
      ListEmptyComponent={
        <View style={[styles.wrap, styles.empty, { backgroundColor: c.cell }, !dark && styles.shadow]}>
          <View style={styles.emptyIcon}>
            <Ionicons name="notifications-outline" size={34} color={VIOLET} />
          </View>
          <Text style={[styles.emptyTitle, { color: c.label }]}>Уведомлений пока нет</Text>
          <Text style={[styles.emptyText, { color: c.secondary }]}>
            Здесь появятся статусы заказов, ответы менеджера, начисленные бонусы и товары из листа ожидания
          </Text>
        </View>
      }
      renderItem={({ item: n }) => {
        const k = KIND[n.kind] ?? KIND.order;
        return (
          <View style={styles.wrap}>
            <Pressable
              onPress={() => open(n)}
              accessibilityRole="button"
              accessibilityLabel={`${n.read ? "" : "Новое. "}${n.title}. ${n.body}`}
              style={({ pressed }) => [styles.card, { backgroundColor: c.cell }, !dark && styles.shadow, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.icon, { backgroundColor: dark ? "rgba(255,255,255,0.08)" : "rgba(139,61,255,0.08)" }]}>
                <Ionicons name={k.icon} size={22} color={k.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: c.label, fontWeight: n.read ? "500" : "700" }]}>{n.title}</Text>
                <Text style={[styles.body, { color: c.secondary }]} numberOfLines={4}>
                  {n.body}
                </Text>
                <Text style={[styles.time, { color: c.secondary }]}>{when(n.createdAt)}</Text>
              </View>
              {!n.read ? <View style={styles.dot} /> : n.link ? <Ionicons name="chevron-forward" size={18} color={c.chevron} /> : null}
            </Pressable>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 640, alignSelf: "center" },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.06)" },
  readAll: { alignSelf: "flex-end", marginTop: -6, marginBottom: 8, paddingVertical: 4 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 20, padding: 14 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, lineHeight: 21 },
  body: { fontSize: 15, lineHeight: 20, marginTop: 2 },
  time: { fontSize: 13, marginTop: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#e82c87", marginTop: 6 },
  empty: { borderRadius: 22, padding: 28, alignItems: "center", marginTop: 4 },
  emptyIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: "rgba(139,61,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 19, fontWeight: "700" },
  emptyText: { fontSize: 15, textAlign: "center", marginTop: 6, lineHeight: 21 },
});
