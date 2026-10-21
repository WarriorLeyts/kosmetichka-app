import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { imageUrl } from "../api";
import { colors, gradient, gradientEnd, gradientStart, pinkShadow, radius, shadow } from "../theme";
import { stockLabel } from "../format";
import { priceRows, PriceRows } from "./Price";
import { tap } from "./ui";
import type { PriceType } from "../pricing";
import type { Customer, Product } from "../types";

type Props = {
  product: Product;
  customer: Customer | null;
  activePrice: PriceType;
  inCart: number;
  isFavorite: boolean;
  onAdd: (p: Product) => void;
  onFavorite: (p: Product) => void;
};

const STOCK_STYLE = {
  high: { bg: colors.successBg, fg: colors.success },
  low: { bg: colors.warningBg, fg: colors.warning },
  out: { bg: colors.dangerBg, fg: colors.danger },
};

/** Same layout as the site's .product-card */
function ProductCardBase({ product, customer, activePrice, inCart, isFavorite, onAdd, onFavorite }: Props) {
  const img = imageUrl(product.images?.[0]?.path);
  const stock = stockLabel(product.stock);
  const out = stock.tone === "out";
  const st = STOCK_STYLE[stock.tone];

  return (
    <Pressable onPress={() => router.push(`/product/${product.id}`)} style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.985 }] }]}>
      <LinearGradient colors={["#ffffff", "#f6f7fb"]} style={styles.imageBox}>
        {img ? (
          <Image source={{ uri: img }} style={styles.image} contentFit="contain" transition={150} recyclingKey={String(product.id)} />
        ) : (
          <View style={{ alignItems: "center", gap: 4 }}>
            <Ionicons name="image-outline" size={24} color="#b6bbcc" />
            <Text style={{ color: "#b6bbcc", fontSize: 10.5, fontWeight: "700" }}>Фото товара</Text>
          </View>
        )}
      </LinearGradient>

      <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
      <View style={styles.meta}>
        <Text style={styles.brand} numberOfLines={1}>{product.brand?.name ?? ""}</Text>
        <View style={[styles.pill, { backgroundColor: st.bg }]}>
          <Text style={[styles.pillText, { color: st.fg }]}>{stock.text}</Text>
        </View>
      </View>

      <PriceRows rows={priceRows(product, customer, activePrice)} />

      <View style={styles.actions}>
        <Pressable
          disabled={out}
          onPress={() => {
            tap();
            onAdd(product);
          }}
          style={({ pressed }) => [{ flex: 1, opacity: out ? 0.45 : pressed ? 0.9 : 1 }, !out && pinkShadow]}
        >
          <LinearGradient colors={gradient} start={gradientStart} end={gradientEnd} style={styles.cartBtn}>
            <Ionicons name={inCart > 0 ? "checkmark" : "cart-outline"} size={15} color="#fff" />
            <Text style={styles.cartText} numberOfLines={1}>
              {out ? "Нет в наличии" : inCart > 0 ? `В корзине ${inCart}` : "В корзину"}
            </Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          hitSlop={6}
          onPress={() => {
            tap();
            onFavorite(product);
          }}
          style={({ pressed }) => [styles.favBtn, (pressed || isFavorite) && { backgroundColor: colors.pinkSoft, borderColor: colors.pinkLight }]}
        >
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={19} color={colors.pink} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export const ProductCard = memo(ProductCardBase);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 5,
    padding: 11,
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  imageBox: { height: 128, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 10, overflow: "hidden" },
  image: { width: "92%", height: 112 },
  name: { fontSize: 12.5, fontWeight: "700", color: colors.text, lineHeight: 15, height: 30, marginBottom: 6 },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 6, minHeight: 22 },
  brand: { flex: 1, fontSize: 11, fontWeight: "600", color: colors.muted },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: "800" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  cartBtn: { height: 38, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 6 },
  cartText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  favBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
