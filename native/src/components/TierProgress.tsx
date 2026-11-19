import { useCampaign } from "@/useCampaign";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { money } from "../format";
import { bigWholesaleMinOrder, cartPriceTier, rawCartTotal, resolveCustomerPriceType, wholesaleMinOrder, type PriceType } from "../pricing";
import { colors, themed } from "@/theme";

const GREEN = "#16A34A";

/**
 * «Опт» customers, above «Оформить заказ»: the price goes by the order sum. Steps «Скидка → Опт → Кр. опт»
 * (where the customer is), one short line (how much more to the next price), a bar, the saving below. Reached → green.
 */
export function TierProgress({ items, customer, dark }: { items: { quantity: number }[]; customer: { priceType?: string | null } | null; dark: boolean }) {
  useCampaign();
  const [explanationOpen, setExplanationOpen] = useState(true);
  if (!customer || resolveCustomerPriceType(customer) !== "wholesale" || items.length === 0) return null;
  const tier = cartPriceTier(items, customer);
  const sum = (t: PriceType) => rawCartTotal(items, t);
  const discount = sum("discount");

  // what to aim at: wholesale (in wholesale prices) → big wholesale (in big wholesale prices) → nothing more
  const goal =
    tier === "discount"
      ? { title: "Как перейти на опт", basis: "оптовым ценам", balance: "В корзине по опту", priceLabel: "По оптовым ценам", currentLabel: "Сейчас по скидочной цене", min: wholesaleMinOrder(), have: sum("wholesale"), save: discount - sum("wholesale") }
      : tier === "wholesale"
        ? { title: "Как перейти на крупный опт", basis: "крупнооптовым ценам", balance: "В корзине по крупному опту", priceLabel: "По крупнооптовым ценам", currentLabel: "Сейчас по оптовым ценам", min: bigWholesaleMinOrder(), have: sum("big_wholesale"), save: sum("wholesale") - sum("big_wholesale") }
        : null;
  const reached =
    tier === "wholesale" ? { title: "Оптовые цены", save: discount - sum("wholesale") } : tier === "big_wholesale" ? { title: "Крупнооптовые цены", save: discount - sum("big_wholesale") } : null;

  const track = dark ? "rgba(255,255,255,0.14)" : "rgba(139,61,255,0.14)";
  const sub = dark ? "rgba(255,255,255,0.7)" : "#6B5A7B";
  const label = dark ? "#fff" : "#1C1030";
  const bg = dark ? "rgba(139,61,255,0.16)" : "#F6F0FF";

  return (
    <View style={[styles.card, { backgroundColor: bg }]} accessibilityRole="summary">
      <Steps tier={tier} dark={dark} />

      {reached ? (
        <View style={styles.row}>
          <Ionicons name="checkmark-circle" size={22} color={GREEN} />
          <Text style={[styles.reached, { color: GREEN }]}>
            {reached.title}
            {reached.save > 0 ? <Text style={{ fontWeight: "600" }}>{` — экономите ${money(reached.save)}`}</Text> : null}
          </Text>
        </View>
      ) : null}

      {goal && goal.have < goal.min ? (
        <View style={{ marginTop: reached ? 12 : 0 }}>
          <Text style={[styles.title, { color: label }]}>{goal.title}</Text>
          <Text style={[styles.small, { color: sub, marginTop: 4 }]}>{`Порог считается по ${goal.basis}`}</Text>
          <View style={[styles.between, { marginTop: 16 }]}>
            <Text style={[styles.rowLabel, { color: label }]}>{goal.balance}</Text>
            <Text style={[styles.value, { color: label }]}>{money(goal.have)}</Text>
          </View>
          <View accessibilityRole="progressbar" accessibilityLabel={`Сумма корзины по ${goal.basis}`} accessibilityValue={{ min: 0, max: goal.min, now: goal.have }} style={[styles.track, { backgroundColor: track }]}>
            <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, (goal.have / goal.min) * 100))}%` }]} />
          </View>
          <View style={[styles.between, { marginTop: 6 }]}>
            <Text style={[styles.small, { color: sub }]}>{money(goal.have)}</Text>
            <Text style={[styles.small, { color: sub }]}>{`Порог ${money(goal.min)}`}</Text>
          </View>
          <Text style={[styles.title, { color: label, marginTop: 16 }]}>{`Осталось набрать на ${money(goal.min - goal.have)}`}</Text>
          <Text style={[styles.small, { color: sub, marginTop: 3 }]}>{`по ${goal.basis}`}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Почему сумма отличается?" accessibilityState={{ expanded: explanationOpen }} onPress={() => setExplanationOpen(v => !v)} style={styles.explainButton}>
            <Text style={[styles.explainLabel, { color: colors.brand }]}>Почему сумма отличается?</Text>
            <Ionicons name={explanationOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.brand} />
          </Pressable>
          {explanationOpen ? (
            <View>
              <View style={styles.between}>
                <Text style={[styles.rowLabel, { color: sub }]}>{goal.currentLabel}</Text>
                <Text style={[styles.small, { color: sub }]}>{money(sum(tier))}</Text>
              </View>
              <View style={[styles.between, { marginTop: 6 }]}>
                <Text style={[styles.rowLabel, { color: sub }]}>{goal.priceLabel}</Text>
                <Text style={[styles.small, { color: sub }]}>{money(goal.have)}</Text>
              </View>
              <Text style={[styles.save, { color: sub }]}>{`Когда корзина достигнет ${money(goal.min)} по ${goal.basis}, цены переключатся автоматически.`}</Text>
              {goal.save > 0 ? <Text style={[styles.save, { color: label }]}>На товарах, которые уже в корзине, экономия составит <Text style={{ fontWeight: "700" }}>{money(goal.save)}</Text>.</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** «Скидка → Опт → Крупный опт», the current step highlighted, the passed ones ticked. */
function Steps({ tier, dark }: { tier: PriceType; dark: boolean }) {
  const steps: { t: PriceType; name: string; from: string }[] = [
    { t: "discount", name: "Скидка", from: `до ${money(wholesaleMinOrder())}` },
    { t: "wholesale", name: "Опт", from: `от ${money(wholesaleMinOrder())}` },
    { t: "big_wholesale", name: "Кр. опт", from: `от ${money(bigWholesaleMinOrder())}` },
  ];
  const at = steps.findIndex((s) => s.t === tier);
  return (
    <View style={[styles.row, { gap: 6, marginBottom: 14 }]}>
      {steps.map((s, i) => {
        const on = i === at;
        const done = i < at;
        return (
          <View key={s.t} style={[styles.step, { backgroundColor: on ? colors.brand : dark ? "rgba(255,255,255,0.08)" : "#fff", borderColor: on ? colors.brand : done ? GREEN : "rgba(139,61,255,0.25)" }]}>
            <Text style={[styles.stepName, { color: on ? "#fff" : done ? GREEN : dark ? "#fff" : "#1C1030" }]}>
              {done ? "✓ " : ""}
              {s.name}
            </Text>
            <Text style={[styles.stepFrom, { color: on ? "rgba(255,255,255,0.85)" : dark ? "rgba(255,255,255,0.6)" : "#8A7A9B" }]}>{on ? "Сейчас" : s.from}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = themed(() => ({
  card: { borderRadius: 20, padding: 16, marginTop: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  reached: { flex: 1, fontSize: 17, fontWeight: "800" },
  title: { fontSize: 17, fontWeight: "800" },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" },
  rowLabel: { fontSize: 13, flex: 1, minWidth: 100 },
  value: { fontSize: 15, fontWeight: "700" },
  explainButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  explainLabel: { fontSize: 14, flexShrink: 1 },
  track: { height: 12, borderRadius: 6, marginTop: 10, overflow: "hidden" },
  fill: { height: 12, borderRadius: 6, backgroundColor: colors.brand },
  small: { fontSize: 13 },
  save: { fontSize: 15, marginTop: 6 },
  step: { flex: 1, borderRadius: 12, borderWidth: 1.5, paddingVertical: 7, paddingHorizontal: 6, alignItems: "center" },
  stepName: { fontSize: 15, fontWeight: "800" },
  stepFrom: { fontSize: 11, marginTop: 1 },
}));
