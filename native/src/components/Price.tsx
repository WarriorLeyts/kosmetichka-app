import { Text, View } from "react-native";
import { colors } from "../theme";
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

export function PriceRows({ rows, large }: { rows: Row[]; large?: boolean }) {
  return (
    <View style={{ gap: large ? 6 : 2 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text style={{ fontSize: large ? 15 : 12, color: r.active ? colors.text : colors.faint, fontWeight: r.active ? "600" : "400" }}>
            {r.label}
          </Text>
          <Text
            style={{
              fontSize: large ? (r.active ? 22 : 16) : r.active ? 15 : 12,
              fontWeight: r.active ? "800" : "500",
              color: r.active ? colors.pink : colors.faint,
            }}
          >
            {money(r.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}
