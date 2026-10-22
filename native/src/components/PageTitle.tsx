import { View } from "react-native";
import { BRAND_GRADIENT, GradientText } from "./GradientText";

export const LOGO = require("../../assets/logo-512.png");

/** Page heading: gradient title (30, 900) — used for «Корзина», «Мои заказы», «Профиль». */
export function PageTitle({
  title,
  colors = BRAND_GRADIENT,
}: {
  title: string;
  colors?: readonly [string, string, ...string[]];
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <GradientText style={{ fontSize: 30, fontWeight: "900", lineHeight: 36 }} colors={colors}>
        {title}
      </GradientText>
    </View>
  );
}
