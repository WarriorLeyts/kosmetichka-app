import { useCallback, useMemo, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, Chips, ErrorState, KV, Loading, SectionTitle, StatusPill, VIOLET } from "@/components/kit";
import { ChatPanel, type ChatMsg } from "@/components/chat/ChatPanel";
import { openUrl } from "@/components/chat/MessageBody";
import { ProductPicker, type Picked } from "@/components/ProductPicker";
import { Sheet, SheetOptions } from "@/components/iosui/Sheet";
import { useLoad } from "@/useLoad";
import { get, imageUrl, post, put } from "@/api";
import { date, money, time } from "@/format";
import { useIOS } from "@/ios";
import { CHECK_LABELS, STATUS_ACTIONS, STATUS_LABELS } from "@/orderStatus";
import { useAuth } from "@/store/auth";
import type { CustomerMsg, OrderDetail, OrderItem } from "@/types";

type Tab = "items" | "customer" | "picker" | "history";
type Draft = { id?: number; productId: number; productName: string; barcode?: string | null; quantity: number; price: number; variantName: string | null; variantImageUrl: string | null; imageUrl?: string | null };

/** Order card for managers: client, status buttons, picker, items (with picker checks and photos), editing, both chats, history. */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const me = useAuth((s) => s.user);
  const [tab, setTab] = useState<Tab>("items");
  const [busy, setBusy] = useState("");
  const [pickerSheet, setPickerSheet] = useState(false);
  const [edit, setEdit] = useState<Draft[] | null>(null);
  const [removed, setRemoved] = useState<number[]>([]);
  const [catalog, setCatalog] = useState<null | "order" | "customer" | "picker">(null);
  const { data, error, loading, reload, setData } = useLoad(() => get<OrderDetail>(`/api/team/orders/${orderId}`), [orderId]);

  const o = data?.order;

  const changeStatus = (to: string, label: string) => {
    Alert.alert(`${label}?`, `Заказ № ${orderId} → «${STATUS_LABELS[to] ?? to}». Клиенту придёт письмо.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Да",
        style: to === "cancelled" ? "destructive" : "default",
        onPress: async () => {
          setBusy(to);
          try {
            await post(`/api/admin/orders/${orderId}/status`, { status: to });
            await reload();
          } catch (e) {
            Alert.alert("Не получилось", e instanceof Error ? e.message : "");
          } finally {
            setBusy("");
          }
        },
      },
    ]);
  };

  const assign = async (pickerId: number | null) => {
    setPickerSheet(false);
    setBusy("assign");
    try {
      await post(`/api/admin/orders/${orderId}/assign`, { pickerId });
      await reload();
    } catch (e) {
      Alert.alert("Не получилось", e instanceof Error ? e.message : "");
    } finally {
      setBusy("");
    }
  };

  const startEdit = () => {
    if (!o) return;
    setRemoved([]);
    setEdit(o.items.map((i) => ({ id: i.id, productId: i.productId, productName: i.productName, barcode: i.barcode, quantity: i.quantity, price: i.price, variantName: i.variantName, variantImageUrl: i.variantImageUrl, imageUrl: i.imageUrl })));
  };

  const saveEdit = async () => {
    if (!edit || !o) return;
    setBusy("save");
    try {
      await put(`/api/admin/orders/${orderId}/items`, {
        items: edit.filter((d) => d.id).map((d) => ({ id: d.id, quantity: d.quantity, price: d.price, variantName: d.variantName, variantImageUrl: d.variantImageUrl })),
        removeIds: removed,
        newItems: edit
          .filter((d) => !d.id)
          .map((d) => ({ productId: d.productId, productName: d.productName, barcode: d.barcode ?? null, quantity: d.quantity, price: d.price, variantName: d.variantName, variantImageUrl: d.variantImageUrl })),
      });
      setEdit(null);
      await reload();
    } catch (e) {
      Alert.alert("Не сохранено", e instanceof Error ? e.message : "");
    } finally {
      setBusy("");
    }
  };

  const onPicked = async ({ product, variant }: Picked) => {
    const mode = catalog;
    setCatalog(null);
    if (mode === "order") {
      setEdit((d) => [
        ...(d ?? []),
        { productId: product.id, productName: product.name, barcode: product.barcode, quantity: 1, price: Math.round(product.price), variantName: variant?.name ?? null, variantImageUrl: variant?.imageUrl ?? null, imageUrl: imageUrl(product.imagePath) },
      ]);
      return;
    }
    const card = JSON.stringify({ _t: "product", id: product.id, name: variant ? `${product.name} (${variant.name})` : product.name, price: product.price, imagePath: product.imagePath });
    try {
      if (mode === "customer") await post(`/api/admin/orders/${orderId}/customer-messages`, { text: card });
      else await post(`/api/picker/messages/${orderId}`, { text: card });
      setChatKey((k) => k + 1);
    } catch (e) {
      Alert.alert("Не отправлено", e instanceof Error ? e.message : "");
    }
  };
  const [chatKey, setChatKey] = useState(0);

  const loadCustomer = useCallback(async (): Promise<ChatMsg[]> => {
    const r = await get<{ messages: CustomerMsg[] }>(`/api/admin/orders/${orderId}/customer-messages`);
    return r.messages.map((m) => ({ id: m.id, text: m.text, createdAt: m.createdAt, mine: m.isFromPicker, author: m.isFromPicker ? m.userName || "Менеджер" : "Клиент" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, chatKey]);
  const loadPicker = useCallback(async (): Promise<ChatMsg[]> => {
    const r = await get<{ messages: { id: number; text: string; isFromPicker: boolean; userName: string | null; userId: number | null; createdAt: string }[] }>(`/api/picker/messages/${orderId}`);
    return r.messages.map((m) => ({ id: m.id, text: m.text, createdAt: m.createdAt, mine: m.userId === me?.id, author: m.userName || (m.isFromPicker ? "Сборщик" : "Менеджер") }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, me?.id, chatKey]);

  const actions = useMemo(() => (o ? STATUS_ACTIONS[o.status] ?? [] : []), [o]);
  const editTotal = edit?.reduce((s, d) => s + d.quantity * d.price, 0) ?? 0;

  if (loading && !data) return <Screen title={`Заказ № ${orderId}`}><Loading /></Screen>;
  if (!o) return <Screen title={`Заказ № ${orderId}`}><ErrorState text={error || "Заказ не найден"} onRetry={reload} /></Screen>;
  const cust = o.customer;

  return (
    <Screen title={`Заказ № ${o.id}`} onRefresh={reload}>
      <Card>
        <View style={styles.row}>
          <StatusPill status={o.status} label={o.statusLabel} />
          <Text style={styles.total}>{money(o.total)}</Text>
        </View>
        <Text style={{ color: c.secondary, marginTop: 8 }}>
          Создан {date(o.createdAt)} в {time(o.createdAt)} · {o.items.length} поз.
        </Text>
        {o.oneCExportedAt ? <Text style={{ color: c.secondary, marginTop: 2 }}>Выгружен в 1С {date(o.oneCExportedAt)}</Text> : null}
        {o.status === "consultation" ? (
          <View style={[styles.note, { backgroundColor: o.customerConfirmed ? "rgba(22,163,74,0.12)" : "rgba(234,88,12,0.12)" }]}>
            <Ionicons name={o.customerConfirmed ? "checkmark-circle" : "time-outline"} size={18} color={o.customerConfirmed ? "#16A34A" : "#EA580C"} />
            <Text style={{ color: o.customerConfirmed ? "#16A34A" : "#EA580C", fontWeight: "600", flex: 1 }}>{o.customerConfirmed ? "Клиент подтвердил изменения" : "Ждём подтверждения клиента"}</Text>
          </View>
        ) : null}
        {actions.length ? (
          <View style={styles.actions}>
            {actions.map((a) => (
              <ActionButton key={a.to} label={a.label} kind={a.kind} loading={busy === a.to} onPress={() => changeStatus(a.to, a.label)} />
            ))}
          </View>
        ) : null}
      </Card>

      <Card onPress={() => router.push({ pathname: "/customer/[id]", params: { id: String(cust.id) } })}>
        <View style={styles.row}>
          <Text style={[styles.h, { color: c.label }]} numberOfLines={2}>
            {cust.companyName || cust.name || "Клиент"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={c.chevron} />
        </View>
        {cust.companyName && cust.name ? <Text style={{ color: c.secondary }}>{cust.name}</Text> : null}
        <KV k="Телефон" v={cust.phone} onPress={cust.phone ? () => Linking.openURL(`tel:${cust.phone}`) : undefined} />
        <KV k="Email" v={cust.email} onPress={cust.email ? () => Linking.openURL(`mailto:${cust.email}`) : undefined} />
        <KV k="Город" v={cust.city} />
        <KV k="ИНН" v={cust.inn} />
        <KV k="Менеджер 1С" v={cust.manager} />
        <KV k="Тип цен" v={{ retail: "Розница", discount: "Скидка", wholesale: "Опт", big_wholesale: "Крупный опт" }[cust.priceType] ?? cust.priceType} />
      </Card>

      {o.comment ? (
        <Card>
          <Text style={[styles.label, { color: c.secondary }]}>Комментарий клиента</Text>
          <Text style={{ color: c.label, fontSize: 16, lineHeight: 22 }}>{o.comment}</Text>
        </Card>
      ) : null}

      <Card onPress={() => setPickerSheet(true)}>
        <View style={styles.row}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="person-circle-outline" size={26} color={VIOLET} />
            <View>
              <Text style={[styles.label, { color: c.secondary, marginBottom: 0 }]}>Сборщик</Text>
              <Text style={{ color: c.label, fontSize: 16, fontWeight: "600" }}>{busy === "assign" ? "Сохраняем…" : o.picker?.name ?? "Не назначен"}</Text>
            </View>
          </View>
          <Text style={{ color: VIOLET, fontWeight: "600" }}>Изменить</Text>
        </View>
      </Card>

      <Chips
        items={[
          { value: "items", label: `Состав · ${o.items.length}` },
          { value: "customer", label: "Чат с клиентом" },
          { value: "picker", label: "Чат со сборщиком" },
          { value: "history", label: "История" },
        ]}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
      />

      {tab === "items" ? (
        <>
          {o.changesSnapshot && (o.changesSnapshot.added.length || o.changesSnapshot.removed.length || o.changesSnapshot.changed.length) ? (
            <Card>
              <Text style={[styles.label, { color: c.secondary }]}>Последние изменения состава</Text>
              {o.changesSnapshot.added.map((x, i) => <Text key={"a" + i} style={{ color: "#16A34A" }}>+ {x.productName}{x.variantName ? ` (${x.variantName})` : ""} × {x.quantity}</Text>)}
              {o.changesSnapshot.removed.map((x, i) => <Text key={"r" + i} style={{ color: "#DC2626" }}>− {x.productName}{x.variantName ? ` (${x.variantName})` : ""} × {x.quantity}</Text>)}
              {o.changesSnapshot.changed.map((x, i) => <Text key={"c" + i} style={{ color: c.label }}>~ {x.productName}: {x.oldQty} → {x.newQty}</Text>)}
            </Card>
          ) : null}

          {edit ? (
            <>
              {edit.map((d, idx) => (
                <Card key={(d.id ?? "n") + "-" + idx}>
                  <Text style={{ color: c.label, fontWeight: "600", fontSize: 15.5 }} numberOfLines={2}>
                    {d.productName}
                    {d.variantName ? ` · ${d.variantName}` : ""}
                    {!d.id ? "  (новый)" : ""}
                  </Text>
                  <View style={[styles.row, { marginTop: 10 }]}>
                    <View style={styles.stepper}>
                      <Pressable onPress={() => setEdit((e) => e!.map((x, i) => (i === idx ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))} style={styles.stepBtn} accessibilityLabel="Меньше">
                        <Ionicons name="remove" size={20} color={VIOLET} />
                      </Pressable>
                      <TextInput
                        value={String(d.quantity)}
                        onChangeText={(t) => setEdit((e) => e!.map((x, i) => (i === idx ? { ...x, quantity: Math.max(1, Number(t.replace(/\D/g, "")) || 1) } : x)))}
                        keyboardType="number-pad"
                        style={[styles.qty, { color: c.label }]}
                      />
                      <Pressable onPress={() => setEdit((e) => e!.map((x, i) => (i === idx ? { ...x, quantity: x.quantity + 1 } : x)))} style={styles.stepBtn} accessibilityLabel="Больше">
                        <Ionicons name="add" size={20} color={VIOLET} />
                      </Pressable>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <TextInput
                        value={String(d.price)}
                        onChangeText={(t) => setEdit((e) => e!.map((x, i) => (i === idx ? { ...x, price: Math.max(0, Number(t.replace(/\D/g, "")) || 0) } : x)))}
                        keyboardType="number-pad"
                        style={[styles.price, { color: c.label, borderColor: dark ? "#43295A" : "#E4E2EC" }]}
                      />
                      <Text style={{ color: c.secondary }}>₽</Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (d.id) setRemoved((r) => [...r, d.id!]);
                        setEdit((e) => e!.filter((_, i) => i !== idx));
                      }}
                      hitSlop={8}
                      accessibilityLabel="Удалить позицию"
                    >
                      <Ionicons name="trash-outline" size={22} color="#DC2626" />
                    </Pressable>
                  </View>
                </Card>
              ))}
              <ActionButton label="Добавить товар" kind="soft" icon="add-circle-outline" onPress={() => setCatalog("order")} />
              <Text style={[styles.editTotal, { color: c.label }]}>Итого: {money(editTotal)}</Text>
              <View style={styles.actions}>
                <ActionButton label="Отмена" kind="soft" onPress={() => setEdit(null)} />
                <ActionButton label="Сохранить" kind="primary" loading={busy === "save"} onPress={saveEdit} />
              </View>
              <Text style={{ color: c.secondary, fontSize: 13, textAlign: "center", marginTop: 8 }}>Клиенту нужно будет подтвердить изменения</Text>
            </>
          ) : (
            <>
              {o.items.map((it) => (
                <ItemCard key={it.id} it={it} />
              ))}
              {data!.canEditItems ? <ActionButton label="Изменить состав" kind="soft" icon="create-outline" onPress={startEdit} /> : null}
            </>
          )}
        </>
      ) : null}

      {tab === "customer" ? (
        <Card>
          <ChatPanel
            key={"c" + chatKey}
            load={loadCustomer}
            send={(text) => post(`/api/admin/orders/${orderId}/customer-messages`, { text })}
            empty="Клиент ещё не писал"
            extraActions={[{ value: "product", label: "Карточка товара из каталога", run: () => setCatalog("customer") }]}
          />
        </Card>
      ) : null}

      {tab === "picker" ? (
        <Card>
          <ChatPanel
            key={"p" + chatKey}
            load={loadPicker}
            send={(text) => post(`/api/picker/messages/${orderId}`, { text })}
            empty="Сообщений со сборщиком нет"
            extraActions={[{ value: "product", label: "Карточка товара из каталога", run: () => setCatalog("picker") }]}
          />
        </Card>
      ) : null}

      {tab === "history" ? (
        <Card>
          {o.statusLogs.length === 0 ? <Text style={{ color: c.secondary }}>Пока без изменений</Text> : null}
          {o.statusLogs.map((l) => (
            <View key={l.id} style={styles.log}>
              <Text style={{ color: c.label, fontWeight: "600" }}>
                {l.fromStatus ? `${STATUS_LABELS[l.fromStatus] ?? l.fromStatus} → ` : ""}
                {STATUS_LABELS[l.toStatus] ?? l.toStatus}
              </Text>
              <Text style={{ color: c.secondary, fontSize: 13 }}>
                {date(l.createdAt)} {time(l.createdAt)}
                {l.userName ? ` · ${l.userName}` : ""}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Sheet open={pickerSheet} onClose={() => setPickerSheet(false)} title="Назначить сборщика">
        <SheetOptions
          options={[...data!.pickers.map((p) => ({ value: String(p.id), label: p.name })), { value: "none", label: "Снять назначение" }]}
          value={o.pickerId ? String(o.pickerId) : ""}
          onSelect={(v) => assign(v === "none" ? null : Number(v))}
        />
      </Sheet>
      <ProductPicker open={catalog !== null} title={catalog === "order" ? "Добавить в заказ" : "Отправить товар"} onClose={() => setCatalog(null)} onPick={onPicked} />
    </Screen>
  );

  function ItemCard({ it }: { it: OrderItem }) {
    const img = it.variantImageUrl || it.imageUrl;
    return (
      <Card>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={styles.thumb}>{img ? <Image source={{ uri: imageUrl(img) ?? undefined }} style={{ width: "90%", height: "90%" }} contentFit="contain" /> : <Ionicons name="image-outline" size={22} color="#C7C7CC" />}</View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.label, fontWeight: "600", fontSize: 15.5 }} numberOfLines={3}>
              {it.productName}
            </Text>
            {it.variantName ? <Text style={{ color: VIOLET, fontSize: 13.5, marginTop: 2 }}>{it.variantName}</Text> : null}
            {it.barcode ? <Text style={{ color: c.secondary, fontSize: 12.5, marginTop: 2 }}>{it.barcode}</Text> : null}
            <View style={[styles.row, { marginTop: 6 }]}>
              <Text style={{ color: c.secondary }}>
                {it.quantity} × {money(it.price)}
              </Text>
              <Text style={{ color: c.label, fontWeight: "700" }}>{money(it.total)}</Text>
            </View>
          </View>
        </View>
        {it.check ? (
          <View style={{ marginTop: 10, gap: 6 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {it.check.statuses.map((s) => (
                <View key={s} style={[styles.checkPill, { backgroundColor: s === "ok" ? "rgba(22,163,74,0.14)" : "rgba(234,88,12,0.14)" }]}>
                  <Text style={{ color: s === "ok" ? "#16A34A" : "#EA580C", fontWeight: "700", fontSize: 12.5 }}>{CHECK_LABELS[s] ?? s}</Text>
                </View>
              ))}
            </View>
            {it.check.availableQty != null ? <Text style={{ color: c.secondary }}>Есть в наличии: {it.check.availableQty}</Text> : null}
            {it.check.note ? <Text style={{ color: c.label }}>«{it.check.note}»</Text> : null}
            <Text style={{ color: c.secondary, fontSize: 12 }}>
              Проверил {it.check.picker?.name ?? "сборщик"} · {date(it.check.updatedAt)} {time(it.check.updatedAt)}
            </Text>
          </View>
        ) : null}
        {it.photos.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {it.photos.map((p) => (
              <Pressable key={p.id} onPress={() => openUrl(p.url)} accessibilityLabel="Фото сборщика">
                <Image source={{ uri: imageUrl(p.url) ?? undefined }} style={styles.photo} contentFit="cover" />
              </Pressable>
            ))}
          </View>
        ) : null}
      </Card>
    );
  }
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  total: { color: "#e82c87", fontSize: 22, fontWeight: "800" },
  note: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 10, marginTop: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  h: { fontSize: 18, fontWeight: "700", flex: 1 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  checkPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  photo: { width: 72, height: 72, borderRadius: 10 },
  log: { paddingVertical: 8 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(139,61,255,0.1)" },
  qty: { minWidth: 44, textAlign: "center", fontSize: 17, fontWeight: "700" },
  price: { minWidth: 76, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, fontSize: 16, textAlign: "right" },
  editTotal: { fontSize: 18, fontWeight: "700", textAlign: "right", marginVertical: 12 },
});
