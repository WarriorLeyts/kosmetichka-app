import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { put } from "@/api";
import { useIOS } from "@/ios";
import { VIOLET } from "@/components/kit";

export type Split = { shop: number; stock: number; suggested: boolean; shopQty: number; stockQty: number };
export type WarehouseLabels = { shop: string; stock: string };

/**
 * Wholesale: where a line is taken from. 1С gets two «Заказ покупателя» — the shop («Мега Косметичка»,
 * ≥ 12 must stay on its shelves) and the warehouse («Склад»). The stepper moves pieces between them;
 * until the picker touches it the server suggests the split by the 12-piece rule («подсказка»).
 */
export function WarehouseSplit({ orderId, itemId, quantity, split, labels }: { orderId: number; itemId: number; quantity: number; split: Split; labels: WarehouseLabels }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [stock, setStock] = useState(split.stock);
  const [suggested, setSuggested] = useState(split.suggested);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);

  // the order is re-read every 20 s: take the server's value unless the picker is changing it right now
  useEffect(() => {
    if (pending.current || busy.current) return;
    setStock(split.stock);
    setSuggested(split.suggested);
  }, [split.stock, split.suggested]);
  useEffect(() => () => void (pending.current && clearTimeout(pending.current)), []);

  const save = (n: number) => {
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(async () => {
      pending.current = null;
      busy.current = true;
      setSaving(true);
      try {
        await put(`/api/team/picker/orders/${orderId}/items/${itemId}/warehouse`, { stock: n });
        setErr(null);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Не сохранилось");
      } finally {
        busy.current = false;
        setSaving(false);
      }
    }, 500);
  };

  const set = (n: number) => {
    const v = Math.max(0, Math.min(quantity, n));
    if (v === stock && !suggested) return;
    Haptics.selectionAsync().catch(() => {});
    setStock(v);
    setSuggested(false);
    save(v);
  };

  const shop = quantity - stock;
  const shopLeft = split.shopQty - shop; // what stays on the shop shelves
  const shopWarn = shop > 0 && shopLeft < 12;
  const stockWarn = stock > split.stockQty;
  const border = dark ? "#43295A" : "#E4E2EC";
  const soft = dark ? "#352044" : "#F3F1F8";

  const side = (title: string, n: number, have: number, warn: boolean, hint: string | null) => (
    <View style={[styles.side, { borderColor: warn ? "#EA580C" : border }]}>
      <Text style={{ color: c.secondary, fontSize: 12.5 }} numberOfLines={1}>
        {title}
      </Text>
      <Text style={{ color: c.label, fontSize: 20, fontWeight: "800" }}>{n} шт.</Text>
      <Text style={{ color: warn ? "#EA580C" : c.secondary, fontSize: 12 }}>
        есть {have}
        {hint ? ` · ${hint}` : ""}
      </Text>
    </View>
  );

  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Text style={{ color: c.label, fontWeight: "700" }}>Откуда брать</Text>
        {suggested ? (
          <View style={[styles.tag, { backgroundColor: dark ? "rgba(200,160,255,0.16)" : "#EFE7FF" }]}>
            <Ionicons name="bulb-outline" size={12} color={VIOLET} />
            <Text style={{ color: VIOLET, fontSize: 11.5, fontWeight: "600" }}>подсказка: в магазине ≥ 12</Text>
          </View>
        ) : saving ? (
          <Text style={{ color: c.secondary, fontSize: 12 }}>Сохраняем…</Text>
        ) : err ? (
          <Text style={{ color: "#DC2626", fontSize: 12 }} numberOfLines={1}>
            {err}
          </Text>
        ) : (
          <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
        )}
      </View>

      <View style={styles.row}>
        {side(labels.shop, shop, split.shopQty, shopWarn, shop > 0 ? `останется ${Math.max(0, shopLeft)}` : null)}
        <View style={styles.stepper}>
          <Pressable onPress={() => set(stock - 1)} disabled={stock <= 0} style={[styles.step, { backgroundColor: soft, opacity: stock <= 0 ? 0.4 : 1 }]} accessibilityLabel={`Одну штуку в ${labels.shop}`}>
            <Ionicons name="arrow-back" size={18} color={VIOLET} />
          </Pressable>
          <Pressable onPress={() => set(stock + 1)} disabled={stock >= quantity} style={[styles.step, { backgroundColor: soft, opacity: stock >= quantity ? 0.4 : 1 }]} accessibilityLabel={`Одну штуку на ${labels.stock}`}>
            <Ionicons name="arrow-forward" size={18} color={VIOLET} />
          </Pressable>
        </View>
        {side(labels.stock, stock, split.stockQty, stockWarn, null)}
      </View>

      <View style={styles.quick}>
        <Pressable onPress={() => set(0)} style={[styles.qbtn, { backgroundColor: stock === 0 && !suggested ? VIOLET : soft }]}>
          <Text style={{ color: stock === 0 && !suggested ? "#fff" : c.label, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
            Всё из магазина
          </Text>
        </Pressable>
        <Pressable onPress={() => set(quantity)} style={[styles.qbtn, { backgroundColor: stock === quantity && !suggested ? VIOLET : soft }]}>
          <Text style={{ color: stock === quantity && !suggested ? "#fff" : c.label, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
            Всё со склада
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 12, gap: 8 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  row: { flexDirection: "row", alignItems: "stretch", gap: 8 },
  side: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, gap: 1 },
  stepper: { justifyContent: "center", gap: 6 },
  step: { width: 40, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  quick: { flexDirection: "row", gap: 8 },
  qbtn: { flex: 1, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
});
