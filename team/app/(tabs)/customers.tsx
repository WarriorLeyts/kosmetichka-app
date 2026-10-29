import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ListScreen } from "@/components/ListScreen";
import { Card, Chips, Empty, ErrorState, Loading, SearchField } from "@/components/kit";
import { usePaged } from "@/usePaged";
import { get } from "@/api";
import { date } from "@/format";
import { useIOS } from "@/ios";
import type { CustomerRow, CustomersPage } from "@/types";
import { CustomerBadge } from "@/components/CustomerBadge";

/** Клиенты: search, status filter (all / approved / waiting / blocked) as on the site, price type filter. */
export default function Customers() {
  const c = useIOS();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  // price type: Розница (with the discount card) / Опт / Крупный опт
  const [type, setType] = useState("");
  const [total, setTotal] = useState<number | null>(null);
  // «Найдено» only from the answer for the current search / filters (a slower old one must not overwrite it)
  const filterKey = `${q}|${status}|${type}`;
  const latest = useRef(filterKey);
  latest.current = filterKey;
  const list = usePaged<CustomerRow>(
    async (offset) => {
      const mine = filterKey;
      const p = new URLSearchParams({ page: String(Math.floor(offset / 50) + 1) });
      if (q.trim()) p.set("q", q.trim());
      if (status) p.set("status", status);
      if (type) p.set("type", type);
      const r = await get<CustomersPage>(`/api/team/customers?${p}`);
      if (latest.current === mine) setTotal(r.totalCount);
      return { items: r.customers, hasMore: r.page < r.totalPages };
    },
    [q, status, type]
  );
  return (
    <ListScreen
      tab
      title="Клиенты"
      data={list.items}
      keyOf={(x) => String(x.id)}
      onRefresh={list.reload}
      onEnd={list.more}
      loadingMore={list.loadingMore}
      header={
        <>
          <SearchField value={q} onChange={setQ} placeholder="Имя, компания, телефон, email" />
          <Chips
            items={[
              { value: "", label: "Все" },
              { value: "pending", label: "Ожидают" },
              { value: "approved", label: "Подтверждённые" },
              { value: "blocked", label: "Заблокированные" },
              { value: "requests", label: "Заявки на опт" },
            ]}
            value={status}
            onChange={setStatus}
          />
          <Chips
            items={[
              { value: "", label: "Все типы" },
              { value: "retail", label: "Розница" },
              { value: "wholesale", label: "Опт" },
              { value: "big_wholesale", label: "Крупный опт" },
            ]}
            value={type}
            onChange={setType}
          />
          {total != null ? <Text style={{ color: c.secondary, fontSize: 13, marginBottom: 8, marginLeft: 4 }}>Найдено: {total}</Text> : null}
        </>
      }
      empty={list.loading ? <Loading /> : list.error ? <ErrorState text={list.error} onRetry={list.reload} /> : <Empty icon="people-outline" text="Клиентов не найдено" />}
      renderItem={({ item: x }) => (
        <Card onPress={() => router.push({ pathname: "/customer/[id]", params: { id: String(x.id) } })}>
          <View style={styles.row}>
            <Text style={[styles.name, { color: c.label }]} numberOfLines={1}>
              {x.displayName}
            </Text>
            <CustomerBadge c={x} />
          </View>
          {x.companyName && x.name ? <Text style={{ color: c.secondary, marginTop: 2 }}>{x.name}</Text> : null}
          <Text style={{ color: c.secondary, marginTop: 4 }} numberOfLines={1}>
            {[x.phone, x.priceTypeLabel].filter(Boolean).join(" · ")}
          </Text>
          {x.roleRequestStatus === "pending" && x.roleRequest ? (
            <Text style={{ color: "#B45309", fontWeight: "700", marginTop: 4 }}>Заявка: {ROLE_LABELS[x.roleRequest] ?? x.roleRequest}</Text>
          ) : null}
          <Text style={{ color: c.secondary, fontSize: 12.5, marginTop: 2 }}>С {date(x.createdAt)}</Text>
        </Card>
      )}
    />
  );
}

const ROLE_LABELS: Record<string, string> = { wholesale: "Опт", big_wholesale: "Крупный опт" };

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  name: { fontSize: 16.5, fontWeight: "700", flex: 1 },
});
