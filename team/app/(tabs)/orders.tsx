import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ListScreen } from "@/components/ListScreen";
import { ActionButton, Card, Chips, Empty, ErrorState, Loading, SearchField, StatusPill, VIOLET } from "@/components/kit";
import { Sheet, SheetOptions } from "@/components/iosui/Sheet";
import { useTabBarSpace } from "@/components/TabBar";
import { useDesktop } from "@/useDesktop";
import { usePaged } from "@/usePaged";
import { get, post } from "@/api";
import { date, money, time } from "@/format";
import { useIOS } from "@/ios";
import { STATUS_LABELS, STATUS_ORDER } from "@/orderStatus";
import { clientName, type OrderListItem, type OrdersPage } from "@/types";

/** «Изменить статус» for several orders at once (as the site's orders list); the site skips orders the change doesn't fit */
const BULK_STATUSES = ["assembly", "consultation", "payment", "exported", "cancelled"] as const;

/** Заказы: working day (19:00 → 18:59 like the site) or all dates, status chips, customer search. */
export default function Orders() {
  const c = useIOS();
  const params = useLocalSearchParams<{ status?: string; all?: string; customer?: string }>();
  const [status, setStatus] = useState(params.status ?? "");
  const [allDates, setAllDates] = useState(params.all === "1");
  const [q, setQ] = useState("");
  const [meta, setMeta] = useState<OrdersPage | null>(null);
  // several orders at once: «Выбрать» → tick orders → «Изменить статус»
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [bulkSheet, setBulkSheet] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const tabSpace = useTabBarSpace();
  const desktop = useDesktop();
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
    { poll: 30_000, live: true } // new orders and statuses appear by themselves (at once with live hints)
  );

  const counts = meta?.todayCounts.byStatus ?? [];
  const statusChips = [
    { value: "", label: "Все", count: allDates ? undefined : meta?.todayCounts.total },
    ...STATUS_ORDER.filter((s) => s !== "approved")
      .map((s) => ({ value: s, label: STATUS_LABELS[s], count: allDates ? undefined : counts.find((x) => x.status === s)?.count }))
      .filter((x) => !(["exported", "cancelled"].includes(x.value) && !allDates && !x.count)),
  ];

  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const stopSelecting = () => {
    setSelecting(false);
    setPicked(new Set());
  };
  const applyBulk = (to: string) => {
    setBulkSheet(false);
    const n = picked.size;
    Alert.alert("Изменить статус?", `${n} заказ(ов) → «${STATUS_LABELS[to] ?? to}». Заказы, которым этот статус не подходит, останутся как были.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Изменить",
        onPress: async () => {
          if (bulkBusy) return;
          setBulkBusy(true);
          try {
            const r = await post<{ updated?: number[]; skipped?: number[] }>("/api/admin/orders/bulk-status", { orderIds: [...picked], toStatus: to });
            const done = r.updated?.length ?? 0;
            const skipped = r.skipped?.length ?? 0;
            Alert.alert("Готово", `Изменено: ${done}${skipped ? `, пропущено: ${skipped}` : ""}`);
            stopSelecting();
            list.reload();
          } catch (e) {
            Alert.alert("Не изменено", e instanceof Error ? e.message : "");
          } finally {
            setBulkBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
    <ListScreen
      tab
      title="Заказы"
      right={
        <Pressable onPress={selecting ? stopSelecting : () => setSelecting(true)} hitSlop={8} accessibilityRole="button" style={[styles.selectBtn, !desktop && styles.selectIcon]}>
          {desktop ? (
            <Text style={{ color: VIOLET, fontWeight: "700", fontSize: 15 }}>{selecting ? "Готово" : "Выбрать"}</Text>
          ) : (
            // phone: the header has the logo in the middle — an icon fits beside it
            <Ionicons name={selecting ? "close" : "checkmark-done-outline"} size={22} color={VIOLET} accessibilityLabel={selecting ? "Готово" : "Выбрать заказы"} />
          )}
        </Pressable>
      }
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
        <Card
          onPress={() => (selecting ? toggle(o.id) : router.push({ pathname: "/order/[id]", params: { id: String(o.id) } }))}
          style={selecting && picked.has(o.id) ? { borderWidth: 2, borderColor: VIOLET } : undefined}
        >
          <View style={styles.row}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {selecting ? <Ionicons name={picked.has(o.id) ? "checkmark-circle" : "ellipse-outline"} size={24} color={picked.has(o.id) ? VIOLET : c.secondary} /> : null}
              <Text style={[styles.no, { color: c.label }]}>№ {o.id}</Text>
            </View>
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
          {o.awaitingConfirmation ? (
            <View style={styles.issue}>
              <Ionicons name="time-outline" size={14} color="#B45309" />
              <Text style={styles.issueText}>Ждём подтверждения клиента</Text>
            </View>
          ) : null}
        </Card>
      )}
    />
      {selecting ? (
        <View style={[styles.bulkBar, { bottom: tabSpace - 4, backgroundColor: c.cell }]}>
          <Text style={{ color: c.label, fontWeight: "700", fontSize: 15 }}>Выбрано: {picked.size}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <ActionButton label="Все на экране" kind="soft" onPress={() => setPicked(new Set(list.items.map((o) => o.id)))} />
            <ActionButton label="Изменить статус" kind="primary" loading={bulkBusy} onPress={() => (picked.size ? setBulkSheet(true) : Alert.alert("Выберите заказы"))} />
          </View>
        </View>
      ) : null}
      <Sheet open={bulkSheet} onClose={() => setBulkSheet(false)} title={`Новый статус · ${picked.size} заказ(ов)`}>
        <SheetOptions options={BULK_STATUSES.map((v) => ({ value: v as string, label: STATUS_LABELS[v] ?? v }))} value="" onSelect={applyBulk} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  selectBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: "rgba(139,61,255,0.1)" },
  selectIcon: { width: 40, height: 40, paddingHorizontal: 0, paddingVertical: 0, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  bulkBar: { position: "absolute", left: 16, right: 16, alignSelf: "center", maxWidth: 760, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 12, borderRadius: 20, boxShadow: "0 8px 30px rgba(31,41,55,0.18)" },
  total: { fontSize: 13, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  no: { fontSize: 17, fontWeight: "700" },
  client: { fontSize: 15.5, fontWeight: "500", marginVertical: 6 },
  sum: { color: "#e82c87", fontWeight: "700", fontSize: 16, flexShrink: 0 },
  issue: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, alignSelf: "flex-start", backgroundColor: "#FFF4E5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  issueText: { color: "#B45309", fontSize: 12.5, fontWeight: "600" },
});
