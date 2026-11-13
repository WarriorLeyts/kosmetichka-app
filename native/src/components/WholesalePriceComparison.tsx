import { StyleSheet, Text, View } from "react-native";
import { useCardScale } from "../cardScale";
import { money } from "../format";
import { wholesalePriceComparison } from "../wholesalePricePanels";
import type { Customer, Product } from "../types";
import { FitText } from "./FitText";

type Props = { product: Product; customer: Customer | null; large?: boolean; dark?: boolean };

/** Each tariff's old price, current price and actual saving in one compact panel. */
export function WholesalePriceComparison({ product, customer, large = false, dark = false }: Props) {
  const cardScale = useCardScale();
  const comparison = wholesalePriceComparison(product, customer);
  if (!comparison) return null;
  const k = large ? 1 : cardScale;
  const { cells, onSale } = comparison;
  return (
    <View style={{ marginTop: large ? 14 : 9 * k, borderRadius: 14 * k,
      paddingVertical: 7 * k, backgroundColor: dark ? "#FBF3FA" : "#fdf2f8" }}>
      {onSale ? (
        <Text style={{ alignSelf: "center", color: "#b31668", backgroundColor: "#fce0ef",
          borderRadius: 12 * k, paddingHorizontal: 9 * k, paddingVertical: 3 * k,
          fontSize: large ? 12 : 10, fontWeight: "800", marginBottom: 6 * k }}>
          ЦЕНЫ ПО АКЦИИ
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", minHeight: onSale ? (large ? 106 : 83 * k) : (large ? 64 : 48 * k) }}>
        {cells.map((row, i) => (
          <View key={row.key}
            accessible
            accessibilityLabel={row.oldValue !== null
              ? `${row.label}: было ${money(row.oldValue)}, по акции ${money(row.value!)}, выгода ${money(row.saving)}`
              : `${row.label}: ${row.value === null ? "цена не указана" : money(row.value)}`}
            style={{ flex: 1, minWidth: 0, paddingHorizontal: large ? 8 : 3 * k,
              justifyContent: "center", alignItems: "center",
              ...(i > 0 ? { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: "rgba(139,61,255,0.18)" } : {}) }}>
            <Text numberOfLines={1} style={{ fontSize: large ? 13 : 10,
              lineHeight: large ? 18 : 14, textAlign: "center", color: row.color }}>
              {row.label}
            </Text>
            {onSale ? (
              <FitText minimumFontScale={0.65} style={{ width: "100%", textAlign: "center",
                fontSize: large ? 16 : 11, lineHeight: large ? 24 : 18,
                color: "#85808a", textDecorationLine: row.oldValue !== null ? "line-through" : "none" }}>
                {row.oldValue === null ? " " : money(row.oldValue)}
              </FitText>
            ) : null}
            <FitText minimumFontScale={0.6} style={{ fontSize: large ? 24 : k === 1 ? 16 : 13,
              fontWeight: "800", color: row.color, textAlign: "center", width: "100%" }}>
              {row.value === null ? "—" : money(row.value)}
            </FitText>
            {onSale ? (
              <View style={{ alignSelf: "stretch", marginTop: 4 * k, borderRadius: 8 * k,
                paddingVertical: 2 * k, paddingHorizontal: 2 * k,
                backgroundColor: row.saving > 0 ? "#e4f6e9" : "transparent" }}>
                <FitText minimumFontScale={0.6} style={{ textAlign: "center", color: "#19793b",
                  fontSize: large ? 12 : 9, fontWeight: "600" }}>
                  {row.saving > 0 ? `Выгода ${money(row.saving)}` : " "}
                </FitText>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
