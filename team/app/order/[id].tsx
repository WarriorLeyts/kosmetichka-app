import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, Chips, ErrorState, KV, Loading, SectionTitle, StatusPill, VIOLET } from "@/components/kit";
import { ChatPanel, type ChatMsg } from "@/components/chat/ChatPanel";
import { ProductRequestContext, type ProductRequest } from "@/components/chat/MessageBody";
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
import { ChangePill, RemovedItems } from "@/components/OrderChanges";
import { StockLine } from "@/components/StockLine";
import { useDesktop } from "@/useDesktop";
import { priceOf } from "@/products";

type Tab = "items" | "customer" | "history";
const PROBLEM_LABELS: Record<string, string> = {
  out_of_stock: "Нет в наличии",
  expired: "Истёк срок годности",
  bad_condition: "Плохой вид",
  insufficient_qty: "Не хватает",
};

type Draft = { id?: number; productId: number; productName: string; barcode?: string | null; quantity: number; price: number; variantName: string | null; variantImageUrl: string | null; imageUrl?: string | null; removed?: boolean; stock?: number | null };

/** Order card for managers (the manager collects the order himself): client, status buttons, items (with checks and photos), editing during «Сборка», chat with the customer, history. */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const me = useAuth((s) => s.user);
  const desktop = useDesktop();
  const [tab, setTab] = useState<Tab>("items");
  const [busy, setBusy] = useState("");
  // status / picker / items changes: one request at a time (a state flag is too late for two quick taps)
  const running = useRef(false);
  const [edit, setEdit] = useState<Draft[] | null>(null);
  const [catalog, setCatalog] = useState<null | "order" | "customer">(null);
  // status, items, customer's changes refresh every 15 s while the order is open (not while editing it)
  const { data, error, loading, reload, setData } = useLoad(() => get<OrderDetail>(`/api/team/orders/${orderId}`), [orderId], { refocus: true, poll: 15_000, paused: edit !== null });

  const o = data?.order;

  const changeStatus = (to: string, label: string) => {
    // «Продолжить сборку» — just the picker's screen; «Собрать заказ» — to assembly, then the picker's screen
    if (to === "pick") {
      router.push({ pathname: "/pick/[id]", params: { id: String(orderId) } });
      return;
    }
    const collect = to === "assembly" && (o?.status === "pending" || o?.status === "approved");
    if (collect) {
      (async () => {
        if (running.current) return;
        running.current = true;
        setBusy(to);
        try {
          await post(`/api/admin/orders/${orderId}/status`, { status: "assembly" });
          await reload();
          router.push({ pathname: "/pick/[id]", params: { id: String(orderId) } });
        } catch (e) {
          Alert.alert("Не получилось", e instanceof Error ? e.message : "");
        } finally {
          running.current = false;
          setBusy("");
        }
      })();
      return;
    }
    Alert.alert(`${label}?`, `Заказ № ${orderId} → «${STATUS_LABELS[to] ?? to}». Клиенту придёт письмо.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Да",
        style: to === "cancelled" ? "destructive" : "default",
        onPress: async () => {
          if (running.current) return;
          running.current = true;
          setBusy(to);
          try {
            await post(`/api/admin/orders/${orderId}/status`, { status: to });
            await reload();
          } catch (e) {
            Alert.alert("Не получилось", e instanceof Error ? e.message : "");
            reload();
          } finally {
            running.current = false;
            setBusy("");
          }
        },
      },
    ]);
  };

  // MAXMA (promo code / bonuses) didn't sync — try again now, as «Повторить» on the site
  const retryMaxma = async () => {
    if (running.current) return;
    running.current = true;
    setBusy("maxma");
    try {
      const r = await post<{ ok?: boolean }>("/api/admin/maxma/retry", { orderId });
      Alert.alert(r?.ok ? "Синхронизировано с MAXMA" : "MAXMA снова не ответила", r?.ok ? undefined : "Сайт повторит автоматически");
      await reload();
    } catch (e) {
      Alert.alert("Не получилось", e instanceof Error ? e.message : "");
    } finally {
      running.current = false;
      setBusy("");
    }
  };


  // «Добавить в заказ» on the customer's product card in the chat (the order changes only during «Сборка»)
  const requestActions = useMemo(
    () => ({
      inOrder: (r: ProductRequest) => !!o?.items.some((i) => i.productId === r.id && (i.variantName ?? null) === (r.variantName ?? null)),
      add: async (r: ProductRequest) => {
        if (!o) return;
        if (o.status !== "assembly") {
          Alert.alert("Сейчас добавить нельзя", o.status === "pending" || o.status === "approved" ? "Состав меняется во время сборки — нажмите «Собрать заказ», потом добавьте товар." : o.status === "consultation" ? "Состав меняется во время сборки — нажмите «Вернуть на сборку», потом добавьте товар." : "Этот заказ уже нельзя изменить.");
          return;
        }
        if (edit) {
          Alert.alert("Сначала сохраните изменения", "Вы меняете состав заказа — сохраните или отмените, потом добавьте товар из чата.");
          return;
        }
        if (running.current) return;
        running.current = true;
        try {
          // the price is set by the site (the customer's price type)
          await put(`/api/admin/orders/${orderId}/items`, {
            items: [],
            removeIds: [],
            newItems: [{ productId: r.id, productName: r.name, barcode: null, quantity: r.quantity, price: 0, variantName: r.variantName, variantImageUrl: r.variantName && r.imagePath ? imageUrl(r.imagePath) : null }],
          });
          await reload();
          setChatKey((k) => k + 1);
        } catch (e) {
          Alert.alert("Не добавлено", e instanceof Error ? e.message : "");
        } finally {
          running.current = false;
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [o, edit, orderId]
  );

  const startEdit = () => {
    if (!o) return;
    setEdit(o.items.map((i) => ({ id: i.id, productId: i.productId, productName: i.productName, barcode: i.barcode, quantity: i.quantity, price: i.price, variantName: i.variantName, variantImageUrl: i.variantImageUrl, imageUrl: i.imageUrl, stock: i.stock })));
  };

  const saveEdit = async () => {
    if (!edit || !o || running.current) return;
    running.current = true;
    setBusy("save");
    try {
      const res = await put<{ promoWarning?: string; loyaltyWarning?: string }>(`/api/admin/orders/${orderId}/items`, {
        items: edit.filter((d) => d.id && !d.removed).map((d) => ({ id: d.id, quantity: Math.max(1, d.quantity), price: d.price, variantName: d.variantName, variantImageUrl: d.variantImageUrl })),
        removeIds: edit.filter((d) => d.id && d.removed).map((d) => d.id as number),
        newItems: edit
          .filter((d) => !d.id && !d.removed)
          .map((d) => ({ productId: d.productId, productName: d.productName, barcode: d.barcode ?? null, quantity: Math.max(1, d.quantity), price: d.price, variantName: d.variantName, variantImageUrl: d.variantImageUrl })),
      });
      setEdit(null);
      await reload();
      // the promo code no longer fits the new items — the discount was removed by the server
      if (res?.promoWarning) Alert.alert("Промокод снят", res.promoWarning);
      if (res?.loyaltyWarning) Alert.alert("Бонусы", res.loyaltyWarning);
    } catch (e) {
      Alert.alert("Не сохранено", e instanceof Error ? e.message : "");
    } finally {
      running.current = false;
      setBusy("");
    }
  };

  const onPicked = async ({ product, variant }: Picked) => {
    const mode = catalog;
    setCatalog(null);
    if (mode === "order") {
      setEdit((d) => [
        ...(d ?? []),
        { productId: product.id, productName: product.name, barcode: product.barcode, quantity: 1, price: Math.round(priceOf(product.prices, o?.customer.priceType) || product.price), variantName: variant?.name ?? null, variantImageUrl: variant?.imageUrl ?? null, imageUrl: imageUrl(product.imagePath), stock: product.stock ?? null },
      ]);
      return;
    }
    const card = JSON.stringify({ _t: "product", id: product.id, name: variant ? `${product.name} (${variant.name})` : product.name, price: product.price, imagePath: product.imagePath });
    try {
      await post(`/api/admin/orders/${orderId}/customer-messages`, { text: card });
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

  // «Заказ оформлен» is not offered until the customer checked and confirmed the order
  const waitingCustomer = !!o && (!!o.awaitingConfirmationSince || (o.status === "consultation" && !o.customerConfirmed));
  const actions = useMemo(
    () => (o ? (STATUS_ACTIONS[o.status] ?? []).filter((a) => !(a.to === "payment" && (o.awaitingConfirmationSince || !o.customerConfirmed))) : []),
    [o]
  );
  const editTotal = edit?.filter((d) => !d.removed).reduce((s, d) => s + d.quantity * d.price, 0) ?? 0;
  const editBefore = o ? o.items.reduce((s, i) => s + i.total, 0) : 0;
  const patch = (idx: number, p: Partial<Draft>) => setEdit((e) => e!.map((x, i) => (i === idx ? { ...x, ...p } : x)));

  if (loading && !data) return <Screen title={`Заказ № ${orderId}`}><Loading /></Screen>;
  if (!o) return <Screen title={`Заказ № ${orderId}`}><ErrorState text={error || "Заказ не найден"} onRetry={reload} /></Screen>;
  const cust = o.customer;

  const side = (
    <>
      <Card>
        <View style={styles.row}>
          <StatusPill status={o.status} label={o.statusLabel} />
          <Text style={styles.total}>{money(o.total)}</Text>
        </View>
        {o.maxmaStuck ? (
          <View style={{ marginTop: 6, gap: 6 }}>
            <Text style={{ color: "#FF3B30", fontWeight: "600" }}>
              Не синхронизировано с MAXMA{o.maxmaError ? `: ${o.maxmaError}` : ""}. Сайт повторяет попытки сам.
            </Text>
            <Pressable onPress={retryMaxma} disabled={busy === "maxma"} accessibilityRole="button" style={styles.smallBtn}>
              <Ionicons name="refresh" size={16} color="#FF3B30" />
              <Text style={{ color: "#FF3B30", fontWeight: "700" }}>{busy === "maxma" ? "Повторяем…" : "Повторить сейчас"}</Text>
            </Pressable>
          </View>
        ) : null}
        {o.bonusesApplied ? (
          <Text style={{ color: "#8b3dff", marginTop: 6, fontWeight: "600" }}>Списано бонусов: {money(o.bonusesApplied)}</Text>
        ) : null}
        {o.promoCode && o.discount ? (
          <Text style={{ color: "#1f8a3b", marginTop: 6, fontWeight: "600" }}>
            Промокод {o.promoCode} · скидка {money(o.discount)}
          </Text>
        ) : null}
        <Text style={{ color: c.secondary, marginTop: 8 }}>
          Создан {date(o.createdAt)} в {time(o.createdAt)} · {o.items.length} поз.
        </Text>
        {o.oneCExportedAt ? <Text style={{ color: c.secondary, marginTop: 2 }}>Выгружен в 1С {date(o.oneCExportedAt)}</Text> : null}
        {o.status === "assembly" ? (
          <View style={[styles.note, { backgroundColor: "rgba(59,130,246,0.1)", alignItems: "flex-start" }]}>
            <Ionicons name="construct-outline" size={18} color="#2563EB" />
            <Text style={{ color: "#1E40AF", flex: 1 }}>
              Идёт сборка — сейчас можно менять состав. Когда закончите, нажмите «Отправить клиенту на проверку».
            </Text>
          </View>
        ) : waitingCustomer ? (
          <View style={[styles.note, { backgroundColor: "rgba(234,88,12,0.12)", alignItems: "flex-start" }]}>
            <Ionicons name="time-outline" size={18} color="#EA580C" />
            <Text style={{ color: "#EA580C", fontWeight: "600", flex: 1 }}>
              Ждём подтверждения клиента{o.awaitingConfirmationSince ? ` — с ${date(o.awaitingConfirmationSince)} ${time(o.awaitingConfirmationSince)}` : ""}.{"\n"}
              <Text style={{ fontWeight: "400" }}>Заказ у клиента на проверке. «Заказ оформлен» станет доступен после его подтверждения. Клиенту придёт напоминание через 2 ч и через сутки.</Text>
            </Text>
          </View>
        ) : o.status === "consultation" && o.customerConfirmed ? (
          <View style={[styles.note, { backgroundColor: "rgba(22,163,74,0.12)" }]}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={{ color: "#16A34A", fontWeight: "600", flex: 1 }}>Клиент подтвердил заказ — можно нажать «Заказ оформлен»</Text>
          </View>
        ) : null}
        {actions.length ? (
          <View style={styles.actions}>
            {actions.map((a) => (
              <ActionButton key={a.to} label={a.label} kind={a.kind} loading={busy === a.to} onPress={() => changeStatus(a.to, a.label)} />
            ))}
          </View>
        ) : null}
        {Platform.OS === "web" ? (
          <View style={{ marginTop: 10 }}>
            <ActionButton label="Счёт для печати" kind="soft" icon="print-outline" onPress={() => window.open(`/admin/orders/${o.id}/invoice`, "_blank")} />
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
        <KV k="Телефон" v={cust.phone} onPress={cust.phone ? () => Linking.openURL(`tel:${(cust.phone ?? "").replace(/[^\d+]/g, "")}`).catch(() => {}) : undefined} />
        <KV k="Email" v={cust.email} onPress={cust.email ? () => Linking.openURL(`mailto:${cust.email}`).catch(() => {}) : undefined} />
        <KV k="Город" v={cust.city} />
        {/* where to send the order — shown even when empty, so a missing address is seen at once */}
        <KV k="Адрес" v={cust.address?.trim() ? cust.address : "не указан"} />
        <KV k="ИНН" v={cust.inn} />
        <KV k="Менеджер 1С" v={cust.manager} />
        <KV k="Тип цен" v={{ retail: "Розница", discount: "Скидка по карте", wholesale: "Опт", big_wholesale: "Крупный опт" }[cust.priceType] ?? cust.priceType} />
      </Card>

      {o.comment ? (
        <Card>
          <Text style={[styles.label, { color: c.secondary }]}>Комментарий клиента</Text>
          <Text style={{ color: c.label, fontSize: 16, lineHeight: 22 }}>{o.comment}</Text>
        </Card>
      ) : null}

    </>
  );
  const main = (
    <>
      <Chips
        items={[
          { value: "items", label: `Состав · ${o.items.length}` },
          { value: "customer", label: "Чат с клиентом" },
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
              {edit.map((d, idx) => {
                const img = d.variantImageUrl || d.imageUrl;
                if (d.removed) {
                  return (
                    <Card key={(d.id ?? "n") + "-" + idx} style={{ backgroundColor: dark ? "rgba(220,38,38,0.12)" : "#FEF2F2" }}>
                      <View style={styles.row}>
                        <Text style={{ flex: 1, color: "#DC2626", textDecorationLine: "line-through" }} numberOfLines={2}>
                          {d.productName}
                        </Text>
                        <Pressable onPress={() => patch(idx, { removed: false })} hitSlop={8} accessibilityRole="button" style={styles.restore}>
                          <Text style={{ color: "#DC2626", fontWeight: "700" }}>Вернуть</Text>
                        </Pressable>
                      </View>
                    </Card>
                  );
                }
                return (
                  <Card key={(d.id ?? "n") + "-" + idx} style={!d.id ? { borderLeftWidth: 4, borderLeftColor: "#22C55E" } : undefined}>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <View style={[styles.thumb, { width: 56, height: 56 }]}>
                        {img ? <Image source={{ uri: imageUrl(img, 160) ?? undefined }} style={{ width: "90%", height: "90%" }} contentFit="contain" /> : <Ionicons name="image-outline" size={20} color="#C7C7CC" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.label, fontWeight: "600", fontSize: 15.5 }} numberOfLines={3}>
                          {d.productName}
                        </Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4, alignItems: "center" }}>
                          {!d.id ? (
                            <View style={[styles.tag, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                              <Text style={{ color: "#16A34A", fontWeight: "700", fontSize: 12 }}>Новый</Text>
                            </View>
                          ) : null}
                          {d.variantName ? <Text style={{ color: VIOLET, fontSize: 13 }}>{d.variantName}</Text> : null}
                          {d.barcode ? <Text style={{ color: c.secondary, fontSize: 12 }}>{d.barcode}</Text> : null}
                        </View>
                        <StockLine stock={d.stock} need={d.quantity} />
                      </View>
                      <Pressable onPress={() => patch(idx, { removed: true })} hitSlop={8} accessibilityLabel="Удалить позицию" style={{ paddingTop: 2 }}>
                        <Ionicons name="trash-outline" size={22} color="#DC2626" />
                      </Pressable>
                    </View>
                    <View style={[styles.row, { marginTop: 10 }]}>
                      <View style={styles.stepper}>
                        <Pressable onPress={() => patch(idx, { quantity: Math.max(1, d.quantity - 1) })} style={styles.stepBtn} accessibilityLabel="Меньше">
                          <Ionicons name="remove" size={20} color={VIOLET} />
                        </Pressable>
                        <TextInput
                          value={d.quantity ? String(d.quantity) : ""}
                          onChangeText={(t) => patch(idx, { quantity: Number(t.replace(/\D/g, "")) || 0 })}
                          onBlur={() => patch(idx, { quantity: Math.max(1, d.quantity) })}
                          keyboardType="number-pad"
                          style={[styles.qty, { color: c.label }]}
                        />
                        <Pressable onPress={() => patch(idx, { quantity: d.quantity + 1 })} style={styles.stepBtn} accessibilityLabel="Больше">
                          <Ionicons name="add" size={20} color={VIOLET} />
                        </Pressable>
                      </View>
                      <Text style={{ color: c.secondary }}>×</Text>
                      {/* the price is the catalogue's, by the customer's price type — nobody changes it in an order */}
                      <Text style={{ color: c.label, fontSize: 15.5, fontWeight: "600" }}>{money(d.price)}</Text>
                      <Text style={{ color: c.label, fontWeight: "800", fontSize: 15.5, marginLeft: "auto" }}>{money(d.quantity * d.price)}</Text>
                    </View>
                  </Card>
                );
              })}
              <ActionButton label="Добавить товар" kind="soft" icon="add-circle-outline" onPress={() => setCatalog("order")} />
              <View style={styles.editTotalRow}>
                <Text style={{ color: c.secondary }}>
                  {edit.filter((d) => !d.removed).length} поз. · {edit.filter((d) => !d.removed).reduce((n, d) => n + d.quantity, 0)} шт.
                </Text>
                <View style={{ alignItems: "flex-end" }}>
                  {editTotal !== editBefore ? <Text style={{ color: c.secondary, textDecorationLine: "line-through" }}>{money(editBefore)}</Text> : null}
                  <Text style={[styles.editTotal, { color: c.label }]}>
                    {money(editTotal)}
                    {editTotal !== editBefore ? (
                      <Text style={{ fontSize: 14, color: editTotal < editBefore ? "#16A34A" : "#EA580C" }}>
                        {"  "}
                        {editTotal > editBefore ? "+" : "−"}
                        {money(Math.abs(editTotal - editBefore))}
                      </Text>
                    ) : null}
                  </Text>
                </View>
              </View>
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
              {o.removedItems?.length ? <RemovedItems items={o.removedItems} /> : null}
              {data!.canEditItems ? (
                <ActionButton label="Изменить состав" kind="soft" icon="create-outline" onPress={startEdit} />
              ) : ["pending", "approved", "consultation"].includes(o.status) ? (
                <Text style={{ color: c.secondary, fontSize: 13, textAlign: "center", marginVertical: 6 }}>
                  {o.status === "consultation" ? "Состав меняется только во время сборки — «Вернуть на сборку»" : "Состав меняется во время сборки — нажмите «Собрать заказ»"}
                </Text>
              ) : null}
            </>
          )}
        </>
      ) : null}

      {tab === "customer" ? (
        <Card>
          <ProductRequestContext.Provider value={requestActions}>
            <ChatPanel
              key={"c" + chatKey}
              load={loadCustomer}
              send={(text) => post(`/api/admin/orders/${orderId}/customer-messages`, { text })}
              empty="Клиент ещё не писал"
              extraActions={[{ value: "product", label: "Карточка товара из каталога", run: () => setCatalog("customer") }]}
            />
          </ProductRequestContext.Provider>
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

    </>
  );

  return (
    <Screen title={`Заказ № ${o.id}`} onRefresh={reload}>
      {desktop ? (
        // computer: what the order is made of and the chats on the left, status / customer / picker on the right
        <View style={styles.cols}>
          <View style={{ flex: 1, minWidth: 0 }}>{main}</View>
          <View style={styles.side}>{side}</View>
        </View>
      ) : (
        <>
          {side}
          {main}
        </>
      )}
      <ProductPicker open={catalog !== null} title={catalog === "order" ? "Добавить в заказ" : "Отправить товар"} onClose={() => setCatalog(null)} onPick={onPicked} />
    </Screen>
  );

  function ItemCard({ it }: { it: OrderItem }) {
    const img = it.variantImageUrl || it.imageUrl;
    return (
      <Card>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={styles.thumb}>{img ? <Image source={{ uri: imageUrl(img, 160) ?? undefined }} style={{ width: "90%", height: "90%" }} contentFit="contain" /> : <Ionicons name="image-outline" size={22} color="#C7C7CC" />}</View>
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
            <StockLine stock={it.stock} need={it.quantity} />
            {it.customerChange ? <ChangePill ch={it.customerChange} who="customer" /> : null}
            {it.staffChange ? <ChangePill ch={it.staffChange} who="staff" /> : null}
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
  editTotal: { fontSize: 20, fontWeight: "800", textAlign: "right" },
  editTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginVertical: 12 },
  tag: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,59,48,0.4)", paddingHorizontal: 10, paddingVertical: 6 },
  cols: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  side: { width: 400 },
  restore: { borderRadius: 10, borderWidth: 1, borderColor: "rgba(220,38,38,0.4)", paddingHorizontal: 10, paddingVertical: 5 },
});
