import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ListScreen } from "@/components/ListScreen";
import { Card, Chips, Empty, ErrorState, Loading, SearchField, StatusPill } from "@/components/kit";
import { usePaged } from "@/usePaged";
import { get } from "@/api";
import { date, money, time } from "@/format";
import { useIOS } from "@/ios";
import { STATUS_LABELS, STATUS_ORDER } from "@/orderStatus";
import { clientName, type OrderListItem, type OrdersPage } from "@/types";

/** Заказы: working day (19:00 → 18:59 like the site) or all dates, status chips, customer search. */
export default function Orders() {
  const c = useIOS();
  const params = useLocalSearchParams<{ status?: string; all?: string; customer?: string }>();
  const [status, setStatus] = useState(params.status ?? "");
  const [allDates, setAllDates] = useState(params.all === "1");
  const [q, setQ] = useState("");
  const [meta, setMeta] = useState<OrdersPage | null>(null);
  useEffect(() => {
    if (params.status !== undefined) setStatus(params.status);
    if (params.all !== undefined) setAllDates(params.all === "1");
    if (params.customer !== undefined) setQ(params.customer);
  }, [params.status, params.all, params.customer]);

  const list = usePaged<OrderListItem>(
    async (offset) => {
      const p = new URLSearchParams({ page: String(Math.floor(offset / 50) + 1) });
      if (allDates) p.set("date", "");
      if (status) p.set("status", status);
      if (q.trim()) p.set("customer", q.trim());
      const r = await get<OrdersPage>(`/api/team/orders?${p}`);
      setMeta(r);
      return { items: r.orders, hasMore: r.page < r.totalPages };
    },
    [status, allDates, q],
    { poll: 30_000 } // new orders and statuses appear by themselves
  );

  const counts = meta?.todayCounts.byStatus ?? [];
  const statusChips = [
    { value: "", label: "Все", count: allDates ? undefined : meta?.todayCounts.total },
    ...STATUS_ORDER.filter((s) => s !== "approved")
      .map((s) => ({ value: s, label: STATUS_LABELS[s], count: allDates ? undefined : counts.find((x) => x.status === s)?.count }))
      .filter((x) => !(["exported", "cancelled"].includes(x.value) && !allDates && !x.count)),
  ];

  return (
    <ListScreen
      tab
      title="Заказы"
      data={list.items}
      keyOf={(o) => String(o.id)}
      onRefresh={list.reload}
      onEnd={list.more}
      loadingMore={list.loadingMore}
      header={
        <>
          <SearchField value={q} onChange={setQ} placeholder="Клиент: имя, компания, телефон, ИНН" />
          <Chips
            items={[
              { value: "day", label: meta ? `Рабочий день ${date(meta.filters.businessToday + "T12:00:00")}` : "Рабочий день" },
              { value: "all", label: "Все даты" },
            ]}
            value={allDates ? "all" : "day"}
            onChange={(v) => setAllDates(v === "all")}
          />
          <Chips items={statusChips} value={status} onChange={setStatus} />
          {meta ? <Text style={[styles.total, { color: c.secondary }]}>Найдено: {meta.totalCount}</Text> : null}
        </>
      }
      empty={list.loading ? <Loading /> : list.error ? <ErrorState text={list.error} onRetry={list.reload} /> : <Empty icon="document-text-outline" text="Заказов нет" />}
      renderItem={({ item: o }) => (
        <Card onPress={() => router.push({ pathname: "/order/[id]", params: { id: String(o.id) } })}>
          <View style={styles.row}>
            <Text style={[styles.no, { color: c.label }]}>№ {o.id}</Text>
            <StatusPill status={o.status} label={o.statusLabel} />
          </View>
          <Text style={[styles.client, { color: c.label }]} numberOfLines={1}>
            {clientName(o.customer)}
          </Text>
          <View style={styles.row}>
            <Text style={{ color: c.secondary, flexShrink: 1 }}>
              {date(o.createdAt)} {time(o.createdAt)} · {o.itemsCount} поз.
              {o.checkedCount ? ` · проверено ${o.checkedCount}` : ""}
            </Text>
            <Text style={styles.sum}>{money(o.total)}</Text>
          </View>
          {o.hasIssues ? (
            <View style={styles.issue}>
              <Ionicons name="warning" size={14} color="#B45309" />
              <Text style={styles.issueText}>Есть проблемы при сборке</Text>
            </View>
          ) : null}
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  total: { fontSize: 13, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  no: { fontSize: 17, fontWeight: "700" },
  client: { fontSize: 15.5, fontWeight: "500", marginVertical: 6 },
  sum: { color: "#e82c87", fontWeight: "700", fontSize: 16 },
  issue: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, alignSelf: "flex-start", backgroundColor: "#FFF4E5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  issueText: { color: "#B45309", fontSize: 12.5, fontWeight: "600" },
});
