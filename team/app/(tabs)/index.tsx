import { StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card, ErrorState, Loading, SectionTitle, StatusPill } from "@/components/kit";
import { useLoad } from "@/useLoad";
import { get } from "@/api";
import { money, date, time } from "@/format";
import { useIOS } from "@/ios";
import { useBadges } from "@/store/badges";
import { useAuth } from "@/store/auth";
import { statusColors } from "@/orderStatus";
import type { Dashboard } from "@/types";

/** Главная: today, active orders by status, week revenue, customers, latest orders (as /admin). */
export default function Home() {
  const role = useAuth((s) => s.user?.role);
  if (role === "picker") return <Redirect href="/picker" />;
  return <Dashboard />;
}

function Dashboard() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const setBadge = useBadges((s) => s.set);
  const { data, error, loading, reload } = useLoad(async () => {
    const d = await get<Dashboard>("/api/team/dashboard");
    // orders waiting for a manager → number on the «Заказы» tab
    setBadge("orders", d.active.byStatus.find((s) => s.status === "pending")?.count ?? 0);
    return d;
  }, []);

  return (
    <Screen tab title="Сводка" onRefresh={reload}>
      {loading && !data ? <Loading /> : error && !data ? <ErrorState text={error} onRetry={reload} /> : data ? (
        <>
          <View style={styles.grid}>
            <Tile label="Заказов сегодня" value={String(data.today.ordersCount)} />
            <Tile label="Выручка сегодня" value={money(data.today.revenue)} />
            <Tile label="За 7 дней" value={money(data.weekRevenue)} />
            <Tile label="Клиентов" value={String(data.customers.totalApproved)} sub={data.customers.newToday ? `+${data.customers.newToday} сегодня` : undefined} />
          </View>

          <SectionTitle>В работе · {data.active.total}</SectionTitle>
          <View style={styles.grid}>
            {data.active.byStatus.map((s) => {
              const col = statusColors(s.status, dark);
              return (
                <Card key={s.status} style={[styles.tile, { backgroundColor: col.bg }]} onPress={() => router.navigate({ pathname: "/orders", params: { status: s.status, all: "1" } })}>
                  <Text style={[styles.tileValue, { color: col.fg }]}>{s.count}</Text>
                  <Text style={[styles.tileLabel, { color: col.fg }]}>{s.label}</Text>
                </Card>
              );
            })}
          </View>

          <SectionTitle>Последние заказы</SectionTitle>
          {data.recentOrders.map((o) => (
            <Card key={o.id} onPress={() => router.push({ pathname: "/order/[id]", params: { id: String(o.id) } })}>
              <View style={styles.rowTop}>
                <Text style={[styles.orderNo, { color: c.label }]}>№ {o.id}</Text>
                <StatusPill status={o.status} label={o.statusLabel} />
              </View>
              <Text style={[styles.client, { color: c.label }]} numberOfLines={1}>
                {o.clientName}
              </Text>
              <View style={styles.rowTop}>
                <Text style={{ color: c.secondary }}>
                  {date(o.createdAt)} {time(o.createdAt)} · {o.itemsCount} поз.
                </Text>
                <Text style={styles.sum}>{money(o.total)}</Text>
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const c = useIOS();
  return (
    <Card style={styles.tile}>
      <Text style={[styles.tileValue, { color: c.label }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.tileLabel, { color: c.secondary }]}>{label}</Text>
      {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  tile: { flexBasis: "47%", flexGrow: 1, marginBottom: 0, paddingVertical: 14 },
  tileValue: { fontSize: 24, fontWeight: "800" },
  tileLabel: { fontSize: 13.5, marginTop: 2, fontWeight: "500" },
  tileSub: { fontSize: 12.5, color: "#16A34A", fontWeight: "600", marginTop: 2 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  orderNo: { fontSize: 17, fontWeight: "700" },
  client: { fontSize: 15.5, fontWeight: "500", marginVertical: 6 },
  sum: { color: "#e82c87", fontWeight: "700", fontSize: 16 },
});
