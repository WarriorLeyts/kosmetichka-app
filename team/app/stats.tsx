import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card, Chips, ErrorState, Loading, SectionTitle, VIOLET } from "@/components/kit";
import { useLoad } from "@/useLoad";
import { get } from "@/api";
import { money } from "@/format";
import { useIOS } from "@/ios";
import { statusColors } from "@/orderStatus";
import type { Stats } from "@/types";

const DAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

/** Статистика (as /admin/stats): today, week chart, average check, statuses, top customers and products, picker checks. */
export default function StatsScreen() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [period, setPeriod] = useState<Stats["period"]>("all");
  const { data: s, error, loading, reload } = useLoad(() => get<Stats>(`/api/team/stats?period=${period}`), [period]);
  const maxDay = Math.max(1, ...(s?.week.map((d) => d.total) ?? [1]));

  return (
    <Screen title="Статистика" onRefresh={reload}>
      {loading && !s ? <Loading /> : !s ? <ErrorState text={error} onRetry={reload} /> : (
        <>
          <View style={styles.grid}>
            <Tile v={String(s.today.ordersCount)} l="Заказов сегодня" />
            <Tile v={money(s.today.revenue)} l="Выручка сегодня" />
            <Tile v={String(s.weekOrdersCount)} l="Заказов за 7 дней" />
            <Tile v={money(s.avgOrderValue)} l="Средний чек" />
          </View>
          {s.today.ordersWithIssues ? <Text style={{ color: "#EA580C", fontWeight: "600", marginBottom: 10 }}>С проблемами сегодня: {s.today.ordersWithIssues}</Text> : null}

          <SectionTitle>Выручка за неделю</SectionTitle>
          <Card>
            <View style={styles.chart}>
              {s.week.map((d) => (
                <View key={d.date} style={styles.col}>
                  <Text style={[styles.colVal, { color: c.secondary }]} numberOfLines={1}>
                    {d.count || ""}
                  </Text>
                  <View style={[styles.bar, { height: Math.max(4, (d.total / maxDay) * 120), backgroundColor: d.total ? VIOLET : dark ? "#352044" : "#EDE9FE" }]} />
                  <Text style={[styles.colDay, { color: c.secondary }]}>{DAYS[new Date(d.date + "T12:00:00").getDay()]}</Text>
                </View>
              ))}
            </View>
            <Text style={{ color: c.secondary, fontSize: 12.5, textAlign: "center", marginTop: 6 }}>Высота — выручка, цифра — заказы</Text>
          </Card>

          <SectionTitle>Статусы заказов</SectionTitle>
          <Card>
            {s.statusDistribution.map((x) => {
              const col = statusColors(x.status, dark);
              return (
                <View key={x.status} style={{ marginVertical: 5 }}>
                  <View style={styles.row}>
                    <Text style={{ color: c.label }}>{x.label}</Text>
                    <Text style={{ color: c.secondary }}>
                      {x.count} · {x.percent}%
                    </Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: dark ? "#352044" : "#F1EEF8" }]}>
                    <View style={[styles.fill, { width: `${x.percent}%`, backgroundColor: col.fg }]} />
                  </View>
                </View>
              );
            })}
          </Card>

          <SectionTitle>Лучшие клиенты</SectionTitle>
          <Chips
            items={[
              { value: "all", label: "Всё время" },
              { value: "365d", label: "Год" },
              { value: "90d", label: "90 дней" },
              { value: "30d", label: "30 дней" },
            ]}
            value={period}
            onChange={(v) => setPeriod(v as Stats["period"])}
          />
          <Card>
            {s.topCustomers.length === 0 ? <Text style={{ color: c.secondary }}>Нет данных</Text> : null}
            {s.topCustomers.map((x, i) => (
              <Text key={x.customerId} onPress={() => router.push({ pathname: "/customer/[id]", params: { id: String(x.customerId) } })} style={[styles.line, { color: c.label }]}>
                <Text style={{ color: VIOLET, fontWeight: "700" }}>{i + 1}. </Text>
                {x.displayName}
                <Text style={{ color: c.secondary }}>
                  {"  "}
                  {x.ordersCount} зак. · {money(x.totalSpent)}
                </Text>
              </Text>
            ))}
          </Card>

          <SectionTitle>Популярные товары за неделю</SectionTitle>
          <Card>
            {s.topProducts.length === 0 ? <Text style={{ color: c.secondary }}>Нет данных</Text> : null}
            {s.topProducts.map((x, i) => (
              <View key={x.productName + i} style={[styles.row, { paddingVertical: 6 }]}>
                <Text style={{ color: c.label, flex: 1 }} numberOfLines={2}>
                  {i + 1}. {x.productName}
                </Text>
                <Text style={{ color: c.secondary }}>
                  {x.qty} шт. · {money(x.revenue)}
                </Text>
              </View>
            ))}
          </Card>

          <SectionTitle>Проверки сборщиков · 90 дней</SectionTitle>
          <Card>
            <Text style={{ color: c.secondary, marginBottom: 6 }}>Всего проверок: {s.checks.total}</Text>
            {s.checks.byStatus.map((x) => (
              <View key={x.status} style={[styles.row, { paddingVertical: 4 }]}>
                <Text style={{ color: c.label }}>{x.label}</Text>
                <Text style={{ color: c.secondary }}>
                  {x.count} · {x.percent}%
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Tile({ v, l }: { v: string; l: string }) {
  const c = useIOS();
  return (
    <Card style={styles.tile}>
      <Text style={{ color: c.label, fontSize: 22, fontWeight: "800" }} numberOfLines={1} adjustsFontSizeToFit>
        {v}
      </Text>
      <Text style={{ color: c.secondary, fontSize: 13.5, marginTop: 2 }}>{l}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  tile: { flexBasis: "47%", flexGrow: 1, marginBottom: 0 },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 170 },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  colVal: { fontSize: 12 },
  bar: { width: 22, borderRadius: 6 },
  colDay: { fontSize: 12.5, fontWeight: "600" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  track: { height: 8, borderRadius: 4, marginTop: 5, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  line: { paddingVertical: 6, fontSize: 15 },
});
