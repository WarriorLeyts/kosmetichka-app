import { useCallback, useMemo, useRef, useState } from "react";
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
import { ChangePill, RemovedItems } from "@/components/OrderChanges";
import { StockLine } from "@/components/StockLine";

type Tab = "items" | "customer" | "picker" | "history";
const PROBLEM_LABELS: Record<string, string> = {
  out_of_stock: "Нет в наличии",
  expired: "Истёк срок годности",
  bad_condition: "Плохой вид",
  insufficient_qty: "Не хватает",
};

type Draft = { id?: number; productId: number; productName: string; barcode?: string | null; quantity: number; price: number; variantName: string | null; variantImageUrl: string | null; imageUrl?: string | null; removed?: boolean; stock?: number | null };

/** Order card for managers: client, status buttons, picker, items (with picker checks and photos), editing, both chats, history. */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const me = useAuth((s) => s.user);
  const [tab, setTab] = useState<Tab>("items");
  const [busy, setBusy] = useState("");
  // status / picker / items changes: one request at a time (a state flag is too late for two quick taps)
  const running = useRef(false);
  const [pickerSheet, setPickerSheet] = useState(false);
  const [edit, setEdit] = useState<Draft[] | null>(null);
  const [catalog, setCatalog] = useState<null | "order" | "customer" | "picker">(null);
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

  const assign = async (pickerId: number | null) => {
    setPickerSheet(false);
    if (running.current) return;
    running.current = true;
    setBusy("assign");
    try {
      await post(`/api/admin/orders/${orderId}/assign`, { pickerId });
      await reload();
    } catch (e) {
      Alert.alert("Не получилось", e instanceof Error ? e.message : "");
    } finally {
      running.current = false;
      setBusy("");
    }
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

  // «Сообщить клиенту о проблемах» (as on the site): an intro + a product card with the problem for every line the picker flagged
  const notifyProblems = () => {
    if (!o) return;
    const bad = o.items.filter((i) => i.check?.hasIssues);
    if (!bad.length) return;
    Alert.alert("Сообщить клиенту о проблемах?", `В чат клиента уйдут ${bad.length} ${bad.length === 1 ? "позиция" : "позиции"} с описанием проблемы.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Отправить",
        onPress: async () => {
          if (running.current) return;
          running.current = true;
          setBusy("problems");
          try {
            const url = `/api/admin/orders/${orderId}/customer-messages`;
            await post(url, { text: `Здравствуйте! По вашему заказу №${o.id} возникли проблемы с некоторыми позициями:` });
            for (const it of bad) {
              const parts = (it.check?.statuses ?? [])
                .filter((st) => st !== "ok")
                .map((st) => (st === "insufficient_qty" && it.check?.availableQty != null ? `${PROBLEM_LABELS[st]} (есть ${it.check.availableQty} шт.)` : PROBLEM_LABELS[st] ?? st));
              const problem = parts.join(", ") + (it.check?.note ? ` — ${it.check.note}` : "");
              const imagePath = it.photos[0]?.url ?? it.variantImageUrl ?? it.imagePath ?? null;
              await post(url, { text: JSON.stringify({ _t: "product-problem", id: it.productId, name: it.productName, price: it.price, imagePath, problem }) });
            }
            setChatKey((k) => k + 1);
            Alert.alert("Отправлено клиенту");
          } catch (e) {
            Alert.alert("Не отправлено", e instanceof Error ? e.message : "");
          } finally {
            running.current = false;
            setBusy("");
          }
        },
      },
    ]);
  };

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
        { productId: product.id, productName: product.name, barcode: product.barcode, quantity: 1, price: Math.round(product.price), variantName: variant?.name ?? null, variantImageUrl: variant?.imageUrl ?? null, imageUrl: imageUrl(product.imagePath), stock: product.stock ?? null },
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

  // «Заказ оформлен» is not offered until the customer confirmed the changes
  const actions = useMemo(
    () => (o ? (STATUS_ACTIONS[o.status] ?? []).filter((a) => !(o.awaitingConfirmationSince && a.to === "payment")) : []),
    [o]
  );
  const editTotal = edit?.filter((d) => !d.removed).reduce((s, d) => s + d.quantity * d.price, 0) ?? 0;
  const editBefore = o ? o.items.reduce((s, i) => s + i.total, 0) : 0;
  const patch = (idx: number, p: Partial<Draft>) => setEdit((e) => e!.map((x, i) => (i === idx ? { ...x, ...p } : x)));

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
        {o.awaitingConfirmationSince ? (
          <View style={[styles.note, { backgroundColor: "rgba(234,88,12,0.12)", alignItems: "flex-start" }]}>
            <Ionicons name="time-outline" size={18} color="#EA580C" />
            <Text style={{ color: "#EA580C", fontWeight: "600", flex: 1 }}>
              Ждём подтверждения клиента — с {date(o.awaitingConfirmationSince)} {time(o.awaitingConfirmationSince)}.{"\n"}
              <Text style={{ fontWeight: "400" }}>«Заказ оформлен» станет доступен после его подтверждения. Клиенту придёт напоминание через 2 ч и через сутки.</Text>
            </Text>
          </View>
        ) : o.customerConfirmed && ["pending", "approved", "assembly", "consultation"].includes(o.status) ? (
          <View style={[styles.note, { backgroundColor: "rgba(22,163,74,0.12)" }]}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={{ color: "#16A34A", fontWeight: "600", flex: 1 }}>Клиент подтвердил изменения</Text>
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
        <KV k="Телефон" v={cust.phone} onPress={cust.phone ? () => Linking.openURL(`tel:${(cust.phone ?? "").replace(/[^\d+]/g, "")}`).catch(() => {}) : undefined} />
        <KV k="Email" v={cust.email} onPress={cust.email ? () => Linking.openURL(`mailto:${cust.email}`).catch(() => {}) : undefined} />
        <KV k="Город" v={cust.city} />
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
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <TextInput
                          value={String(d.price)}
                          onChangeText={(t) => patch(idx, { price: Math.max(0, Number(t.replace(/\D/g, "")) || 0) })}
                          keyboardType="number-pad"
                          style={[styles.price, { color: c.label, borderColor: dark ? "#43295A" : "#E4E2EC" }]}
                        />
                        <Text style={{ color: c.secondary }}>₽</Text>
                      </View>
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
              {data!.canEditItems ? <ActionButton label="Изменить состав" kind="soft" icon="create-outline" onPress={startEdit} /> : null}
              {o.items.some((i) => i.check?.hasIssues) ? (
                <ActionButton label="Сообщить клиенту о проблемах" kind="danger" icon="megaphone-outline" loading={busy === "problems"} onPress={notifyProblems} />
              ) : null}
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
  price: { minWidth: 76, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, fontSize: 16, textAlign: "right" },
  editTotal: { fontSize: 20, fontWeight: "800", textAlign: "right" },
  editTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginVertical: 12 },
  tag: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,59,48,0.4)", paddingHorizontal: 10, paddingVertical: 6 },
  restore: { borderRadius: 10, borderWidth: 1, borderColor: "rgba(220,38,38,0.4)", paddingHorizontal: 10, paddingVertical: 5 },
});
