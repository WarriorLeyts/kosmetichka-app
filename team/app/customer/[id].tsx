import { useRef, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, ErrorState, KV, Loading } from "@/components/kit";
import { useLoad } from "@/useLoad";
import { get, post } from "@/api";
import { date } from "@/format";
import { useIOS } from "@/ios";
import { CustomerBadge } from "@/components/CustomerBadge";
import type { CustomerDetail } from "@/types";

/** Customer card: contacts, 1C data, price type; approve / return to «waiting» (as the site's buttons). */
export default function Customer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useIOS();
  const [busy, setBusy] = useState("");
  const running = useRef(false);
  const { data, error, loading, reload } = useLoad(() => get<CustomerDetail>(`/api/team/customers/${id}`), [id]);
  const x = data?.customer;

  const act = (kind: "approve" | "block") => {
    const title = kind === "approve" ? "Подтвердить клиента?" : "Снять подтверждение?";
    const text = kind === "approve" ? "Клиент увидит свои цены и сможет оформлять заказы." : "Клиент вернётся в статус «Ожидает».";
    Alert.alert(title, text, [
      { text: "Отмена", style: "cancel" },
      {
        text: kind === "approve" ? "Подтвердить" : "Снять",
        style: kind === "block" ? "destructive" : "default",
        onPress: async () => {
          if (running.current) return;
          running.current = true;
          setBusy(kind);
          try {
            await post(`/api/admin/customers/${id}/${kind}`);
            await reload();
          } catch (e) {
            Alert.alert("Не получилось", e instanceof Error ? e.message : "");
          } finally {
            running.current = false;
            setBusy("");
          }
        },
      },
    ]);
  };

  return (
    <Screen title={x?.displayName ?? "Клиент"} onRefresh={reload}>
      {loading && !data ? <Loading /> : !x ? <ErrorState text={error || "Клиент не найден"} onRetry={reload} /> : (
        <>
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <CustomerBadge c={x} />
              <Text style={{ color: c.secondary }}>с {date(x.createdAt)}</Text>
            </View>
            <View style={{ height: 8 }} />
            <KV k="Контактное лицо" v={x.name} />
            <KV k="Компания" v={x.companyName} />
            <KV k="Телефон" v={x.phone} onPress={x.phone ? () => Linking.openURL(`tel:${(x.phone ?? "").replace(/[^\d+]/g, "")}`).catch(() => {}) : undefined} />
            <KV k="Email" v={x.email} onPress={x.email ? () => Linking.openURL(`mailto:${x.email}`).catch(() => {}) : undefined} />
            <KV k="ИНН" v={x.inn} />
            <KV k="Город" v={x.city} />
            <KV k="Адрес" v={x.address} />
            <KV k="Тип цен" v={x.priceTypeLabel} />
            <KV k="Менеджер 1С" v={x.manager} />
            <KV k="Код 1С" v={x.oneCId} />
            <KV k="Заказов" v={x.ordersCount} onPress={() => router.navigate({ pathname: "/orders", params: { all: "1", status: "", customer: x.phone || x.companyName || x.name || "" } })} />
          </Card>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {!x.isApproved ? <ActionButton label="Подтвердить" kind="success" loading={busy === "approve"} onPress={() => act("approve")} /> : null}
            {x.isApproved ? <ActionButton label="Снять подтверждение" kind="danger" loading={busy === "block"} onPress={() => act("block")} /> : null}
          </View>
          <Text style={{ color: c.secondary, fontSize: 13, textAlign: "center", marginTop: 12 }}>Остальные данные клиента меняются в админке сайта</Text>
        </>
      )}
    </Screen>
  );
}
