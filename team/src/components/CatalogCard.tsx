import { memo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { imageUrl } from "../api";
import { money } from "../format";
import { useIOS } from "../ios";
import { priceOf, type PriceType } from "../products";
import { pricesOf, type CatalogProduct } from "../catalog";
import { VIOLET_PINK } from "./TabBar";
import { FitText } from "./FitText";
import { tap } from "./ui";

type Props = {
  product: CatalogProduct;
  priceType: PriceType;
  onPress: (p: CatalogProduct) => void;
  /** picker: the main button («Добавить» / «Отправить») */
  actionLabel?: string;
  onAction?: (p: CatalogProduct) => void;
  busy?: boolean;
};

const PRICE_NAMES: Record<PriceType, string> = { retail: "Розница", discount: "Скидка по карте", wholesale: "Опт", big_wholesale: "Крупный опт" };

const STOCK = {
  in: { dot: "#34C759", bg: "rgba(52,199,89,0.12)", fg: "#1f8a3b" },
  out: { dot: "#FF3B30", bg: "rgba(255,59,48,0.1)", fg: "#c4271d" },
};

/** Catalog grid card as in the customer app; staff see the chosen price type and the exact shop stock. */
function CatalogCardBase({ product, priceType, onPress, actionLabel, onAction, busy }: Props) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const img = imageUrl(product.images?.[0]?.path, 480);
  const n = product.stock ?? 0;
  const st = n > 0 ? STOCK.in : STOCK.out;
  const price = priceOf(pricesOf(product), priceType);

  return (
    <Pressable
      onPress={() => {
        tap();
        onPress(product);
      }}
      accessibilityRole="button"
      accessibilityLabel={product.name}
      style={({ pressed }) => [styles.card, { backgroundColor: c.cell }, dark && { boxShadow: undefined }, pressed && { transform: [{ scale: 0.985 }] }]}
    >
      <View style={styles.photo}>
        {img ? (
          <Image source={{ uri: img }} style={styles.image} contentFit="contain" transition={150} recyclingKey={String(product.id)} />
        ) : (
          <Ionicons name="image-outline" size={34} color="#C7C7CC" />
        )}
      </View>

      <Text numberOfLines={1} style={[styles.brand, { color: c.secondary }]}>
        {product.brand?.name?.toUpperCase() ?? " "}
      </Text>
      <Text numberOfLines={2} style={[styles.name, { color: c.label }]}>
        {product.name}
      </Text>

      <View style={[styles.stock, { backgroundColor: st.bg }]}>
        <View style={[styles.stockDot, { backgroundColor: st.dot }]} />
        <Text style={[styles.stockText, { color: st.fg }]} numberOfLines={1}>
          {n > 0 ? `Остаток: ${n} шт.` : "Нет в наличии"}
        </Text>
      </View>

      {/* light panel in both themes: the pink price stays readable in the dark theme */}
      <View style={[styles.prices, { backgroundColor: dark ? "#FBF3FA" : "#fdf2f8" }]}>
        <FitText minimumFontScale={0.6} style={styles.priceLabel}>
          {PRICE_NAMES[priceType]}
        </FitText>
        <FitText minimumFontScale={0.6} style={styles.priceValue}>
          {price > 0 ? money(price) : "—"}
        </FitText>
      </View>

      <View style={{ flex: 1 }} />
      {onAction ? (
        <Pressable
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={actionLabel ?? "Добавить"}
          onPress={() => {
            tap();
            onAction(product);
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
        >
          <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.button, { boxShadow: "0 4px 12px rgba(139,61,255,0.3)" }]}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={19} color="#fff" />
                <Text numberOfLines={1} style={styles.buttonText}>
                  {actionLabel ?? "Добавить"}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export const CatalogCard = memo(CatalogCardBase);

const styles = StyleSheet.create({
  card: { flex: 1, margin: 5, padding: 10, borderRadius: 22, boxShadow: "0 4px 16px rgba(31,41,55,0.07)" },
  photo: { height: 168, borderRadius: 16, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  image: { width: "92%", height: "92%" },
  brand: { fontSize: 12, letterSpacing: 0.2, marginBottom: 2 },
  name: { fontSize: 15, lineHeight: 19, height: 38 },
  stock: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", maxWidth: "100%", marginTop: 7, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  stockDot: { width: 7, height: 7, borderRadius: 4 },
  stockText: { fontSize: 12, fontWeight: "600", flexShrink: 1 },
  prices: { borderRadius: 14, paddingVertical: 7, paddingHorizontal: 8, marginTop: 9, height: 54, alignItems: "center", justifyContent: "center" },
  priceLabel: { fontSize: 11, textAlign: "center", color: "#e82c87" },
  priceValue: { fontSize: 19, fontWeight: "700", marginTop: 1, textAlign: "center", color: "#e82c87" },
  button: { height: 44, borderRadius: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
