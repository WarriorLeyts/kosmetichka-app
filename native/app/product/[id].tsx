import { useCallback, useEffect, useState } from "react";
import {
  Alert, Dimensions, FlatList, Pressable, ScrollView, Share, StyleSheet, Text, View,
} from "react-native";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { api, BASE_URL, imageUrl } from "@/api";
import { colors, radius } from "@/theme";
import { stockLabel } from "@/format";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { useWaitlistStore } from "@/store/waitlist";
import { effectivePriceType } from "@/pricing";
import { priceRows, PriceRows } from "@/components/Price";
import { ProductCard } from "@/components/ProductCard";
import { Button, ErrorView, Loading, Stepper, tap } from "@/components/ui";
import { useAddToCart } from "@/useAddToCart";
import type { Product, Variant } from "@/types";

const W = Dimensions.get("window").width;

export default function ProductScreen() {
  const { id, pick } = useLocalSearchParams<{ id: string; pick?: string }>();
  const insets = useSafeAreaInsets();
  const customer = useAuth((s) => s.customer);
  const cart = useCartStore((s) => s.items);
  const add = useCartStore((s) => s.add);
  const addVariants = useCartStore((s) => s.addVariants);
  const setQty = useCartStore((s) => s.setQuantity);
  const isFav = useFavorites((s) => s.items.some((x) => String(x.id) === id));
  const toggleFav = useFavorites((s) => s.toggle);
  const favorites = useFavorites((s) => s.items);
  const waitIds = useWaitlistStore((s) => s.ids);
  const toggleWait = useWaitlistStore((s) => s.toggle);
  const addToCart = useAddToCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantQty, setVariantQty] = useState<Record<number, number>>({});
  const [related, setRelated] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [slide, setSlide] = useState(0);
  const [waitBusy, setWaitBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const p = await api.product(id);
      setProduct(p);
      api.variants(p.id).then((r) => setVariants(r.variants ?? [])).catch(() => {});
      if (p.brandGuid) {
        api
          .catalog({ page: 1, brandGuids: [p.brandGuid], sort: "name" })
          .then((r) => setRelated(r.products.filter((x) => x.id !== p.id).slice(0, 10)))
          .catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorView message={error} onRetry={load} />;
  if (!product) return <Loading />;

  const active = effectivePriceType(cart, customer);
  const images = (product.images ?? []).map((i) => imageUrl(i.path)).filter(Boolean) as string[];
  const stock = stockLabel(product.stock);
  const out = stock.tone === "out";
  const key = String(product.id);
  const inCart = cart.find((c) => c.cartKey === key)?.quantity ?? 0;
  const min = Math.max(1, product.minOrderQty ?? 1);
  const waiting = waitIds.includes(product.id);
  const pickedTotal = Object.values(variantQty).reduce((a, b) => a + b, 0);

  const onWait = async () => {
    if (!customer) {
      router.push("/login");
      return;
    }
    setWaitBusy(true);
    try {
      const added = await toggleWait(product.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (added) Alert.alert("Готово", "Сообщим, когда товар появится в наличии.");
    } catch (e) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось");
    } finally {
      setWaitBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Pressable
                hitSlop={10}
                onPress={() => Share.share({ message: `${product.name}\n${BASE_URL}/product/${product.id}` })}
              >
                <Ionicons name="share-outline" size={23} color={colors.text} />
              </Pressable>
              <Pressable hitSlop={10} onPress={() => { tap(); toggleFav(product); }}>
                <Ionicons name={isFav ? "heart" : "heart-outline"} size={24} color={isFav ? colors.pink : colors.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={styles.gallery}>
          {images.length > 0 ? (
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(u, i) => u + i}
              onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / W))}
              renderItem={({ item }) => (
                <View style={{ width: W, height: 320, alignItems: "center", justifyContent: "center" }}>
                  <Image source={{ uri: item }} style={{ width: W * 0.82, height: 290 }} contentFit="contain" transition={150} />
                </View>
              )}
            />
          ) : (
            <View style={{ height: 260, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="image-outline" size={56} color={colors.faint} />
            </View>
          )}
          {images.length > 1 && (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dotItem, i === slide && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        <View style={{ padding: 16 }}>
          {product.brand?.name ? <Text style={styles.brand}>{product.brand.name}</Text> : null}
          <Text style={styles.name}>{product.name}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.stock, { color: out ? colors.danger : stock.tone === "low" ? colors.warning : colors.success }]}>
              ● {stock.text}
            </Text>
            {product.article ? <Text style={styles.meta}>Арт. {product.article}</Text> : null}
          </View>
          {product.barcode ? <Text style={styles.meta}>Штрихкод {product.barcode}</Text> : null}
          {min > 1 ? <Text style={[styles.meta, { color: colors.violet, fontWeight: "700" }]}>Минимальный заказ — {min} шт.</Text> : null}

          <View style={styles.priceCard}>
            <PriceRows rows={priceRows(product, customer, active)} large />
            {!customer && (
              <Pressable onPress={() => router.push("/login")} style={{ marginTop: 10 }}>
                <Text style={{ color: colors.violet, fontWeight: "700" }}>Войдите, чтобы увидеть оптовые цены →</Text>
              </Pressable>
            )}
          </View>

          {variants.length > 0 && !out && (
            <View style={styles.variantBox}>
              <Text style={styles.h}>Выберите вариант{pick ? "" : ""}</Text>
              {variants.map((v) => {
                const q = variantQty[v.id] ?? 0;
                return (
                  <View key={v.id} style={styles.variantRow}>
                    <Image source={{ uri: imageUrl(v.imageUrl) ?? undefined }} style={styles.variantImg} contentFit="cover" />
                    <Text style={styles.variantName} numberOfLines={2}>{v.name}</Text>
                    {q > 0 ? (
                      <Stepper value={q} onChange={(n) => setVariantQty({ ...variantQty, [v.id]: n })} />
                    ) : (
                      <Pressable
                        style={styles.variantAdd}
                        onPress={() => { tap(); setVariantQty({ ...variantQty, [v.id]: min }); }}
                      >
                        <Ionicons name="add" size={20} color={colors.violet} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {product.description ? (
            <>
              <Text style={styles.h}>Описание</Text>
              <Text style={styles.desc}>{product.description}</Text>
            </>
          ) : null}
        </View>

        {related.length > 0 && (
          <>
            <Text style={[styles.h, { marginHorizontal: 16 }]}>Ещё от {product.brand?.name ?? "бренда"}</Text>
            <FlatList
              horizontal
              data={related}
              keyExtractor={(p) => String(p.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 11 }}
              renderItem={({ item }) => (
                <View style={{ width: 180 }}>
                  <ProductCard
                    product={item}
                    customer={customer}
                    activePrice={active}
                    inCart={cart.find((c) => c.cartKey === String(item.id))?.quantity ?? 0}
                    isFavorite={favorites.some((f) => f.id === item.id)}
                    onAdd={addToCart}
                    onFavorite={toggleFav}
                  />
                </View>
              )}
            />
          </>
        )}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
        {out ? (
          <Button
            title={waiting ? "Вы в листе ожидания" : "Сообщить о поступлении"}
            icon={waiting ? "notifications" : "notifications-outline"}
            variant={waiting ? "outline" : "primary"}
            loading={waitBusy}
            onPress={onWait}
            style={{ flex: 1 }}
          />
        ) : variants.length > 0 ? (
          <Button
            title={pickedTotal > 0 ? `Добавить ${pickedTotal} шт.` : "Выберите варианты выше"}
            icon="bag-add-outline"
            disabled={pickedTotal === 0}
            style={{ flex: 1 }}
            onPress={() => {
              addVariants(
                product,
                variants.map((v) => ({ variant: v, quantity: variantQty[v.id] ?? 0 }))
              );
              setVariantQty({});
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              Alert.alert("Добавлено в корзину", undefined, [
                { text: "Продолжить" },
                { text: "В корзину", onPress: () => router.navigate("/cart") },
              ]);
            }}
          />
        ) : inCart > 0 ? (
          <>
            <Stepper value={inCart} min={min} step={1} onChange={(n) => setQty(key, n < min ? 0 : n)} />
            <Button title="Перейти в корзину" icon="bag-outline" style={{ flex: 1 }} onPress={() => router.navigate("/cart")} />
          </>
        ) : (
          <Button
            title="В корзину"
            icon="bag-add-outline"
            style={{ flex: 1 }}
            onPress={() => {
              add(product);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: { backgroundColor: "#fff", paddingBottom: 12, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dotItem: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.pink },
  brand: { color: colors.violet, fontWeight: "800", fontSize: 13, textTransform: "uppercase", marginBottom: 4 },
  name: { fontSize: 21, fontWeight: "800", color: colors.text, lineHeight: 27 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  stock: { fontWeight: "800", fontSize: 13 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 4 },
  priceCard: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 16, marginTop: 16, borderWidth: 1, borderColor: colors.border },
  h: { fontSize: 18, fontWeight: "900", color: colors.text, marginTop: 22, marginBottom: 10 },
  desc: { color: colors.text, fontSize: 15, lineHeight: 22 },
  variantBox: { marginTop: 4 },
  variantRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: radius.md,
    padding: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  variantImg: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.soft },
  variantName: { flex: 1, fontWeight: "700", color: colors.text, fontSize: 14 },
  variantAdd: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center" },
  bottom: {
    position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingTop: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.border,
  },
});
