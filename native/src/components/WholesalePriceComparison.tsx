import { StyleSheet, Text, View } from "react-native";
import { useCardScale } from "../cardScale";
import { money } from "../format";
import { wholesalePricePanels, type WholesalePriceCell } from "../wholesalePricePanels";
import type { Customer, Product } from "../types";
import { FitText } from "./FitText";

type Props = { product: Product; customer: Customer | null; large?: boolean; dark?: boolean };

/** Matching three-column pills: original prices above, promotional prices below. */
export function WholesalePriceComparison({ product, customer, large = false, dark = false }: Props) {
  const cardScale = useCardScale();
  const panels = wholesalePricePanels(product, customer);
  if (!panels) return null;
  const k = large ? 1 : cardScale;
  const renderPanel = (rows: WholesalePriceCell[], promo: boolean) => (
    <View
      key={promo ? "promotion" : "regular"}
      accessibilityLabel={promo ? "Акционные цены" : "Обычные цены"}
      style={{ flexDirection: "row", borderRadius: 14 * k, paddingVertical: 7 * k,
        height: large ? 78 : 62 * k, backgroundColor: dark ? "#FBF3FA" : "#fdf2f8" }}
    >
      {rows.map((row, i) => (
        <View key={row.key} style={{ flex: 1, minWidth: 0, paddingHorizontal: large ? 8 : 3 * k,
          justifyContent: "center", alignItems: "center",
          ...(i > 0 ? { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: "rgba(139,61,255,0.18)" } : {}) }}>
          <Text
            accessibilityLabel={row.label}
            numberOfLines={2}
            style={{ fontSize: large ? 13 : 10, lineHeight: large ? 16 : 12,
              height: large ? 32 : 24, textAlign: "center", color: row.color, textAlignVertical: "center" }}
          >
            {promo && row.key !== "discount"
              ? row.key === "wholesale" ? "Акция\nопт" : large ? "Акция\nкрупный опт" : "Акция\nкр. опт"
              : row.label}
          </Text>
          <FitText minimumFontScale={0.65} style={{ fontSize: large ? 22 : k === 1 ? 15 : 12,
            fontWeight: "700", color: row.color, textAlign: "center", width: "100%" }}>
            {row.value === null ? "—" : money(row.value)}
          </FitText>
        </View>
      ))}
    </View>
  );
  return <View style={{ gap: 6 * k, marginTop: large ? 14 : 9 * k }}>
    {renderPanel(panels.regular, false)}
    {panels.promotion ? renderPanel(panels.promotion, true) : null}
  </View>;
}
