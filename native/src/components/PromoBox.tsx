import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { iosText, useIOS } from "../ios";
import { money } from "../format";
import { tap } from "./ui";

const VIOLET = "#8b3dff";

/** «Промокод» in the cart — the parent checks the code with the site (MAXMA) and passes the result in. */
export function PromoBox({
  applied, name, discount, error, busy, onApply, onRemove,
}: {
  applied: string | null;
  name?: string | null;
  discount?: number;
  error?: string;
  busy?: boolean;
  onApply: (code: string) => void;
  onRemove: () => void;
}) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");

  if (applied) {
    return (
      <View style={[styles.applied, { backgroundColor: dark ? "rgba(52,199,89,0.14)" : "rgba(52,199,89,0.1)" }]}>
        <Ionicons name="pricetag" size={18} color="#1f8a3b" />
        <View style={{ flex: 1 }}>
          <Text style={[iosText.subhead, { color: c.label, fontWeight: "600" }]} numberOfLines={1}>
            Промокод {applied}
          </Text>
          <Text style={[iosText.footnote, { color: error ? "#FF3B30" : c.secondary }]} numberOfLines={2}>
            {error ? error : `${name ? `${name} · ` : ""}скидка ${money(discount ?? 0)}`}
          </Text>
        </View>
        {busy ? <ActivityIndicator color={VIOLET} /> : null}
        <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel="Убрать промокод" onPress={() => { tap(); onRemove(); }}>
          <Ionicons name="close-circle" size={22} color={c.secondary} />
        </Pressable>
      </View>
    );
  }

  if (!open) {
    return (
      <View>
        <Pressable onPress={() => { tap(); setOpen(true); }} accessibilityRole="button" style={styles.toggle}>
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
    onApply(v);
  };

  return (
    <View style={{ marginTop: 14 }}>
      <Text style={[styles.label, { color: c.label }]}>Промокод</Text>
      <View style={styles.row}>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="Введите промокод"
          placeholderTextColor={c.secondary}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={submit}
          style={[styles.input, { backgroundColor: dark ? "#2B193D" : "#EEEEF3", color: c.label }]}
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

/** MAXMA bonuses: «Списать бонусы» (retail with a card) and how many will be accrued for the order. */
export function BonusBox({
  bonuses, on, onToggle, busy,
}: {
  bonuses: { canSpend: boolean; balance: number | null; maxToApply: number; applied: number; collected: number };
  on: boolean;
  onToggle: (v: boolean) => void;
  busy?: boolean;
}) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const canSpend = bonuses.canSpend && (bonuses.maxToApply > 0 || on);
  return (
    <View style={[styles.bonus, { backgroundColor: dark ? "rgba(139,61,255,0.14)" : "rgba(139,61,255,0.07)" }]}>
      {canSpend ? (
        <View style={styles.bonusRow}>
          <Ionicons name="gift-outline" size={20} color={VIOLET} />
          <View style={{ flex: 1 }}>
            <Text style={[iosText.body, { color: c.label, fontWeight: "600" }]}>Списать бонусы</Text>
            <Text style={[iosText.footnote, { color: c.secondary }]}>
              {bonuses.balance != null ? `Доступно ${bonuses.balance.toLocaleString("ru-RU")} · ` : ""}можно списать до {bonuses.maxToApply.toLocaleString("ru-RU")}
            </Text>
          </View>
          {busy ? <ActivityIndicator color={VIOLET} style={{ marginRight: 6 }} /> : null}
          <Switch
            value={on}
            onValueChange={(v) => {
              tap();
              onToggle(v);
            }}
            trackColor={{ true: VIOLET, false: dark ? "#4A3A5C" : "#D1D1D6" }}
            thumbColor="#fff"
            accessibilityLabel="Списать бонусы"
          />
        </View>
      ) : bonuses.balance != null ? (
        <View style={styles.bonusRow}>
          <Ionicons name="gift-outline" size={20} color={VIOLET} />
          <Text style={[iosText.subhead, { color: c.secondary, flex: 1 }]}>На карте {bonuses.balance.toLocaleString("ru-RU")} бонусов</Text>
        </View>
      ) : null}
      {bonuses.collected > 0 ? (
        <Text style={[iosText.footnote, { color: c.secondary, marginTop: canSpend || bonuses.balance != null ? 8 : 0 }]}>
          За заказ начислится {bonuses.collected.toLocaleString("ru-RU")} бонусов — после выполнения заказа
        </Text>
      ) : null}
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
  bonus: { borderRadius: 16, padding: 14, marginTop: 14 },
  bonusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
