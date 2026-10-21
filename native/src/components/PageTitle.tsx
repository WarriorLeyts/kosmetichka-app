import { View } from "react-native";
import { Image } from "expo-image";
import { BRAND_GRADIENT, GradientText } from "./GradientText";

export const LOGO = require("../../assets/logo-512.png");

/** Page heading: our logo + gradient title (30, 900) — used for «Корзина», «Мои заказы», «Профиль». */
export function PageTitle({
  title,
  colors = BRAND_GRADIENT,
}: {
  title: string;
  colors?: readonly [string, string, ...string[]];
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Image source={LOGO} style={{ width: 36, height: 36 }} contentFit="contain" />
      <GradientText style={{ fontSize: 30, fontWeight: "900", lineHeight: 36 }} colors={colors}>
        {title}
      </GradientText>
    </View>
  );
}
