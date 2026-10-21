import { useCallback, useEffect, useState } from "react";
import { Alert, Dimensions, FlatList, Pressable, ScrollView, Share, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { api, BASE_URL, imageUrl } from "@/api";
import { colors, fonts, themed } from "@/theme";
import { money, stockLabel } from "@/format";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { useWaitlistStore } from "@/store/waitlist";
import { effectivePriceType } from "@/pricing";
import { priceRows } from "@/components/Price";
import { ProductCard } from "@/components/ProductCard";
import { Button, ErrorView, Loading, Stepper, tap } from "@/components/ui";
import { useAddToCart } from "@/useAddToCart";
import type { Product, Variant } from "@/types";

const W = Dimensions.get("window").width;

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string; pick?: string }>();
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
  const [descOpen, setDescOpen] = useState(false);

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
  const rows = priceRows(product, customer, active);
  const main = rows.find((r) => r.active) ?? rows[0];
  const others = rows.filter((r) => r !== main && r.value > 0);
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

  const RoundBtn = ({ icon, onPress, color }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; color?: string }) => (
    <Pressable onPress={() => { tap(); onPress(); }} hitSlop={8} style={styles.round}>
      <Ionicons name={icon} size={21} color={color ?? "#24121c"} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* photos */}
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
                <View style={{ width: W, height: 380, alignItems: "center", justifyContent: "center", paddingTop: insets.top + 30 }}>
                  <Image source={{ uri: item }} style={{ width: W * 0.8, height: 300 }} contentFit="contain" transition={150} />
                </View>
              )}
            />
          ) : (
            <View style={{ height: 320, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="image-outline" size={56} color="#c9b7c2" />
            </View>
          )}
          {images.length > 1 && (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === slide && styles.dotActive]} />
              ))}
            </View>
          )}
          <View style={[styles.topBar, { top: insets.top + 6 }]}>
            <RoundBtn icon="chevron-back" onPress={() => router.back()} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <RoundBtn icon="share-outline" onPress={() => Share.share({ message: `${product.name}\n${BASE_URL}/product/${product.id}` })} />
              <RoundBtn icon={isFav ? "heart" : "heart-outline"} color={isFav ? "#e5157f" : undefined} onPress={() => toggleFav(product)} />
            </View>
          </View>
        </View>

        <View style={{ padding: 18 }}>
          {product.brand?.name ? <Text style={styles.brand}>{product.brand.name.toUpperCase()}</Text> : null}
          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.tags}>
            <View style={styles.tag}>
              <Ionicons name="shield-checkmark-outline" size={13} color={colors.pink} />
              <Text style={styles.tagText}>Оригинал</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: out ? colors.dangerBg : colors.successBg }]}>
              <Ionicons name={out ? "close-circle-outline" : "checkmark-circle-outline"} size={13} color={out ? colors.danger : colors.success} />
              <Text style={[styles.tagText, { color: out ? colors.danger : colors.success }]}>
                {out ? "Нет в наличии" : stock.tone === "low" ? "Осталось мало" : "В наличии"}
              </Text>
            </View>
          </View>

          {(product.article || product.barcode) && (
            <Text style={styles.meta}>
              {[product.article ? `Арт. ${product.article}` : "", product.barcode ? `Штрихкод ${product.barcode}` : ""].filter(Boolean).join(" · ")}
            </Text>
          )}
          {min > 1 ? <Text style={[styles.meta, { color: colors.pink }]}>Минимальный заказ — {min} шт.</Text> : null}

          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.price}>{money(main?.value ?? 0)}</Text>
              {main ? <Text style={styles.priceLabel}>{main.label}</Text> : null}
            </View>
            {!out && variants.length === 0 && inCart > 0 ? (
              <Stepper value={inCart} min={min} onChange={(n) => setQty(key, n < min ? 0 : n)} />
            ) : null}
          </View>
          {others.length > 0 && (
            <View style={styles.otherPrices}>
              {others.map((o) => (
                <Text key={o.label} style={styles.otherPrice}>
                  {o.label}: <Text style={{ color: colors.text, fontWeight: "700" }}>{money(o.value)}</Text>
                </Text>
              ))}
            </View>
          )}
          {!customer && (
            <Pressable onPress={() => router.push("/login")} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.pink, fontWeight: "600" }}>Войдите, чтобы увидеть оптовые цены →</Text>
            </Pressable>
          )}

          {variants.length > 0 && !out && (
            <>
              <Text style={styles.h}>Выберите вариант</Text>
              {variants.map((v) => {
                const q = variantQty[v.id] ?? 0;
                return (
                  <View key={v.id} style={styles.variantRow}>
                    <Image source={{ uri: imageUrl(v.imageUrl) ?? undefined }} style={styles.variantImg} contentFit="cover" />
                    <Text style={styles.variantName} numberOfLines={2}>{v.name}</Text>
                    {q > 0 ? (
                      <Stepper value={q} onChange={(n) => setVariantQty({ ...variantQty, [v.id]: n })} />
                    ) : (
                      <Pressable onPress={() => { tap(); setVariantQty({ ...variantQty, [v.id]: min }); }} style={styles.variantAdd}>
                        <Ionicons name="add" size={20} color={colors.pink} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {product.description ? (
            <Pressable onPress={() => setDescOpen(!descOpen)} style={styles.descHead}>
              <Text style={styles.descTitle}>Описание</Text>
              <Ionicons name={descOpen ? "chevron-up" : "chevron-forward"} size={18} color={colors.muted} />
            </Pressable>
          ) : null}
          {descOpen && product.description ? <Text style={styles.desc}>{product.description}</Text> : null}
        </View>

        {related.length > 0 && (
          <>
            <Text style={[styles.section, { marginHorizontal: 18 }]}>ЕЩЁ ОТ {(product.brand?.name ?? "бренда").toUpperCase()}</Text>
            <FlatList
              horizontal
              data={related}
              keyExtractor={(p) => String(p.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 13 }}
              renderItem={({ item }) => (
                <View style={{ width: 172 }}>
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

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
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
            title={pickedTotal > 0 ? `В корзину · ${pickedTotal} шт.` : "Выберите варианты"}
            disabled={pickedTotal === 0}
            style={{ flex: 1 }}
            onPress={() => {
              addVariants(product, variants.map((v) => ({ variant: v, quantity: variantQty[v.id] ?? 0 })));
              setVariantQty({});
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              Alert.alert("Добавлено в корзину", undefined, [
                { text: "Продолжить" },
                { text: "В корзину", onPress: () => router.navigate("/cart") },
              ]);
            }}
          />
        ) : inCart > 0 ? (
          <Button title="Перейти в корзину" style={{ flex: 1 }} onPress={() => router.navigate("/cart")} />
        ) : (
          <Button
            title="В корзину"
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

const styles = themed(() => ({
  gallery: { backgroundColor: "#ffffff", borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden", paddingBottom: 14 },
  topBar: { position: "absolute", left: 14, right: 14, flexDirection: "row", justifyContent: "space-between" },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e6d6df" },
  dotActive: { width: 18, backgroundColor: "#e5157f" },
  brand: { fontFamily: fonts.serif, fontSize: 30, color: colors.text, letterSpacing: 1.2, lineHeight: 33 },
  name: { fontSize: 16, color: colors.text, lineHeight: 22, marginTop: 4 },
  tags: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.pinkSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontSize: 12, fontWeight: "600", color: colors.pink },
  meta: { color: colors.faint, fontSize: 12.5, marginTop: 10 },
  priceRow: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  price: { fontSize: 30, fontWeight: "800", color: colors.text },
  priceLabel: { fontSize: 12, color: colors.muted, marginTop: 1 },
  otherPrices: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 8 },
  otherPrice: { color: colors.muted, fontSize: 13 },
  h: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: 22, marginBottom: 10 },
  variantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variantImg: { width: 46, height: 46, borderRadius: 10, backgroundColor: "#ffffff" },
  variantName: { flex: 1, fontWeight: "600", color: colors.text, fontSize: 14 },
  variantAdd: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.pink, alignItems: "center", justifyContent: "center" },
  descHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  descTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  desc: { color: colors.muted, fontSize: 14.5, lineHeight: 21, marginTop: 12 },
  section: { fontFamily: fonts.serif, fontSize: 22, color: colors.text, letterSpacing: 1, marginTop: 10, marginBottom: 6 },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
}));
