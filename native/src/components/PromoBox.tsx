import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api";
import { iosText, useIOS } from "../ios";
import { money } from "../format";
import { tap } from "./ui";
import type { CartItem } from "../types";

export type Promo = { code: string; name?: string; subtotal: number; discount: number; total: number };

const VIOLET = "#8b3dff";
const lines = (items: CartItem[]) =>
  items.filter((i) => Number.isInteger(i.quantity) && i.quantity > 0).map((i) => ({ id: i.id, quantity: i.quantity, variantName: i.variantName ?? null }));

/**
 * «Промокод» in the cart: the code is checked by the site with MAXMA against the current cart;
 * when the cart changes it is checked again (a code can stop fitting — e.g. a minimum sum).
 */
export function PromoBox({ items, promo, onChange }: { items: CartItem[]; promo: Promo | null; onChange: (p: Promo | null) => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const seq = useRef(0);

  const check = async (value: string, quiet = false) => {
    const my = ++seq.current;
    setBusy(true);
    if (!quiet) setError("");
    try {
      const r = await api.promoCheck(value, lines(items));
      if (my !== seq.current) return;
      onChange({ code: r.code || value, name: r.name, subtotal: r.subtotal, discount: r.discount, total: r.total });
      setError("");
    } catch (e) {
      if (my !== seq.current) return;
      onChange(null);
      const msg = e instanceof Error ? e.message : "Не удалось проверить промокод";
      setError(quiet ? `Промокод ${value} больше не подходит: ${msg}` : msg);
    } finally {
      if (my === seq.current) setBusy(false);
    }
  };

  // the cart changed: check the applied code again (debounced)
  const key = JSON.stringify(lines(items));
  const applied = promo?.code;
  useEffect(() => {
    if (!applied) return;
    const t = setTimeout(() => check(applied, true), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, applied]);

  const field = dark ? "#2B193D" : "#EEEEF3";

  if (promo) {
    return (
      <View style={[styles.applied, { backgroundColor: dark ? "rgba(52,199,89,0.14)" : "rgba(52,199,89,0.1)" }]}>
        <Ionicons name="pricetag" size={18} color="#1f8a3b" />
        <View style={{ flex: 1 }}>
          <Text style={[iosText.subhead, { color: c.label, fontWeight: "600" }]} numberOfLines={1}>
            Промокод {promo.code}
          </Text>
          <Text style={[iosText.footnote, { color: c.secondary }]} numberOfLines={2}>
            {promo.name ? `${promo.name} · ` : ""}скидка {money(promo.discount)}
          </Text>
        </View>
        {busy ? <ActivityIndicator color={VIOLET} /> : null}
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Убрать промокод"
          onPress={() => {
            tap();
            seq.current++;
            onChange(null);
            setError("");
          }}
        >
          <Ionicons name="close-circle" size={22} color={c.secondary} />
        </Pressable>
      </View>
    );
  }

  if (!open) {
    return (
      <View>
        <Pressable
          onPress={() => {
            tap();
            setOpen(true);
          }}
          accessibilityRole="button"
          style={styles.toggle}
        >
          <Ionicons name="pricetag-outline" size={19} color={VIOLET} />
          <Text style={[iosText.body, { color: VIOLET }]}>Есть промокод?</Text>
        </Pressable>
        {error ? <Text style={[iosText.footnote, styles.err]}>{error}</Text> : null}
      </View>
    );
  }

  const submit = () => {
    const v = code.trim();
    if (!v || busy) return;
    tap();
    check(v);
  };

  return (
    <View style={{ marginTop: 14 }}>
      <Text style={[styles.label, { color: c.label }]}>Промокод</Text>
      <View style={styles.row}>
        <TextInput
          value={code}
          onChangeText={(v) => {
            setCode(v);
            if (error) setError("");
          }}
          placeholder="Введите промокод"
          placeholderTextColor={c.secondary}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={submit}
          style={[styles.input, { backgroundColor: field, color: c.label }]}
        />
        <Pressable
          onPress={submit}
          disabled={busy || !code.trim()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.apply, { opacity: busy || !code.trim() ? 0.5 : pressed ? 0.85 : 1 }]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyText}>Применить</Text>}
        </Pressable>
      </View>
      {error ? <Text style={[iosText.footnote, styles.err]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, marginTop: 8 },
  label: { fontSize: 20, fontWeight: "700", marginBottom: 10 },
  row: { flexDirection: "row", gap: 10 },
  input: { flex: 1, height: 52, borderRadius: 16, paddingHorizontal: 16, fontSize: 16 },
  apply: { height: 52, borderRadius: 16, paddingHorizontal: 18, backgroundColor: VIOLET, alignItems: "center", justifyContent: "center" },
  applyText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  applied: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, padding: 14, marginTop: 14 },
  err: { color: "#FF3B30", marginTop: 6 },
});
