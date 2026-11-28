import { Text, View } from "react-native";
import { colors } from "../theme";
import { BRAND_GRADIENT, GradientText } from "./GradientText";
import { money } from "../format";
import { wholesaleMinOrder, bigWholesaleMinOrder, priceFor, resolveCustomerPriceType, type PriceType } from "../pricing";
import type { Customer, Product } from "../types";

type Row = { label: string; value: number; active: boolean; color?: string; hint?: string; pending?: boolean };

/** «Опт» customers see three prices (Скидка до 5 000 ₽ / Опт от 5 000 / Кр. опт от 50 000), all alike. */

/** Same price rows the website shows, depending on the customer's tier (a missing price falls back like the server's). */
export function priceRows(product: Product, customer: Customer | null, active: PriceType): Row[] {
  const base = resolveCustomerPriceType(customer);
  const rows: Row[] = [];
  if (base === "franchise") {
    const price = priceFor(product, "franchise");
    rows.push({ label: "Франшиза", value: price, pending: price <= 0, active: true, color: "#8b3dff" });
    rows.push({ label: "По карте", value: priceFor(product, "discount"), active: false, color: "#c71f75" });
    rows.push({ label: "Розница", value: priceFor(product, "retail"), active: false, color: "#6B4E8A" });
  } else if (base === "wholesale") {
    // the price depends on the order sum: under 5 000 ₽ — discount, from 5 000 — wholesale, from 50 000 — big
    rows.push({ label: "Скидка", hint: `до ${money(wholesaleMinOrder())}`, value: priceFor(product, "discount"), active: active === "discount", color: "#6B4E8A" });
    rows.push({ label: "Опт", hint: `от ${money(wholesaleMinOrder())}`, value: priceFor(product, "wholesale"), active: active === "wholesale", color: "#c71f75" });
    rows.push({ label: "Кр. опт", hint: `от ${money(bigWholesaleMinOrder())}`, value: priceFor(product, "big_wholesale"), active: active === "big_wholesale", color: "#8b3dff" });
  } else if (base === "big_wholesale") {
    rows.push({ label: "Опт", value: priceFor(product, "wholesale"), active: active === "wholesale", color: "#c71f75" });
    rows.push({ label: "Кр. опт", value: priceFor(product, "big_wholesale"), active: active === "big_wholesale", color: "#8b3dff" });
  } else {
    // retail customers (and guests) see the retail and the discount price
    rows.push({ label: "Розница", value: priceFor(product, "retail"), active: active === "retail" });
    rows.push({ label: "Скидка по карте", value: priceFor(product, "discount"), active: active !== "retail" });
  }
  return rows;
}

export function PriceRows({ rows, large }: { rows: Row[]; large?: boolean }) {
  return (
    <View style={{ gap: large ? 6 : 2 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: r.pending ? "column" : "row", justifyContent: "space-between", alignItems: r.pending ? "flex-start" : "center" }}>
          <Text style={{ fontSize: large ? 15 : 13, color: r.active ? colors.text : colors.faint, fontWeight: r.active ? "600" : "400" }}>
            {r.label}
          </Text>
          {r.active && !large && !r.pending ? (
            // catalog card: active price in the site's brand gradient (like .price-row-active b)
            <GradientText style={{ fontSize: 15, fontWeight: "800" }} colors={BRAND_GRADIENT}>
              {r.pending ? "Цена не установлена" : money(r.value)}
            </GradientText>
          ) : (
            <Text
              style={{
                fontSize: r.pending ? 12 : large ? (r.active ? 22 : 17) : r.active ? 15 : 13,
                flexShrink: 1, textAlign: "right",
                fontWeight: r.active ? "800" : "500",
                color: r.active ? colors.pink : colors.faint,
              }}
            >
              {r.pending ? "Цена не установлена" : money(r.value)}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
