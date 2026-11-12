import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND_GRADIENT } from "./GradientText";
import { Ionicons } from "@expo/vector-icons";
import { imageUrl } from "../api";
import { seedProduct } from "../productSeed";
import { colors, radius, themed } from "../theme";
import { stockLabel } from "../format";
import { priceRows, PriceRows } from "./Price";
import { tap } from "./ui";
import type { PriceType } from "../pricing";
import type { Customer, Product } from "../types";
import { FavHeart } from "./FavHeart";
import { SafeImage } from "./SafeImage";

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
  const img = imageUrl(product.images?.[0]?.path, 480);
  const stock = stockLabel(product.stock);
  const out = stock.tone === "out";

  return (
    <Pressable
      onPress={() => {
        seedProduct(product);
        router.push(`/product/${product.id}`);
      }}
      accessibilityRole="button"
      accessibilityLabel={product.name}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.imageWrap}>
        {img ? (
          <SafeImage uri={img} style={styles.image} contentFit="contain" transition={150} recyclingKey={String(product.id)} iconColor={colors.faint} />
        ) : (
          <Ionicons name="image-outline" size={34} color={colors.faint} />
        )}
        <ProductLabels labels={product.labels} />
        <Pressable
          hitSlop={10}
          onPress={() => {
            tap();
            onFavorite(product);
          }}
          style={styles.fav}
        >
          <FavHeart size={20} active={isFavorite} />
        </Pressable>
      </View>

      <View style={{ padding: 10, flex: 1 }}>
        {product.brand?.name ? <Text style={styles.brand} numberOfLines={1}>{product.brand.name}</Text> : null}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <View style={[styles.stock, { backgroundColor: STOCK_PILL[stock.tone].bg }]}>
          <Text style={[styles.stockText, { color: STOCK_PILL[stock.tone].fg }]}>{stock.text}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <PriceRows rows={priceRows(product, customer, activePrice)} />
        <Pressable
          disabled={out}
          onPress={() => {
            tap();
            onAdd(product);
          }}
          style={({ pressed }) => [styles.addWrap, { opacity: out ? 0.45 : pressed ? 0.85 : 1 }]}
        >
          <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.add}>
            <Ionicons name="cart-outline" size={16} color="#fff" />
            <Text style={styles.addText}>
              {out ? "Нет в наличии" : inCart > 0 ? `В корзине: ${inCart}` : "В корзину"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Pressable>
  );
}

export const ProductCard = memo(ProductCardBase);

const LABEL_TEXT: Record<string, string> = { new: "Новинка", hit: "Хит", back: "Снова в наличии" };
const LABEL_BG: Record<string, string> = { new: "#8b3dff", hit: "#e82c87", back: "#16a34a" };

/**
 * Метки в левом верхнем углу фото: «Новинка» / «Хит» из админ-панели, и от сайта по 1С — «Новинка» (впервые
 * пришло за 10 дней) и «Снова в наличии» (довезли)
 */
export function ProductLabels({ labels, big = false, inline = false }: { labels?: string[] | null; big?: boolean; inline?: boolean }) {
  const list = (labels ?? []).filter((l) => LABEL_TEXT[l]);
  if (!list.length) return null;
  return (
    <View style={[labelStyles.wrap, big && { top: 12, left: 12 }, inline && { position: "relative", top: 0, left: 0, right: undefined, marginTop: 10 }]} pointerEvents="none">
      {list.map((l) => (
        <View key={l} style={[labelStyles.pill, { backgroundColor: LABEL_BG[l] ?? "#8b3dff" }, big && { paddingHorizontal: 10, paddingVertical: 4 }]}>
          <Text style={[labelStyles.text, big && { fontSize: 13 }]}>{LABEL_TEXT[l]}</Text>
        </View>
      ))}
    </View>
  );
}

const labelStyles = StyleSheet.create({
  wrap: { position: "absolute", top: 8, left: 8, right: 46, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  pill: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  text: { color: "#fff", fontSize: 11, fontWeight: "800" },
});

/** Site's .stock-high / .stock-low / .stock-out */
const STOCK_PILL = {
  high: { bg: "#e8fff0", fg: "#16a34a" },
  low: { bg: "#fff7e6", fg: "#b45309" },
  out: { bg: "#fef2f2", fg: "#dc2626" },
};

const styles = themed(() => ({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    margin: 5,
  },
  imageWrap: {
    height: 150,
    backgroundColor: "#ffffff", // product photos have white backgrounds — keep the tile white in dark mode too
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
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 11, fontWeight: "700", color: colors.violet, textTransform: "uppercase", marginBottom: 2 },
  name: { fontSize: 13, fontWeight: "600", color: colors.text, lineHeight: 17, minHeight: 34 },
  // pill like the site's .product-meta strong: 4×9 padding, 10.5px, 800
  stock: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginTop: 4, marginBottom: 6 },
  stockText: { fontSize: 11, fontWeight: "800" },
  addWrap: { marginTop: 8 },
  add: {
    height: 36,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addText: { color: "#fff", fontWeight: "800", fontSize: 13 },
}));
