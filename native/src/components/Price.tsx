import { Text, View } from "react-native";
import { colors } from "../theme";
import { GradientText } from "./GradientText";
import { money } from "../format";
import { resolveCustomerPriceType, type PriceType } from "../pricing";
import type { Customer, Product } from "../types";

type Row = { label: string; value: number; active: boolean };

/** Same price rows the website shows, depending on the customer's tier. */
export function priceRows(product: Product, customer: Customer | null, active: PriceType): Row[] {
  const base = resolveCustomerPriceType(customer);
  const n = (v: number | null | undefined) => Number(v ?? 0);
  const rows: Row[] = [];
  if (base === "guest" || base === "discount") {
    const hasDiscount = n(product.discountPrice) > 0 && n(product.discountPrice) !== n(product.retailPrice);
    rows.push({ label: "Розница", value: n(product.retailPrice), active: !hasDiscount });
    if (hasDiscount) rows.push({ label: "Скидка", value: n(product.discountPrice), active: true });
  } else if (base === "retail") {
    rows.push({ label: "Розница", value: n(product.retailPrice), active: true });
  } else if (base === "wholesale") {
    rows.push({ label: "Скидка", value: n(product.discountPrice ?? product.retailPrice), active: active === "discount" });
    rows.push({ label: "Опт", value: n(product.wholesalePrice), active: active === "wholesale" });
    if (n(product.bigWholesalePrice) > 0 && n(product.bigWholesalePrice) !== n(product.wholesalePrice))
      rows.push({ label: "Кр. опт", value: n(product.bigWholesalePrice), active: active === "big_wholesale" });
  } else {
    rows.push({ label: "Опт", value: n(product.wholesalePrice), active: false });
    rows.push({ label: "Кр. опт", value: n(product.bigWholesalePrice ?? product.wholesalePrice), active: true });
  }
  return rows;
}

/** Rows styled like the site's .price-row / .price-row-active / .price-row-muted. */
export function PriceRows({ rows, large }: { rows: Row[]; large?: boolean }) {
  const multi = rows.length > 1;
  return (
    <View style={{ gap: large ? 8 : 3 }}>
      {rows.map((r) => {
        const highlighted = r.active;
        const muted = multi && !r.active;
        const label = { fontSize: large ? 15 : 12.5, fontWeight: highlighted ? "800" : "600", color: highlighted ? colors.violet : muted ? colors.faint : colors.muted } as const;
        const value = { fontSize: large ? (highlighted ? 24 : 16) : highlighted ? 15 : 12.5, fontWeight: highlighted ? "900" : "700" } as const;
        return (
          <View key={r.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: large ? 28 : 20 }}>
            <Text style={label}>{r.label}:</Text>
            {highlighted ? (
              <GradientText style={value}>{money(r.value)}</GradientText>
            ) : (
              <Text style={[value, { color: muted ? colors.slate : colors.text }]}>{money(r.value)}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
