import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { imageUrl } from "../api";
import { colors, radius } from "../theme";
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

function ProductCardBase({ product, customer, activePrice, inCart, isFavorite, onAdd, onFavorite }: Props) {
  const img = imageUrl(product.images?.[0]?.path);
  const stock = stockLabel(product.stock);
  const out = stock.tone === "out";

  return (
    <Pressable
      onPress={() => router.push(`/product/${product.id}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.imageWrap}>
        {img ? (
          <Image source={{ uri: img }} style={styles.image} contentFit="contain" transition={150} recyclingKey={String(product.id)} />
        ) : (
          <Ionicons name="image-outline" size={34} color={colors.faint} />
        )}
        <Pressable
          hitSlop={10}
          onPress={() => {
            tap();
            onFavorite(product);
          }}
          style={styles.fav}
        >
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={20} color={isFavorite ? colors.pink : colors.muted} />
        </Pressable>
      </View>

      <View style={{ padding: 10, flex: 1 }}>
        {product.brand?.name ? <Text style={styles.brand} numberOfLines={1}>{product.brand.name}</Text> : null}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text
          style={[
            styles.stock,
            { color: out ? colors.danger : stock.tone === "low" ? colors.warning : colors.success },
          ]}
        >
          {stock.text}
        </Text>
        <View style={{ flex: 1 }} />
        <PriceRows rows={priceRows(product, customer, activePrice)} />
        <Pressable
          disabled={out}
          onPress={() => {
            tap();
            onAdd(product);
          }}
          style={({ pressed }) => [styles.add, out && styles.addDisabled, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name={inCart > 0 ? "checkmark" : "bag-add-outline"} size={16} color={out ? colors.faint : "#fff"} />
          <Text style={[styles.addText, out && { color: colors.faint }]}>
            {out ? "Нет в наличии" : inCart > 0 ? `В корзине: ${inCart}` : "В корзину"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export const ProductCard = memo(ProductCardBase);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    margin: 5,
  },
  imageWrap: {
    height: 150,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.soft,
  },
  image: { width: "88%", height: "88%" },
  fav: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 11, fontWeight: "700", color: colors.violet, textTransform: "uppercase", marginBottom: 2 },
  name: { fontSize: 13, fontWeight: "600", color: colors.text, lineHeight: 17, minHeight: 34 },
  stock: { fontSize: 11, fontWeight: "700", marginTop: 4, marginBottom: 6 },
  add: {
    marginTop: 8,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.pink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addDisabled: { backgroundColor: colors.soft },
  addText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
