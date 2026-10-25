import { memo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { imageUrl } from "../api";
import { money, stockLabel } from "../format";
import { useIOS } from "../ios";
import { priceRows } from "./Price";
import { VIOLET_PINK } from "./TabBar";
import { tap } from "./ui";
import { useReduceMotion } from "../useReduceMotion";
import type { PriceType } from "../pricing";
import type { Customer, Product } from "../types";
import { FavHeart } from "./FavHeart";
import { useCartStore } from "../store/cart";

type Props = {
  product: Product;
  customer: Customer | null;
  activePrice: PriceType;
  inCart: number;
  isFavorite: boolean;
  onAdd: (p: Product) => void;
  onFavorite: (p: Product) => void;
};

// price columns: 1st pink, 2nd violet, 3rd dark (brand colors from the project)
const PRICE_COLORS = ["#e82c87", "#8b3dff"];

const STOCK = {
  high: { dot: "#34C759", bg: "rgba(52,199,89,0.12)", fg: "#1f8a3b" },
  low: { dot: "#FF9500", bg: "rgba(255,149,0,0.13)", fg: "#b35f00" },
  out: { dot: "#FF3B30", bg: "rgba(255,59,48,0.1)", fg: "#c4271d" },
};

/** Product card for the iOS-style catalog grid (fixed-height blocks keep rows aligned). */
function CatalogCardBase({ product, customer, activePrice, inCart, isFavorite, onAdd, onFavorite }: Props) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const img = imageUrl(product.images?.[0]?.path);
  const reduce = useReduceMotion();
  const heart = useRef(new Animated.Value(1)).current;
  const stock = stockLabel(product.stock);
  const st = STOCK[stock.tone];
  const out = stock.tone === "out";
  const rows = priceRows(product, customer, activePrice).slice(0, 3);

  return (
    <Pressable
      onPress={() => router.push(`/product/${product.id}`)}
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
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? "Убрать из избранного" : "В избранное"}
          onPress={() => {
            tap();
            if (!reduce) {
              heart.setValue(0.7);
              Animated.spring(heart, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
            }
            onFavorite(product);
          }}
          style={styles.fav}
        >
          <Animated.View style={{ transform: [{ scale: heart }] }}>
            <FavHeart size={23} active={isFavorite} color="#7925D6" /* on the white photo tile in both themes */ />
          </Animated.View>
        </Pressable>
      </View>

      <Text numberOfLines={1} style={[styles.brand, { color: c.secondary }]}>
        {product.brand?.name?.toUpperCase() ?? " "}
      </Text>
      <Text numberOfLines={2} style={[styles.name, { color: c.label }]}>
        {product.name}
      </Text>

      <View style={[styles.stock, { backgroundColor: st.bg }]}>
        <View style={[styles.stockDot, { backgroundColor: st.dot }]} />
        <Text style={[styles.stockText, { color: st.fg }]}>{stock.text}</Text>
      </View>

      <View style={[styles.prices, { backgroundColor: dark ? "rgba(232,44,135,0.1)" : "#fdf2f8" }]}>
        {rows.map((r, i) => (
          <View key={r.label} style={[styles.priceCol, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: dark ? "rgba(255,255,255,0.15)" : "rgba(139,61,255,0.18)" }]}>
            <Text numberOfLines={1} style={[styles.priceLabel, { color: PRICE_COLORS[i] ?? c.secondary }]}>
              {r.label}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={[styles.priceValue, { color: PRICE_COLORS[i] ?? c.label, fontSize: rows.length >= 3 ? 16 : 19 }]}
            >
              {money(r.value)}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      {inCart > 0 && !out ? (
        <QtyRow product={product} qty={inCart} dark={dark} label={c.label} />
      ) : (
        <Pressable
          disabled={out}
          accessibilityRole="button"
          accessibilityLabel={out ? "Нет в наличии" : "Добавить в корзину"}
          onPress={() => {
            tap();
            onAdd(product);
          }}
          style={({ pressed }) => [{ opacity: out ? 0.45 : pressed ? 0.88 : 1 }]}
        >
          <LinearGradient
            colors={out ? ["#AEAEB2", "#AEAEB2"] : VIOLET_PINK}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.button, !out && { boxShadow: "0 4px 12px rgba(139,61,255,0.3)" }]}
          >
            <Ionicons name="cart-outline" size={18} color="#fff" />
            <Text numberOfLines={1} style={styles.buttonText}>
              {out ? "Нет в наличии" : "В корзину"}
            </Text>
          </LinearGradient>
        </Pressable>
      )}
    </Pressable>
  );
}

/** «− n +» and «В корзине», as on the site: change the quantity right in the card. */
function QtyRow({ product, qty, dark, label }: { product: Product; qty: number; dark: boolean; label: string }) {
  const [w, setW] = useState(0);
  const key = String(product.id);
  const min = Math.max(1, product.minOrderQty ?? 1);
  const cap = typeof product.stock === "number" && product.stock > 0 ? product.stock : Infinity;
  const atCap = qty >= cap;
  const set = (n: number) => {
    tap();
    // below the minimum order the line is removed, like «−» at 1 on the site
    useCartStore.getState().setQuantity(key, n < min ? 0 : Math.min(n, cap));
  };
  // narrow cards (small phones): the cart button keeps only its icon
  const compact = w > 0 && w < 150;
  return (
    <View style={styles.qtyRow} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View
        style={[
          styles.stepper,
          dark ? { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.16)" } : { backgroundColor: "#fff", borderColor: "rgba(31,41,55,0.14)" },
        ]}
      >
        <Pressable
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={qty <= min ? "Убрать из корзины" : "Уменьшить количество"}
          onPress={() => set(qty - 1)}
          style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="remove" size={18} color={label} />
        </Pressable>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.qty, { color: label }]}>
          {qty}
        </Text>
        <Pressable
          hitSlop={4}
          disabled={atCap}
          accessibilityRole="button"
          accessibilityLabel="Увеличить количество"
          onPress={() => set(qty + 1)}
          style={({ pressed }) => [styles.stepBtn, { opacity: atCap ? 0.3 : pressed ? 0.5 : 1 }]}
        >
          <Ionicons name="add" size={18} color={label} />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="В корзине, перейти в корзину"
        onPress={() => {
          tap();
          router.navigate("/cart");
        }}
        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.88 : 1 }]}
      >
        <LinearGradient
          colors={VIOLET_PINK}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.button, styles.inCartBtn, { boxShadow: "0 4px 12px rgba(139,61,255,0.3)" }]}
        >
          {compact ? (
            <Ionicons name="cart" size={19} color="#fff" />
          ) : (
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.buttonText, { fontSize: 14 }]}>
              В корзине
            </Text>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export const CatalogCard = memo(CatalogCardBase);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 5,
    padding: 10,
    borderRadius: 22,
    boxShadow: "0 4px 16px rgba(31,41,55,0.07)",
  },
  photo: { height: 168, borderRadius: 16, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  image: { width: "92%", height: "92%" },
  fav: { position: "absolute", top: 2, right: 2, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 12, letterSpacing: 0.2, marginBottom: 2 },
  name: { fontSize: 15, lineHeight: 19, height: 38 },
  stock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginTop: 7,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stockDot: { width: 7, height: 7, borderRadius: 4 },
  stockText: { fontSize: 12, fontWeight: "500" },
  prices: { flexDirection: "row", borderRadius: 14, paddingVertical: 7, marginTop: 9, height: 54 },
  priceCol: { flex: 1, paddingHorizontal: 6, justifyContent: "center", alignItems: "center" },
  priceLabel: { fontSize: 11, textAlign: "center" },
  priceValue: { fontWeight: "700", marginTop: 1, textAlign: "center" },
  button: { height: 44, borderRadius: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  stepper: { flexDirection: "row", alignItems: "center", height: 44, borderRadius: 22, borderWidth: 1, paddingHorizontal: 2 },
  stepBtn: { width: 30, height: 42, alignItems: "center", justifyContent: "center" },
  qty: { minWidth: 22, textAlign: "center", fontSize: 16, fontWeight: "800" },
  inCartBtn: { marginTop: 0, paddingHorizontal: 8 },
});
