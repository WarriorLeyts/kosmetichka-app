import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Card, Empty, ErrorState, Loading } from "@/components/kit";
import { useLoad } from "@/useLoad";
import { get } from "@/api";
import { date, time } from "@/format";
import { useIOS } from "@/ios";
import { useBadges } from "@/store/badges";
import type { PickerOrderRow } from "@/types";

const PROGRESS: Record<PickerOrderRow["progress"], { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  not_started: { label: "Не начат", color: "#64748B", icon: "ellipse-outline" },
  in_progress: { label: "В работе", color: "#2563EB", icon: "time-outline" },
  all_ok: { label: "Всё в порядке", color: "#16A34A", icon: "checkmark-circle" },
  has_issues: { label: "Есть проблемы", color: "#EA580C", icon: "warning" },
};

/** Сборка: every order in assembly, mine first (as /picker on the site). */
export default function Picker() {
  const c = useIOS();
  const setBadge = useBadges((s) => s.set);
  const { data, error, loading, reload } = useLoad(async () => {
    const r = await get<{ currentUserId: number; orders: PickerOrderRow[] }>("/api/team/picker/orders");
    setBadge("picker", r.orders.filter((o) => o.isMine && !o.allChecked).length);
    return r;
  }, []);

  return (
    <Screen tab title="Сборка" onRefresh={reload}>
      {loading && !data ? <Loading /> : error && !data ? <ErrorState text={error} onRetry={reload} /> : data && data.orders.length === 0 ? (
        <Empty icon="basket-outline" text="Заказов на сборке нет" />
      ) : (
        data?.orders.map((o) => {
          const pr = PROGRESS[o.progress];
          return (
            <Card key={o.id} onPress={() => router.push({ pathname: "/pick/[id]", params: { id: String(o.id) } })} style={o.isMine ? { borderWidth: 2, borderColor: "#8b3dff" } : undefined}>
              <View style={styles.row}>
                <Text style={[styles.no, { color: c.label }]}>№ {o.id}</Text>
                {o.isMine ? (
                  <View style={styles.mine}>
                    <Text style={styles.mineText}>Мой заказ</Text>
                  </View>
                ) : o.isAssignedToOther ? (
                  <Text style={{ color: c.secondary, fontSize: 13 }}>Назначен: {o.picker?.name}</Text>
                ) : null}
              </View>
              <Text style={[styles.client, { color: c.label }]} numberOfLines={1}>
                {o.clientName}
              </Text>
              {o.itemsPreview.map((i) => (
                <Text key={i.id} style={{ color: c.secondary }} numberOfLines={1}>
                  • {i.productName}
                  {i.variantName ? ` (${i.variantName})` : ""} × {i.quantity}
                </Text>
              ))}
              {o.itemsCount > o.itemsPreview.length ? <Text style={{ color: c.secondary }}>и ещё {o.itemsCount - o.itemsPreview.length}</Text> : null}
              <View style={[styles.row, { marginTop: 10 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name={pr.icon} size={16} color={pr.color} />
                  <Text style={{ color: pr.color, fontWeight: "600" }}>
                    {pr.label} · {o.checkedCount}/{o.itemsCount}
                  </Text>
                </View>
                <Text style={{ color: c.secondary, fontSize: 13 }}>
                  {date(o.createdAt)} {time(o.createdAt)}
                </Text>
              </View>
              {o.comment ? <Text style={{ color: c.label, marginTop: 8, fontStyle: "italic" }}>«{o.comment}»</Text> : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  no: { fontSize: 18, fontWeight: "700" },
  client: { fontSize: 15.5, fontWeight: "600", marginVertical: 6 },
  mine: { backgroundColor: "#8b3dff", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  mineText: { color: "#fff", fontWeight: "700", fontSize: 12.5 },
});
