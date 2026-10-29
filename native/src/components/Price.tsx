import { Text, View } from "react-native";
import { colors } from "../theme";
import { BRAND_GRADIENT, GradientText } from "./GradientText";
import { money } from "../format";
import { cartPriceTier, effectivePriceType, resolveCustomerPriceType, type PriceType } from "../pricing";
import type { Customer, Product } from "../types";

type Row = { label: string; value: number; active: boolean; color?: string; hint?: string; dim?: boolean };

/**
 * «Опт» customers: the catalog shows three prices (Скидка / Опт / Кр. опт).
 * Variant A (highlight): the price the customer pays now (by the cart sum) is bright, the others dimmed.
 * Variant B: all three as they are, «Опт» first in importance.
 * PREVIEW ONLY: «?v=b» switches to variant B.
 */
export const PRICE_HIGHLIGHT = !(typeof location !== "undefined" && /[?&]v=b\b/.test(location.search));

/** The tier the catalog marks as «yours». */
export function catalogActive(cart: any[], customer: { priceType?: string | null } | null): PriceType {
  return PRICE_HIGHLIGHT ? cartPriceTier(cart, customer) : effectivePriceType(cart, customer);
}

/** Same price rows the website shows, depending on the customer's tier. */
export function priceRows(product: Product, customer: Customer | null, active: PriceType): Row[] {
  const base = resolveCustomerPriceType(customer);
  const n = (v: number | null | undefined) => Number(v ?? 0);
  const rows: Row[] = [];
  if (base === "wholesale") {
    // the price depends on the order sum: under 5 000 ₽ — discount, from 5 000 — wholesale, from 50 000 — big
    const dim = (t: PriceType) => PRICE_HIGHLIGHT && active !== t;
    rows.push({ label: "Скидка", hint: "до 5 000 ₽", value: n(product.discountPrice ?? product.retailPrice), active: active === "discount", color: "#6B4E8A", dim: dim("discount") });
    rows.push({ label: "Опт", hint: "от 5 000 ₽", value: n(product.wholesalePrice), active: active === "wholesale", color: "#e82c87", dim: dim("wholesale") });
    rows.push({ label: "Кр. опт", hint: "от 50 000 ₽", value: n(product.bigWholesalePrice ?? product.wholesalePrice), active: active === "big_wholesale", color: "#8b3dff", dim: dim("big_wholesale") });
  } else if (base === "big_wholesale") {
    rows.push({ label: "Опт", value: n(product.wholesalePrice), active: active === "wholesale", color: "#e82c87" });
    rows.push({ label: "Кр. опт", value: n(product.bigWholesalePrice ?? product.wholesalePrice), active: active === "big_wholesale", color: "#8b3dff" });
  } else {
    // retail customers (and guests) see the retail and the discount price
    rows.push({ label: "Розница", value: n(product.retailPrice), active: active === "retail" });
    rows.push({ label: "Скидка по карте", value: n(product.discountPrice ?? product.retailPrice), active: active !== "retail" });
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
