import { Text, View } from "react-native";
import { colors } from "../theme";
import { BRAND_GRADIENT, GradientText } from "./GradientText";
import { money } from "../format";
import { resolveCustomerPriceType, type PriceType } from "../pricing";
import type { Customer, Product } from "../types";

type Row = { label: string; value: number; active: boolean };

/** Same price rows the website shows, depending on the customer's tier. */
export function priceRows(product: Product, customer: Customer | null, active: PriceType): Row[] {
  const base = resolveCustomerPriceType(customer);
  const n = (v: number | null | undefined) => Number(v ?? 0);
  const rows: Row[] = [];
  if (base === "wholesale" || base === "big_wholesale") {
    // wholesale customers see only the wholesale prices
    rows.push({ label: "Опт", value: n(product.wholesalePrice), active: active === "wholesale" });
    rows.push({ label: "Кр. опт", value: n(product.bigWholesalePrice ?? product.wholesalePrice), active: active === "big_wholesale" });
  } else {
    // retail customers (and guests) see the retail and the discount price
    rows.push({ label: "Розница", value: n(product.retailPrice), active: active === "retail" });
    rows.push({ label: "Скидка", value: n(product.discountPrice ?? product.retailPrice), active: active !== "retail" });
  }
  return rows;
}

export function PriceRows({ rows, large }: { rows: Row[]; large?: boolean }) {
  return (
    <View style={{ gap: large ? 6 : 2 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: large ? 15 : 12, color: r.active ? colors.text : colors.faint, fontWeight: r.active ? "600" : "400" }}>
            {r.label}
          </Text>
          {r.active && !large ? (
            // catalog card: active price in the site's brand gradient (like .price-row-active b)
            <GradientText style={{ fontSize: 15, fontWeight: "800" }} colors={BRAND_GRADIENT}>
              {money(r.value)}
            </GradientText>
          ) : (
            <Text
              style={{
                fontSize: large ? (r.active ? 22 : 16) : r.active ? 15 : 12,
                fontWeight: r.active ? "800" : "500",
                color: r.active ? colors.pink : colors.faint,
              }}
            >
              {money(r.value)}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
