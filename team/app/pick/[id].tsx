import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, ErrorState, Loading, SectionTitle, VIOLET } from "@/components/kit";
import { ChatPanel, type ChatMsg } from "@/components/chat/ChatPanel";
import { openUrl } from "@/components/chat/MessageBody";
import { afterSheet, pickFile } from "@/components/chat/Attach";
import { Scanner } from "@/components/Scanner";
import { Sheet, SheetOptions } from "@/components/iosui/Sheet";
import { useLoad } from "@/useLoad";
import { get, imageUrl, post, request } from "@/api";
import { money } from "@/format";
import { useIOS } from "@/ios";
import { CHECK_LABELS } from "@/orderStatus";
import { useAuth } from "@/store/auth";
import { clientName, type PickerOrder } from "@/types";
import { ChangePill, RemovedItems } from "@/components/OrderChanges";
import { StockLine } from "@/components/StockLine";

type Code = "ok" | "out_of_stock" | "expired" | "bad_condition" | "insufficient_qty";
const CODES: Code[] = ["ok", "out_of_stock", "expired", "bad_condition", "insufficient_qty"];
type State = { statuses: Code[]; statusQtys: Partial<Record<Code, string>>; availableQty: string; factQty: string; note: string; photos: string[]; uploading: boolean };

function qtysFrom(raw: string | null | undefined): Partial<Record<Code, string>> {
  if (!raw) return {};
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) {
      const out: Partial<Record<Code, string>> = {};
      for (const e of p) if (e && typeof e === "object" && e.s && e.q != null) out[e.s as Code] = String(e.q);
      return out;
    }
  } catch {}
  return {};
}

/** scanner codes vs barcodes in the order: trimmed, case-insensitive; numeric codes compared without
 * leading zeros (iOS reports UPC-A as a 13-digit EAN with a leading 0, the 1C barcode may be 12 digits) */
function sameBarcode(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (x === y) return true;
  return /^\d+$/.test(x) && /^\d+$/.test(y) && x.replace(/^0+/, "") === y.replace(/^0+/, "");
}

/** Assembly of one order (as /picker/[id]): check every item, fact quantity, problems, photos, scanner, chat with the manager. */
export default function Pick() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const me = useAuth((s) => s.user);
  const scrollRef = useRef<ScrollView>(null);
  const ys = useRef<Record<number, number>>({});
  const [items, setItems] = useState<Record<number, State>>({});
  const [find, setFind] = useState("");
  const [hl, setHl] = useState<number | null>(null);
  const [scan, setScan] = useState(false);
  const [photoFor, setPhotoFor] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const { data, error, loading, reload } = useLoad(() => get<PickerOrder>(`/api/team/picker/orders/${orderId}`), [orderId], { refocus: false, poll: 20_000 });
  const o = data?.order;

  // set once per item: a refresh must not wipe unsent marks, quantities and notes (as on the site)
  useEffect(() => {
    if (!o) return;
    setItems((prev) => {
    const s: Record<number, State> = { ...prev };
    for (const it of o.items) {
      if (prev[it.id]) {
        // keep local work, but take photos uploaded meanwhile
        s[it.id] = { ...prev[it.id], photos: Array.from(new Set([...prev[it.id].photos, ...it.photos.map((p) => p.url)])) };
        continue;
      }
      s[it.id] = {
        statuses: (it.check?.statuses ?? []) as Code[],
        statusQtys: qtysFrom(it.check?.status),
        availableQty: it.check?.availableQty?.toString() ?? "",
        factQty: it.check?.availableQty?.toString() ?? "",
        note: it.check?.note ?? "",
        photos: it.photos.map((p) => p.url),
        uploading: false,
      };
    }
    return s;
    });
  }, [o]);

  const upd = (itemId: number, f: (s: State) => State) => setItems((p) => ({ ...p, [itemId]: f(p[itemId]) }));

  const toggle = (itemId: number, code: Code) => {
    upd(itemId, (s) => {
      if (code === "ok") return { ...s, statuses: s.statuses.includes("ok") ? [] : ["ok"], statusQtys: {} };
      const has = s.statuses.includes(code);
      const q = { ...s.statusQtys };
      if (has) delete q[code];
      return { ...s, statuses: has ? s.statuses.filter((x) => x !== code) : [...s.statuses.filter((x) => x !== "ok"), code], statusQtys: q };
    });
    Haptics.notificationAsync(code === "ok" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
  };

  // fact quantity → status, as on the site: ≥ plan = OK, 0 = out of stock, less = not enough
  const setFact = (itemId: number, v: string, plan: number) => {
    const t = v.replace(/\D/g, "");
    const n = parseInt(t, 10);
    upd(itemId, (s) => {
      if (t === "" || isNaN(n)) return { ...s, factQty: t };
      if (n >= plan) return { ...s, factQty: t, statuses: ["ok"], statusQtys: {}, availableQty: "" };
      if (n === 0) return { ...s, factQty: t, statuses: ["out_of_stock"], statusQtys: {}, availableQty: "" };
      return { ...s, factQty: t, statuses: ["insufficient_qty"], statusQtys: {}, availableQty: String(n) };
    });
  };

  const locate = (value: string): boolean => {
    setFind(value);
    const v = value.trim().toLowerCase();
    if (!v || !o) {
      setHl(null);
      return false;
    }
    const found = o.items.find((i) => sameBarcode(i.barcode, v)) ?? o.items.find((i) => i.productName.toLowerCase().includes(v));
    if (found) {
      setHl(found.id);
      scrollRef.current?.scrollTo({ y: Math.max(0, (ys.current[found.id] ?? 0) - 120), animated: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return true;
    }
    setHl(null);
    return false;
  };

  const addPhoto = async (how: string) => {
    const itemId = photoFor;
    setPhotoFor(null);
    if (itemId == null) return;
    await afterSheet();
    const f = await pickFile(how as "camera" | "library", true).catch(() => null);
    if (!f) return;
    upd(itemId, (s) => ({ ...s, uploading: true }));
    try {
      // JPEG of a sensible size (iPhone photos can be HEIC and 10+ MB)
      const jpg = await ImageManipulator.manipulateAsync(f.uri, [{ resize: { width: 1600 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
      const form = new FormData();
      form.append("file", { uri: jpg.uri, name: `item-${itemId}-${Date.now()}.jpg`, type: "image/jpeg" } as unknown as Blob);
      form.append("orderItemId", String(itemId));
      const r = await request<{ photo: { url: string } }>("/api/picker/photos", { method: "POST", body: form });
      upd(itemId, (s) => ({ ...s, photos: [...s.photos, r.photo.url], uploading: false }));
    } catch (e) {
      upd(itemId, (s) => ({ ...s, uploading: false }));
      Alert.alert("Фото не загружено", e instanceof Error ? e.message : "");
    }
  };

  const checked = o ? o.items.filter((i) => (items[i.id]?.statuses.length ?? 0) > 0).length : 0;
  const all = !!o && checked === o.items.length;

  const submit = async () => {
    if (!o || submittingRef.current) return;
    if (!all) {
      Alert.alert("Проверены не все позиции", `Отмечено ${checked} из ${o.items.length}.`);
      return;
    }
    // two quick taps would send the check twice (the second one fails: the order already left assembly)
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const r = await post<{ partial: boolean; newStatus?: string; message?: string }>("/api/picker/checks", {
        orderId: o.id,
        items: o.items.map((i) => {
          const s: State = items[i.id] ?? { statuses: [], statusQtys: {}, availableQty: "", factQty: "", note: "", photos: [], uploading: false };
          const statusData = s.statuses.map((code) => {
            if (code === "ok") return "ok";
            const raw = code === "insufficient_qty" ? s.availableQty : s.statusQtys[code];
            const q = raw ? Number(raw) : NaN;
            return isNaN(q) ? code : { s: code, q };
          });
          return {
            itemId: i.id,
            statuses: s.statuses,
            statusData,
            availableQty: s.statuses.includes("insufficient_qty") && s.availableQty ? Number(s.availableQty) : null,
            note: s.note || null,
          };
        }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        "Проверка отправлена",
        r.partial ? r.message ?? "Сохранено" : "Заказ собран и отправлен клиенту на проверку. «Заказ оформлен» — после его подтверждения.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert("Не отправлено", e instanceof Error ? e.message : "");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const loadChat = useCallback(async (): Promise<ChatMsg[]> => {
    const r = await get<{ messages: { id: number; text: string; isFromPicker: boolean; userName: string | null; userId: number | null; createdAt: string }[] }>(`/api/picker/messages/${orderId}`);
    return r.messages.map((m) => ({ id: m.id, text: m.text, createdAt: m.createdAt, mine: m.userId === me?.id, author: m.userName || (m.isFromPicker ? "Сборщик" : "Менеджер") }));
  }, [orderId, me?.id]);

  if (loading && !data) return <Screen title={`Сборка № ${orderId}`}><Loading /></Screen>;
  if (!o) return <Screen title={`Сборка № ${orderId}`}><ErrorState text={error || "Заказ не найден"} onRetry={reload} /></Screen>;

  return (
    <Screen title={`Сборка № ${o.id}`} onRefresh={reload} scrollRef={scrollRef}>
      <Card>
        <Text style={{ color: c.label, fontSize: 17, fontWeight: "700" }}>{clientName(o.customer)}</Text>
        <Text style={{ color: c.secondary, marginTop: 4 }}>
          {o.items.length} поз. · {money(o.total)}
          {o.picker ? ` · сборщик ${o.picker.name}` : ""}
        </Text>
        {o.comment ? <Text style={{ color: c.label, marginTop: 8, fontStyle: "italic" }}>«{o.comment}»</Text> : null}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(checked / Math.max(1, o.items.length)) * 100}%` }]} />
        </View>
        <Text style={{ color: c.secondary, marginTop: 6 }}>
          Проверено {checked} из {o.items.length}
        </Text>
        {error ? (
          // e.g. 409 after a refresh: a manager moved the order out of assembly meanwhile
          <Text style={{ color: "#DC2626", marginTop: 8, fontWeight: "600" }}>{error}</Text>
        ) : null}
      </Card>

      <View style={styles.findRow}>
        <View style={[styles.find, { backgroundColor: dark ? "rgba(255,255,255,0.08)" : "#fff", borderColor: dark ? "rgba(200,160,255,0.3)" : "#E9E4F5" }]}>
          <Ionicons name="search-outline" size={18} color={VIOLET} />
          <TextInput value={find} onChangeText={locate} placeholder="Штрихкод или название" placeholderTextColor={c.secondary} style={{ flex: 1, color: c.label, fontSize: 16 }} autoCorrect={false} />
        </View>
        <Pressable onPress={() => setScan(true)} style={styles.scanBtn} accessibilityLabel="Сканировать штрихкод">
          <Ionicons name="barcode-outline" size={26} color="#fff" />
        </Pressable>
      </View>

      {o.items.map((it) => {
        const s = items[it.id];
        if (!s) return null;
        const img = it.variantImageUrl || it.imageUrl;
        return (
          <View key={it.id} onLayout={(e) => (ys.current[it.id] = e.nativeEvent.layout.y)}>
            <Card style={hl === it.id ? { borderWidth: 2, borderColor: VIOLET } : s.statuses.length ? { borderWidth: 1.5, borderColor: s.statuses.includes("ok") ? "rgba(22,163,74,0.5)" : "rgba(234,88,12,0.5)" } : undefined}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable onPress={() => img && openUrl(img)} style={styles.thumb}>
                  {img ? <Image source={{ uri: imageUrl(img, 320) ?? undefined }} style={{ width: "92%", height: "92%" }} contentFit="contain" /> : <Ionicons name="image-outline" size={24} color="#C7C7CC" />}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.label, fontWeight: "600", fontSize: 15.5 }} numberOfLines={3}>
                    {it.productName}
                  </Text>
                  {it.variantName ? <Text style={{ color: VIOLET, marginTop: 2 }}>{it.variantName}</Text> : null}
                  {it.barcode ? <Text style={{ color: c.secondary, fontSize: 12.5, marginTop: 2 }}>{it.barcode}</Text> : null}
                  <Text style={{ color: c.label, fontSize: 17, fontWeight: "800", marginTop: 4 }}>Нужно: {it.quantity} шт.</Text>
                  <StockLine stock={it.stock} need={it.quantity} />
                  {it.customerChange ? <ChangePill ch={it.customerChange} who="customer" /> : null}
                  {it.staffChange ? <ChangePill ch={it.staffChange} who="staff" /> : null}
                </View>
              </View>

              <View style={styles.factRow}>
                <Text style={{ color: c.secondary }}>Факт:</Text>
                <TextInput
                  value={s.factQty}
                  onChangeText={(v) => setFact(it.id, v, it.quantity)}
                  placeholder={String(it.quantity)}
                  placeholderTextColor={c.tertiary}
                  keyboardType="number-pad"
                  style={[styles.factInput, { color: c.label, borderColor: dark ? "#43295A" : "#E4E2EC" }]}
                />
                <Text style={{ color: c.secondary }}>шт.</Text>
              </View>

              <View style={styles.codes}>
                {CODES.map((code) => {
                  const on = s.statuses.includes(code);
                  const okc = code === "ok";
                  return (
                    <Pressable
                      key={code}
                      onPress={() => toggle(it.id, code)}
                      style={[styles.code, { backgroundColor: on ? (okc ? "#16A34A" : "#EA580C") : dark ? "#352044" : "#F3F1F8" }]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                    >
                      <Text style={{ color: on ? "#fff" : c.label, fontWeight: "700", fontSize: 13.5 }}>{CHECK_LABELS[code]}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {s.statuses.filter((x) => x !== "ok").map((code) => (
                <View key={code} style={styles.factRow}>
                  <Text style={{ color: c.secondary, flex: 1 }}>{code === "insufficient_qty" ? "Есть в наличии:" : `${CHECK_LABELS[code]}, шт.:`}</Text>
                  <TextInput
                    value={code === "insufficient_qty" ? s.availableQty : s.statusQtys[code] ?? ""}
                    onChangeText={(v) => {
                      const t = v.replace(/\D/g, "");
                      upd(it.id, (st) => (code === "insufficient_qty" ? { ...st, availableQty: t } : { ...st, statusQtys: { ...st.statusQtys, [code]: t } }));
                    }}
                    keyboardType="number-pad"
                    style={[styles.factInput, { color: c.label, borderColor: dark ? "#43295A" : "#E4E2EC" }]}
                  />
                </View>
              ))}

              <TextInput
                value={s.note}
                onChangeText={(v) => upd(it.id, (st) => ({ ...st, note: v }))}
                placeholder="Комментарий к позиции"
                placeholderTextColor={c.tertiary}
                style={[styles.note, { color: c.label, backgroundColor: dark ? "#2B193D" : "#F8F7FB" }]}
                multiline
              />

              <View style={styles.photos}>
                {s.photos.map((u, i) => (
                  <Pressable key={u + i} onPress={() => openUrl(u)}>
                    <Image source={{ uri: imageUrl(u) ?? undefined }} style={styles.photo} contentFit="cover" />
                  </Pressable>
                ))}
                <Pressable onPress={() => setPhotoFor(it.id)} style={[styles.photo, styles.addPhoto, { borderColor: dark ? "#5A3D73" : "#D6D2E2" }]} accessibilityLabel="Добавить фото">
                  {s.uploading ? <ActivityIndicator color={VIOLET} /> : <Ionicons name="camera-outline" size={26} color={VIOLET} />}
                </Pressable>
              </View>
            </Card>
          </View>
        );
      })}
      {o.removedItems?.length ? <RemovedItems items={o.removedItems} /> : null}

      <ActionButton label={all ? "Отправить проверку" : `Проверено ${checked} из ${o.items.length}`} kind={all ? "primary" : "soft"} loading={submitting} onPress={submit} icon="checkmark-done" />

      <SectionTitle>Чат с менеджером</SectionTitle>
      <Card>
        <ChatPanel load={loadChat} send={(text) => post(`/api/picker/messages/${orderId}`, { text })} empty="Напишите менеджеру, если что-то не так" />
      </Card>

      <Scanner
        open={scan}
        onClose={() => setScan(false)}
        onCode={(code) => {
          setScan(false);
          setTimeout(() => {
            if (!locate(code)) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
              Alert.alert("Нет в заказе", `Товара со штрихкодом ${code.trim()} в этом заказе нет.`);
            }
          }, 350);
        }}
      />
      <Sheet open={photoFor !== null} onClose={() => setPhotoFor(null)} title="Фото позиции">
        <SheetOptions
          options={[
            { value: "camera", label: "Сфотографировать" },
            { value: "library", label: "Выбрать из галереи" },
          ]}
          value=""
          onSelect={addPhoto}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressBar: { height: 8, borderRadius: 4, backgroundColor: "rgba(139,61,255,0.15)", marginTop: 12, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: VIOLET },
  findRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  find: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14 },
  scanBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#c13bd6", alignItems: "center", justifyContent: "center" },
  thumb: { width: 76, height: 76, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  factRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  factInput: { minWidth: 70, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, fontSize: 17, textAlign: "center" },
  codes: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  code: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  note: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginTop: 10, minHeight: 42 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  photo: { width: 64, height: 64, borderRadius: 10 },
  addPhoto: { borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
});
