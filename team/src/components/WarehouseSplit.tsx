import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { put } from "@/api";
import { useIOS } from "@/ios";
import { VIOLET } from "@/components/kit";

export type Split = { shop: number; stock: number; suggested: boolean; shopQty: number; stockQty: number; onlyStock?: boolean; primary?: "shop" | "stock" };
export type WarehouseLabels = { shop: string; stock: string };

type Mode = "shop" | "stock" | "split";

/**
 * Wholesale: where a line is taken from — one switch «Магазин / Склад / Разделить» (owner's choice «Б»,
 * 2026-11-09). 1С gets two «Заказ покупателя»: the shop («Мега Косметичка», ≥ 12 must stay on its
 * shelves) and the warehouse («Склад»). «Разделить» shows a − / + for the pieces from the warehouse.
 * Until the picker touches it the server suggests the split («подсказка»): all from the shop when it has the whole
 * order, otherwise the warehouse gives what it has and the shop the rest (owner, 2026-11-11).
 */
export function WarehouseSplit({ orderId, itemId, quantity, split, labels }: { orderId: number; itemId: number; quantity: number; split: Split; labels: WarehouseLabels }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [stock, setStock] = useState(split.stock);
  const [suggested, setSuggested] = useState(split.suggested);
  const [splitOpen, setSplitOpen] = useState(false);
  // what the picker is typing in the «Со склада» field (null — shows the saved number)
  const [typed, setTyped] = useState<string | null>(null);
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
    }, 400);
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
  const mode: Mode = splitOpen || (stock > 0 && stock < quantity) ? "split" : stock === quantity ? "stock" : "shop";
  const canSplit = quantity > 1;

  const choose = (m: Mode) => {
    if (m === "shop") {
      setSplitOpen(false);
      set(0);
    } else if (m === "stock") {
      setSplitOpen(false);
      set(quantity);
    } else {
      setSplitOpen(true);
      // start from the 12-piece rule when it splits, otherwise half and half
      if (stock === 0 || stock === quantity) set(split.stock > 0 && split.stock < quantity ? split.stock : Math.ceil(quantity / 2));
    }
  };

  const shopLeft = split.shopQty - shop; // what stays on the shop shelves
  const warn =
    shop > 0 && shop > split.shopQty
      ? `В магазине только ${split.shopQty} шт.`
      : stock > split.stockQty
        ? `На складе только ${split.stockQty} шт.`
        : shop > 0 && shopLeft < 12
          ? `В магазине останется ${shopLeft} шт. (меньше 12)`
          : null;

  const soft = dark ? "#352044" : "#F1EEF7";
  const seg = (m: Mode, title: string, sub: number | null) => {
    const on = mode === m;
    return (
      <Pressable key={m} onPress={() => choose(m)} style={[styles.seg, on && { backgroundColor: VIOLET }]} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`Брать: ${m === "shop" ? labels.shop : m === "stock" ? labels.stock : "разделить"}`}>
        <Text style={{ color: on ? "#fff" : c.label, fontWeight: "700", fontSize: 15 }} numberOfLines={1}>
          {title}
        </Text>
        {sub !== null ? (
          <Text style={{ color: on ? "rgba(255,255,255,0.85)" : c.secondary, fontSize: 13.5 }} numberOfLines={1}>
            есть <Text style={{ color: on ? "#fff" : c.label, fontSize: 19, fontWeight: "800" }}>{sub}</Text>
          </Text>
        ) : null}
      </Pressable>
    );
  };

  // 12 or fewer in the shop: only the warehouse, nothing to choose (owner, 2026-11-11)
  if (split.onlyStock ?? split.shopQty <= 12) {
    return (
      <View style={styles.box}>
        <Text style={{ color: c.secondary, fontSize: 13 }}>Брать из</Text>
        <View style={[styles.locked, { backgroundColor: VIOLET }]} accessibilityLabel={`Брать: ${labels.stock}, есть ${split.stockQty}`}>
          <Ionicons name="lock-closed" size={15} color="rgba(255,255,255,0.85)" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Склад</Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13.5 }}>
            есть <Text style={{ color: "#fff", fontSize: 19, fontWeight: "800" }}>{split.stockQty}</Text>
          </Text>
        </View>
        <Text style={{ color: c.secondary, fontSize: 12.5 }}>В магазине {split.shopQty} шт. — меньше 12, поэтому только со склада</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Text style={{ color: c.secondary, fontSize: 13 }}>Брать из</Text>
        {suggested ? (
          <Text style={{ color: VIOLET, fontSize: 12 }}>{split.primary === "shop" ? "подсказка: весь заказ есть в магазине" : split.primary === "stock" ? "подсказка: основное со склада" : "подсказка"}</Text>
        ) : saving ? (
          <Text style={{ color: c.secondary, fontSize: 12 }}>Сохраняем…</Text>
        ) : err ? (
          <Text style={{ color: "#DC2626", fontSize: 12, flexShrink: 1 }} numberOfLines={1}>
            {err}
          </Text>
        ) : (
          <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
        )}
      </View>

      <View style={[styles.bar, { backgroundColor: soft }]}>
        {seg("shop", "Магазин", split.shopQty)}
        {seg("stock", "Склад", split.stockQty)}
        {canSplit ? seg("split", "Разделить", null) : null}
      </View>

      {mode === "split" ? (
        <View style={styles.stepRow}>
          <Text style={{ color: c.label, fontSize: 14 }}>Со склада</Text>
          <Pressable onPress={() => set(stock - 1)} disabled={stock <= 1} style={[styles.step, { backgroundColor: soft, opacity: stock <= 1 ? 0.4 : 1 }]} accessibilityLabel="Со склада на одну меньше">
            <Ionicons name="remove" size={18} color={VIOLET} />
          </Pressable>
          <TextInput
            value={typed ?? String(stock)}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, "").slice(0, 5);
              setTyped(digits);
              if (digits !== "") set(Math.min(quantity, Number(digits)));
            }}
            onBlur={() => setTyped(null)}
            onSubmitEditing={() => setTyped(null)}
            selectTextOnFocus
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={5}
            accessibilityLabel="Сколько штук со склада"
            style={[styles.qty, { color: c.label, borderColor: dark ? "#43295A" : "#E4E2EC" }]}
          />
          <Pressable onPress={() => set(stock + 1)} disabled={stock >= quantity - 1} style={[styles.step, { backgroundColor: soft, opacity: stock >= quantity - 1 ? 0.4 : 1 }]} accessibilityLabel="Со склада на одну больше">
            <Ionicons name="add" size={18} color={VIOLET} />
          </Pressable>
          <Text style={{ color: c.label, fontSize: 14, flexShrink: 1 }}>шт., из магазина {shop}</Text>
        </View>
      ) : null}

      {warn ? <Text style={{ color: "#EA580C", fontSize: 12.5 }}>{warn}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  locked: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 54, borderRadius: 12 },
  box: { marginTop: 12, gap: 6 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  bar: { flexDirection: "row", borderRadius: 12, padding: 3, gap: 3 },
  seg: { flex: 1, minHeight: 54, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, paddingVertical: 5 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 },
  qty: { width: 64, flexGrow: 0, flexShrink: 0, height: 36, borderWidth: 1.5, borderRadius: 10, fontSize: 20, fontWeight: "800", textAlign: "center", paddingHorizontal: 6 },
  step: { width: 36, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});
