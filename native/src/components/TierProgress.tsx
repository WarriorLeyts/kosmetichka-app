import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { money } from "../format";
import { BIG_WHOLESALE_MIN_ORDER, cartPriceTier, rawCartTotal, resolveCustomerPriceType, WHOLESALE_MIN_ORDER, type PriceType } from "../pricing";
import { FitText } from "./FitText";

const VIOLET = "#8b3dff";
const GREEN = "#16A34A";

/** PREVIEW ONLY: «?v=b» shows variant B (steps above the bar). */
const STEPS = typeof location !== "undefined" && /[?&]v=b\b/.test(location.search);

/**
 * «Опт» customers, above «Оформить заказ»: the price goes by the order sum. One short line (how much more
 * to the next price), a bar to the threshold, the saving below. Reached → green.
 */
export function TierProgress({ items, customer, dark }: { items: { quantity: number }[]; customer: { priceType?: string | null } | null; dark: boolean }) {
  if (!customer || resolveCustomerPriceType(customer) !== "wholesale" || items.length === 0) return null;
  const tier = cartPriceTier(items, customer);
  const sum = (t: PriceType) => rawCartTotal(items, t);
  const discount = sum("discount");

  // what to aim at: wholesale (in wholesale prices) → big wholesale (in big wholesale prices) → nothing more
  const goal =
    tier === "discount"
      ? { label: "оптовых цен", min: WHOLESALE_MIN_ORDER, have: sum("wholesale"), save: discount - sum("wholesale") }
      : tier === "wholesale"
        ? { label: "крупного опта", min: BIG_WHOLESALE_MIN_ORDER, have: sum("big_wholesale"), save: sum("wholesale") - sum("big_wholesale") }
        : null;
  const reached =
    tier === "wholesale" ? { title: "Оптовые цены", save: discount - sum("wholesale") } : tier === "big_wholesale" ? { title: "Крупнооптовые цены", save: discount - sum("big_wholesale") } : null;

  const track = dark ? "rgba(255,255,255,0.14)" : "rgba(139,61,255,0.14)";
  const sub = dark ? "rgba(255,255,255,0.7)" : "#6B5A7B";
  const label = dark ? "#fff" : "#1C1030";
  const bg = dark ? "rgba(139,61,255,0.16)" : "#F6F0FF";

  return (
    <View style={[styles.card, { backgroundColor: bg }]} accessibilityRole="summary">
      {STEPS ? <Steps tier={tier} dark={dark} /> : null}

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
          <FitText minimumFontScale={0.8} style={[styles.title, { color: label }]}>
            {`До ${goal.label} — ещё ${money(goal.min - goal.have)}`}
          </FitText>
          <View style={[styles.track, { backgroundColor: track }]}>
            <View style={[styles.fill, { width: `${Math.max(4, Math.min(100, (goal.have / goal.min) * 100))}%` }]} />
          </View>
          <View style={[styles.row, { justifyContent: "space-between", marginTop: 6 }]}>
            <Text style={[styles.small, { color: sub }]}>{`${money(goal.have)} из ${money(goal.min)}`}</Text>
          </View>
          {goal.save > 0 ? (
            <Text style={[styles.save, { color: sub }]}>
              Этот заказ станет дешевле на <Text style={{ color: VIOLET, fontWeight: "700" }}>{money(goal.save)}</Text>
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Variant B: «Скидка → Опт → Крупный опт», the current step highlighted. */
function Steps({ tier, dark }: { tier: PriceType; dark: boolean }) {
  const steps: { t: PriceType; name: string; from: string }[] = [
    { t: "discount", name: "Скидка", from: "до 5 000 ₽" },
    { t: "wholesale", name: "Опт", from: "от 5 000 ₽" },
    { t: "big_wholesale", name: "Кр. опт", from: "от 50 000 ₽" },
  ];
  const at = steps.findIndex((s) => s.t === tier);
  return (
    <View style={[styles.row, { gap: 6, marginBottom: 14 }]}>
      {steps.map((s, i) => {
        const on = i === at;
        const done = i < at;
        return (
          <View key={s.t} style={[styles.step, { backgroundColor: on ? VIOLET : dark ? "rgba(255,255,255,0.08)" : "#fff", borderColor: on ? VIOLET : done ? GREEN : "rgba(139,61,255,0.25)" }]}>
            <Text style={[styles.stepName, { color: on ? "#fff" : done ? GREEN : dark ? "#fff" : "#1C1030" }]}>
              {done ? "✓ " : ""}
              {s.name}
            </Text>
            <Text style={[styles.stepFrom, { color: on ? "rgba(255,255,255,0.85)" : dark ? "rgba(255,255,255,0.6)" : "#8A7A9B" }]}>{s.from}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, marginTop: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  reached: { flex: 1, fontSize: 17, fontWeight: "800" },
  title: { fontSize: 18, fontWeight: "800" },
  track: { height: 12, borderRadius: 6, marginTop: 10, overflow: "hidden" },
  fill: { height: 12, borderRadius: 6, backgroundColor: VIOLET },
  small: { fontSize: 13 },
  save: { fontSize: 15, marginTop: 6 },
  step: { flex: 1, borderRadius: 12, borderWidth: 1.5, paddingVertical: 7, paddingHorizontal: 6, alignItems: "center" },
  stepName: { fontSize: 14, fontWeight: "800" },
  stepFrom: { fontSize: 11, marginTop: 1 },
});
