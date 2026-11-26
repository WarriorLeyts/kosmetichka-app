import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, Chips, Empty, ErrorState, Loading } from "@/components/kit";
import { ProductPicker, type Picked } from "@/components/ProductPicker";
import { BASE_URL, get, imageUrl, post } from "@/api";
import { useLoad } from "@/useLoad";
import { useIOS } from "@/ios";
import { useAuth } from "@/store/auth";

type Client = { id: number; name: string; companyName: string | null; phone: string | null; priceType: string };
type DemandRequest = { id: number; quantity: number | null; comment?: string | null; photoName?: string | null; notifiedAt?: string | null; customer: Client };
type DemandGroup = { key: string; name: string; quantity: number; customers: number; unknownQuantity?: number; moreRequests: boolean; product?: { id: number; images: { path: string }[] } | null; requests: DemandRequest[] };
type DemandPage = { kind: string; items: DemandGroup[]; page: number; hasMore: boolean };
export default function Demand() {
  const user = useAuth(s => s.user);
  if (user?.role !== "admin") return <Screen title="Дефектура"><Empty icon="lock-closed-outline" text="Раздел доступен только администратору" /></Screen>;
  return <DemandList key={user.id} />;
}
function DemandList() {
  const c = useIOS();
  const [kind, setKind] = useState("waiting"), [page, setPage] = useState(1), [expanded, setExpanded] = useState<string | null>(null);
  const [linking, setLinking] = useState<DemandRequest | null>(null), [picker, setPicker] = useState(false), [picked, setPicked] = useState<Picked | null>(null), [busy, setBusy] = useState(false), [linkError, setLinkError] = useState("");
  const lock = useRef(false);
  const { data, loading, error, reload } = useLoad(() => get<DemandPage>(`/api/team/demand?kind=${kind}&page=${page}`), [kind, page], { refocus: true, poll: 60000, paused: !!linking });
  async function link() {
    if (lock.current || !linking || !picked) return;
    lock.current = true; setBusy(true); setLinkError("");
    try { await post("/api/team/demand", { wishId: linking.id, productId: picked.product.id }); setLinking(null); setPicked(null); await reload(); }
    catch (e) { setLinkError(e instanceof Error ? e.message : "Не удалось связать товар"); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Screen title="Дефектура" onRefresh={reload}>
    <Text style={{ color: c.secondary, lineHeight: 21, marginBottom: 15 }}>Пожелания всех клиентов: товары и нужное количество. Это спрос, а не заказы или бронь.</Text>
    <Chips items={[{ value: "waiting", label: "Лист ожидания" }, { value: "missing", label: "Не нашли товар" }, { value: "notified", label: "Уведомлены" }]} value={kind} onChange={v => { setKind(v); setPage(1); setExpanded(null); }} />
    {linking ? <Card>
      <Text style={{ color: c.label, fontSize: 17, fontWeight: "600" }}>Связать пожелание с товаром</Text>
      <Text style={{ color: c.secondary, marginVertical: 10 }}>{linking.customer.name} · {linking.quantity} шт.</Text>
      {picked ? <><Text style={{ color: c.label, marginBottom: 12 }}>{picked.product.name}</Text><Text style={{ color: c.secondary, lineHeight: 20, marginBottom: 12 }}>После подтверждения товар попадёт в лист ожидания клиента. Если он уже доступен, клиент получит уведомление. Это не бронь.</Text><ActionButton label="Подтвердить связь" onPress={link} loading={busy} /></> : <ActionButton label="Выбрать товар из каталога" onPress={() => setPicker(true)} />}
      {linkError ? <Text accessibilityRole="alert" style={{ color: "#e63a59", marginTop: 10 }}>{linkError}</Text> : null}
      <View style={{ marginTop: 10 }}><ActionButton label="Отмена" kind="soft" disabled={busy} onPress={() => { setLinking(null); setPicked(null); setLinkError(""); }} /></View>
    </Card> : null}
    {loading ? <Loading /> : error ? <ErrorState text={error} onRetry={reload} /> : !data?.items.length ? <Empty icon="clipboard-outline" text="Запросов пока нет" /> : data.items.map(g => <Card key={g.key}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {g.product?.images[0]?.path ? <Image source={{ uri: imageUrl(g.product.images[0].path)! }} style={{ width: 65, height: 75, backgroundColor: "#fff", borderRadius: 12 }} contentFit="contain" /> : null}
        <Text style={{ flex: 1, color: c.label, fontSize: 17, fontWeight: "600" }}>{g.name}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 25, flexWrap: "wrap", marginTop: 15 }}><View><Text style={{ color: c.secondary }}>Нужно клиентам</Text><Text style={{ color: c.label, fontWeight: "700", fontSize: 23 }}>{g.quantity} шт.</Text></View><View><Text style={{ color: c.secondary }}>Клиентов</Text><Text style={{ color: c.label, fontWeight: "700", fontSize: 23 }}>{g.customers}</Text></View></View>
      {g.unknownQuantity ? <Text style={{ color: c.secondary, marginTop: 10 }}>Ещё {g.unknownQuantity} клиентов не указали количество</Text> : null}
      <Pressable accessibilityRole="button" onPress={() => setExpanded(expanded === g.key ? null : g.key)} style={{ paddingVertical: 14 }}><Text style={{ color: "#8b3dff", fontWeight: "600" }}>{expanded === g.key ? "Скрыть клиентов" : "Кто и сколько запросил"}</Text></Pressable>
      {expanded === g.key ? <View style={{ gap: 16 }}>{g.requests.map(r => <View key={r.id} style={{ gap: 6, paddingTop: 10 }}>
        <Pressable accessibilityRole="button" onPress={() => router.push(`/customer/${r.customer.id}`)}><Text style={{ color: c.label, fontWeight: "600" }}>{r.customer.companyName || r.customer.name} · {r.quantity ? `${r.quantity} шт.` : "количество не указано"}</Text><Text style={{ color: c.secondary }}>{r.customer.name} · {r.customer.phone || "Без телефона"}</Text></Pressable>
        {r.comment ? <Text style={{ color: c.label }}>{r.comment}</Text> : null}
        {r.photoName ? <Image source={{ uri: BASE_URL + `/api/demand/photo/${r.photoName}` }} style={{ width: "100%", height: 170, borderRadius: 12 }} contentFit="contain" /> : null}
        {r.notifiedAt ? <Text style={{ color: c.secondary }}>Уведомлён: {new Date(r.notifiedAt).toLocaleString("ru-RU")}</Text> : null}
        {kind === "missing" ? <ActionButton label="Связать с товаром" kind="soft" disabled={busy} onPress={() => { setLinking(r); setPicked(null); setLinkError(""); }} /> : null}
      </View>)}{g.moreRequests ? <Text style={{ color: c.secondary }}>Показаны первые 200 клиентов; общий итог учитывает всех.</Text> : null}</View> : null}
    </Card>)}
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>{page > 1 ? <ActionButton label="Назад" onPress={() => setPage(p => p - 1)} /> : null}{data?.hasMore ? <ActionButton label="Далее" onPress={() => setPage(p => p + 1)} /> : null}</View>
    <ProductPicker open={picker} chooseQuantity={false} title="Товар для пожелания" actionLabel="Выбрать" onClose={() => setPicker(false)} onPick={p => { setPicked(p); setPicker(false); }} />
  </Screen>;
}
