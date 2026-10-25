import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, Empty, ErrorState, Loading, StatusPill } from "@/components/kit";
import { useLoad } from "@/useLoad";
import { BASE_URL, get } from "@/api";
import { date, money } from "@/format";
import { useIOS } from "@/ios";
import { clientName, type OrdersPage } from "@/types";

/** Выгрузка в 1С (as /admin/orders/export): orders «Подтверждён» and «К оплате» → Orders.xml, they become «Выгружен в 1С». */
export default function ExportScreen() {
  const c = useIOS();
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = useLoad(async () => {
    // every page of both statuses — the export takes them all
    const all = async (status: string) => {
      const out: OrdersPage["orders"] = [];
      for (let page = 1; page <= 40; page++) {
        const r = await get<OrdersPage>(`/api/team/orders?date=&status=${status}&page=${page}`);
        out.push(...r.orders);
        if (page >= r.totalPages) break;
      }
      return out;
    };
    const [a, b] = await Promise.all([all("approved"), all("payment")]);
    return [...a, ...b].sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  }, []);
  const sum = data?.reduce((s, o) => s + o.total, 0) ?? 0;

  const run = () =>
    Alert.alert("Выгрузить в 1С?", `${data?.length ?? 0} заказ(ов) на ${money(sum)} получат статус «Выгружен в 1С». Файл Orders.xml можно будет отправить себе.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Выгрузить",
        onPress: async () => {
          setBusy(true);
          try {
            const res = await fetch(BASE_URL + "/api/admin/orders/export", { method: "POST", credentials: "include" });
            const xml = await res.text();
            if (!res.ok) throw new Error((() => { try { return JSON.parse(xml).error; } catch { return `Ошибка сервера (${res.status})`; } })());
            const uri = (FileSystem.cacheDirectory ?? "") + "Orders.xml";
            await FileSystem.writeAsStringAsync(uri, xml);
            await reload();
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(uri, { mimeType: "application/xml", UTI: "public.xml", dialogTitle: "Orders.xml" });
            } else Alert.alert("Готово", "Заказы выгружены.");
          } catch (e) {
            Alert.alert("Не выгружено", e instanceof Error ? e.message : "");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <Screen title="Выгрузка в 1С" onRefresh={reload}>
      {loading && !data ? <Loading /> : !data ? <ErrorState text={error} onRetry={reload} /> : (
        <>
          <Card>
            <Text style={{ color: c.label, fontSize: 17, fontWeight: "700" }}>В очереди: {data.length}</Text>
            <Text style={{ color: c.secondary, marginTop: 4 }}>На сумму {money(sum)}</Text>
            <View style={{ marginTop: 14 }}>
              <ActionButton label="Выгрузить и получить файл" icon="cloud-upload-outline" loading={busy} onPress={run} />
            </View>
          </Card>
          {data.length === 0 ? <Empty icon="checkmark-done-outline" text="Нечего выгружать" /> : null}
          {data.map((o) => (
            <Card key={o.id} onPress={() => router.push({ pathname: "/order/[id]", params: { id: String(o.id) } })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: c.label, fontWeight: "700", fontSize: 16 }}>№ {o.id}</Text>
                <StatusPill status={o.status} label={o.statusLabel} />
              </View>
              <Text style={{ color: c.label, marginTop: 4 }} numberOfLines={1}>
                {clientName(o.customer)}
              </Text>
              <Text style={{ color: c.secondary, marginTop: 2 }}>
                {date(o.createdAt)} · {money(o.total)}
              </Text>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
