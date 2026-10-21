import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { imageUrl } from "../api";
import { colors, gradient, themed } from "../theme";
import { money, stockLabel } from "../format";
import { priceRows } from "./Price";
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

function discountPercent(p: Product): number {
  const r = Number(p.retailPrice ?? 0);
  const d = Number(p.discountPrice ?? 0);
  if (r > 0 && d > 0 && d < r) return Math.round((1 - d / r) * 100);
  return 0;
}

/** Product tile from the mockup's catalog grid. */
function ProductCardBase({ product, customer, activePrice, inCart, isFavorite, onAdd, onFavorite }: Props) {
  const img = imageUrl(product.images?.[0]?.path);
  const stock = stockLabel(product.stock);
  const out = stock.tone === "out";
  const rows = priceRows(product, customer, activePrice);
  const main = rows.find((r) => r.active) ?? rows[0];
  const others = rows.filter((r) => r !== main && r.value > 0);
  const off = discountPercent(product);

  return (
    <Pressable onPress={() => router.push(`/product/${product.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.photo}>
        {img ? (
          <Image source={{ uri: img }} style={styles.image} contentFit="contain" transition={150} recyclingKey={String(product.id)} />
        ) : (
          <Ionicons name="image-outline" size={30} color="#c9b7c2" />
        )}
        {out ? (
          <View style={[styles.tag, { backgroundColor: "#4b3a44" }]}>
            <Text style={styles.tagText}>Нет в наличии</Text>
          </View>
        ) : off >= 3 ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>−{off}%</Text>
          </View>
        ) : null}
        <Pressable
          hitSlop={10}
          onPress={() => {
            tap();
            onFavorite(product);
          }}
          style={styles.fav}
        >
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={18} color={isFavorite ? colors.pink : "#3b2532"} />
        </Pressable>
      </View>

      <View style={styles.info}>
        {product.brand?.name ? <Text style={styles.brand} numberOfLines={1}>{product.brand.name}</Text> : null}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        {stock.tone === "low" ? <Text style={styles.low}>Осталось мало</Text> : null}
        <View style={{ flex: 1 }} />
        <View style={styles.bottom}>
          <View style={{ flex: 1 }}>
            <Text style={styles.price}>{money(main?.value ?? 0)}</Text>
            {others.length > 0 ? (
              <Text style={styles.otherPrice} numberOfLines={1}>
                {others.map((o) => `${o.label} ${money(o.value)}`).join(" · ")}
              </Text>
            ) : null}
          </View>
          <Pressable
            disabled={out}
            hitSlop={6}
            onPress={() => {
              tap();
              onAdd(product);
            }}
            style={({ pressed }) => [{ opacity: out ? 0.35 : pressed ? 0.8 : 1 }]}
          >
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cartBtn}>
              {inCart > 0 ? (
                <Text style={styles.cartCount}>{inCart}</Text>
              ) : (
                <Ionicons name="bag-add-outline" size={17} color="#fff" />
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export const ProductCard = memo(ProductCardBase);

const styles = themed(() => ({
  card: {
    flex: 1,
    margin: 5,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  photo: {
    height: 160,
    margin: 6,
    marginBottom: 0,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "86%", height: "86%" },
  tag: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.pink,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { color: "#fff", fontSize: 10.5, fontWeight: "800" },
  fav: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { padding: 10, paddingTop: 9, flex: 1 },
  brand: { fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  name: { fontSize: 13, color: colors.text, lineHeight: 17, marginTop: 3, minHeight: 34 },
  low: { fontSize: 11, color: colors.warning, fontWeight: "700", marginTop: 3 },
  bottom: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 8 },
  price: { fontSize: 16, fontWeight: "800", color: colors.text },
  otherPrice: { fontSize: 10.5, color: colors.faint, marginTop: 1 },
  cartBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  cartCount: { color: "#fff", fontSize: 13, fontWeight: "800" },
}));
