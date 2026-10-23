import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo, ActivityIndicator, Alert, Animated, FlatList, ScrollView, Pressable, StyleSheet, Text, useWindowDimensions, View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { api, imageUrl } from "@/api";
import { money, stockLabel } from "@/format";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { useWaitlistStore } from "@/store/waitlist";
import { effectivePriceType } from "@/pricing";
import { priceRows } from "@/components/Price";
import { CatalogCard } from "@/components/CatalogCard";
import { Description } from "@/components/Description";
import { Wordmark } from "@/components/Wordmark";
import { VIOLET_PINK } from "@/components/TabBar";
import { ErrorView, tap } from "@/components/ui";
import { useIOS } from "@/ios";
import { useAddToCart } from "@/useAddToCart";
import type { Product, Variant } from "@/types";
import { FavHeart } from "@/components/FavHeart";

const VIOLET = "#8b3dff";
const PINK = "#e82c87";
const PRICE_COLORS = [PINK, VIOLET];
const STOCK = {
  high: { dot: "#34C759", bg: "rgba(52,199,89,0.12)", fg: "#1f8a3b" },
  low: { dot: "#FF9500", bg: "rgba(255,149,0,0.13)", fg: "#b35f00" },
  out: { dot: "#FF3B30", bg: "rgba(255,59,48,0.1)", fg: "#c4271d" },
};

// geometry of the collapsing header
const BAR = 50; // back / favourite row
const THUMB = 52; // compact photo
const COMPACT = 68; // compact row under the top bar
const TITLE_FONT = 28;
const TITLE_LINE = 34;
const SMALL_FONT = 17;

/** Volume / weight from the product name («…, 100 мл» → «100 мл»). */
function volumeOf(name: string) {
  const all = [...name.matchAll(/(\d+(?:[.,]\d+)?)\s?(мл|ml|гр|г|g|кг|л|шт)(?![a-zа-яё])/gi)];
  const m = all[all.length - 1];
  return m ? `${m[1]} ${m[2].toLowerCase()}` : null;
}

export default function ProductScreen() {
  const { id, pick } = useLocalSearchParams<{ id: string; pick?: string }>();
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
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
  const [qty, setLocalQty] = useState(1);
  const [titleBox, setTitleBox] = useState<{ y: number; h: number } | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const padY = useRef(0);
  const picked = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

  const load = useCallback(async () => {
    setError("");
    try {
      const p = await api.product(id);
      setProduct(p);
      setLocalQty(Math.max(1, p.minOrderQty ?? 1));
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

  // ---- collapsing header geometry (all driven by scroll position on the native thread) ----
  const T = insets.top + BAR; // top of the compact row
  const S = Math.round(Math.min(W - 48, H * 0.46, 460)); // big photo (square)
  const PHOTO_TOP = T;
  const thumbCenterY = T + (COMPACT - THUMB) / 2 + THUMB / 2;
  const D = Math.max(60, PHOTO_TOP + S / 2 - thumbCenterY); // scroll distance of the transition
  const k = SMALL_FONT / TITLE_FONT;
  const TW = W - 32; // big title width
  const textLeft = 16 + THUMB + 12;

  const anim = useMemo(() => {
    const p = (a: number, b: number, from: number, to: number) =>
      scrollY.interpolate({ inputRange: [a, b], outputRange: [from, to], extrapolate: "clamp" });
    const pin = scrollY.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateLeft: "clamp", extrapolateRight: "extend" });
    const photo = {
      transform: [
        { translateX: p(0, D, 0, 16 + THUMB / 2 - W / 2) },
        { translateY: scrollY.interpolate({ inputRange: [0, D, D + 1], outputRange: [0, 0, 1], extrapolateLeft: "clamp", extrapolateRight: "extend" }) },
        { scale: p(0, D, 1, THUMB / S) },
      ],
    };
    let title: object = { opacity: 0 };
    if (titleBox) {
      const dy = thumbCenterY - (titleBox.y + titleBox.h / 2);
      title = {
        opacity: p(D * 0.85, D, 1, 0),
        transform: [
          { translateX: p(0, D, 0, textLeft + (TW * k) / 2 - 16 - TW / 2) },
          {
            translateY: scrollY.interpolate({
              inputRange: [0, D, D + 1],
              outputRange: [0, D + dy, D + dy + 1],
              extrapolateLeft: "clamp",
              extrapolateRight: "extend",
            }),
          },
          { scale: p(0, D, 1, k) },
        ],
      };
    }
    return {
      pin,
      photo,
      title,
      compactTitle: { opacity: p(D * 0.85, D, 0, 1), transform: [{ translateY: pin }] },
      headerBg: { opacity: p(D * 0.45, D, 0, 1), transform: [{ translateY: pin }] },
      fadeEarly: { opacity: p(0, D * 0.45, 1, 0) },
      reducedThumb: { opacity: p(D * 0.7, D, 0, 1) },
    };
  }, [scrollY, D, W, S, TW, k, textLeft, thumbCenterY, titleBox]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const topBar = (
    <View style={[{ pointerEvents: "box-none" }, styles.topBar, { paddingTop: insets.top, height: T }]}>
      <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Назад" style={styles.barBtn}>
        <Ionicons name="chevron-back" size={28} color={c.label} />
      </Pressable>
      <Animated.View style={[{ flex: 1, alignItems: "center" }, !reduceMotion && anim.fadeEarly]}>
        <Wordmark />
      </Animated.View>
      {product ? (
        <Pressable
          onPress={() => {
            tap();
            toggleFav(product);
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={isFav ? "Убрать из избранного" : "В избранное"}
          style={[styles.barBtn, { alignItems: "flex-end" }]}
        >
          <FavHeart size={28} active={isFav} />
        </Pressable>
      ) : (
        <View style={styles.barBtn} />
      )}
    </View>
  );

  const bg = dark ? "#170D25" : "#FFFFFF";

  if (error || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        {topBar}
        {error ? <ErrorView message={error} onRetry={load} /> : <ActivityIndicator style={{ flex: 1 }} color={VIOLET} />}
      </View>
    );
  }

  const active = effectivePriceType(cart, customer);
  const images = (product.images ?? []).map((i) => imageUrl(i.path)).filter(Boolean) as string[];
  const stock = stockLabel(product.stock);
  const st = STOCK[stock.tone];
  const out = stock.tone === "out";
  const key = String(product.id);
  const inCart = cart.find((x) => x.cartKey === key)?.quantity ?? 0;
  const min = Math.max(1, product.minOrderQty ?? 1);
  const maxQty = typeof product.stock === "number" && product.stock > 0 ? product.stock : Infinity;
  const waiting = waitIds.includes(product.id);
  const pickedTotal = Object.values(variantQty).reduce((a, b) => a + b, 0);
  const rows = priceRows(product, customer, active);
  const volume = volumeOf(product.name);
  const shownQty = inCart > 0 ? inCart : qty;

  const changeQty = (n: number) => {
    tap();
    if (inCart > 0) setQty(key, n < min ? 0 : Math.min(n, maxQty));
    else setLocalQty(Math.max(min, Math.min(n, maxQty)));
  };

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

  const gallery =
    images.length > 0 ? (
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(u, i) => u + i}
        onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / S))}
        renderItem={({ item }) => (
          <View style={{ width: S, height: S, alignItems: "center", justifyContent: "center" }}>
            <Image source={{ uri: item }} style={{ width: S, height: S }} contentFit="contain" transition={150} />
          </View>
        )}
      />
    ) : (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="image-outline" size={56} color={c.secondary} />
      </View>
    );

  // compact header background: pinned, light with a thin shadow
  const headerBg = (
        <Animated.View
          style={[{ pointerEvents: "none" }, styles.headerBg, { height: T + COMPACT, backgroundColor: dark ? "#211032" : "#fff", borderBottomColor: c.separator }, !dark && styles.headerShadow, anim.headerBg]}
        >
          {reduceMotion ? (
            <Animated.View style={[styles.reducedRow, { top: T }, anim.reducedThumb]}>
              {images[slide] ? <Image source={{ uri: images[slide] }} style={{ width: THUMB, height: THUMB }} contentFit="contain" /> : null}
              <Text style={{ flex: 1, fontSize: SMALL_FONT, fontWeight: "600", color: c.label }} numberOfLines={2}>
                {product.name}
              </Text>
            </Animated.View>
          ) : null}
        </Animated.View>
  );

  const titleStyle = [styles.title, { color: c.label, width: TW }];
  const bottomH = 76 + Math.max(insets.bottom, 10);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Animated.ScrollView
        ref={scrollRef as never}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: PHOTO_TOP, paddingBottom: bottomH + 24 }}
      >
        {/* place for the big photo (the photo itself is drawn above, see below) */}
        <View style={{ height: S }} />
        <Animated.View style={[styles.dots, !reduceMotion && anim.fadeEarly]}>
          {images.length > 1
            ? images.map((_, i) => <View key={i} style={[styles.dot, { backgroundColor: i === slide ? VIOLET : dark ? "#43295A" : "#E1DDF0" }, i === slide && styles.dotActive]} />)
            : null}
        </Animated.View>

        <View style={styles.pad}>
          {product.brand?.name ? (
            <Text style={[styles.brand, { color: VIOLET }]} numberOfLines={1}>
              {product.brand.name.toUpperCase()}
            </Text>
          ) : null}
        </View>
        {/* title placeholder: keeps the place in the layout; the visible title is the animated copy */}
        <Text
          style={[titleStyle, { marginLeft: 16, opacity: titleBox && !reduceMotion ? 0 : 1 }]}
          onLayout={(e) => setTitleBox({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}
        >
          {product.name}
        </Text>

        <View style={styles.pad} onLayout={(e) => (padY.current = e.nativeEvent.layout.y)}>
          <View style={styles.metaRow}>
            {volume ? (
              <View style={[styles.volume, { backgroundColor: dark ? "#352044" : "#EFEAFF" }]}>
                <Text style={{ color: dark ? c.label : "#4b3a8c", fontSize: 14 }}>{volume}</Text>
              </View>
            ) : null}
            <View style={[styles.stock, { backgroundColor: st.bg }]}>
              <View style={[styles.stockDot, { backgroundColor: st.dot }]} />
              <Text style={[styles.stockText, { color: st.fg }]}>{stock.text}</Text>
            </View>
          </View>

          {/* prices — existing pricing rules */}
          <View style={[styles.prices, { backgroundColor: dark ? "#2B193D" : "#FDF2F8" }]}>
            {rows.map((r, i) => (
              <View key={r.label} style={[styles.priceCol, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: dark ? "rgba(255,255,255,0.15)" : "rgba(139,61,255,0.18)" }]}>
                <Text numberOfLines={1} style={{ fontSize: 13, color: PRICE_COLORS[i] ?? c.secondary }}>
                  {r.label}
                </Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontSize: 22, fontWeight: "700", color: PRICE_COLORS[i] ?? c.label }}>
                  {money(r.value)}
                </Text>
              </View>
            ))}
          </View>
          {!customer ? (
            <Pressable onPress={() => router.push("/login")} hitSlop={6} style={{ marginTop: 10 }}>
              <Text style={{ color: VIOLET, fontSize: 15, fontWeight: "600" }}>Войдите, чтобы увидеть оптовые цены</Text>
            </Pressable>
          ) : null}
          <View style={{ marginTop: 10, gap: 3 }}>
            {min > 1 ? <Text style={{ color: VIOLET, fontSize: 14, fontWeight: "600" }}>Минимальный заказ — {min} шт.</Text> : null}
            {product.article ? <Text style={{ color: c.secondary, fontSize: 13 }}>Арт. {product.article}</Text> : null}
            {product.barcode ? <Text style={{ color: c.secondary, fontSize: 13 }}>Штрихкод {product.barcode}</Text> : null}
          </View>

          {variants.length > 0 && !out ? (
            <View
              style={[styles.panel, { backgroundColor: c.cell }, !dark && styles.shadow]}
              onLayout={(e) => {
                // opened from «В корзину» in a list: bring the variant choice into view once
                if (pick && !picked.current) {
                  picked.current = true;
                  const y = padY.current + e.nativeEvent.layout.y - (T + COMPACT + 12);
                  setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: !reduceMotion }), 250);
                }
              }}
            >
              <Text style={[styles.h, { color: c.label }]}>Выберите вариант</Text>
              {variants.map((v, i) => {
                const q = variantQty[v.id] ?? 0;
                return (
                  <View key={v.id} style={[styles.variantRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator }]}>
                    <Image source={{ uri: imageUrl(v.imageUrl) ?? undefined }} style={styles.variantImg} contentFit="cover" />
                    <Text style={{ flex: 1, color: c.label, fontSize: 15 }} numberOfLines={2}>
                      {v.name}
                    </Text>
                    {q > 0 ? (
                      <Qty
                        value={q}
                        // below the minimum order the variant is removed from the selection
                        onMinus={() => { tap(); setVariantQty({ ...variantQty, [v.id]: q - 1 < min ? 0 : q - 1 }); }}
                        onPlus={() => { tap(); setVariantQty({ ...variantQty, [v.id]: q + 1 }); }}
                        plusDisabled={pickedTotal + 1 > maxQty}
                        small
                      />
                    ) : (
                      <Pressable
                        accessibilityLabel={`Добавить ${v.name}`}
                        disabled={pickedTotal + min > maxQty}
                        style={[styles.variantAdd, pickedTotal + min > maxQty && { opacity: 0.4 }]}
                        onPress={() => {
                          tap();
                          setVariantQty({ ...variantQty, [v.id]: min });
                        }}
                      >
                        <Ionicons name="add" size={22} color={VIOLET} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* description right on the page */}
          {product.description ? (
            <View style={{ marginTop: 18 }}>
              <Description text={product.description} />
            </View>
          ) : null}
        </View>

        {related.length > 0 ? (
          <>
            <Text style={[styles.h, { color: c.label, marginHorizontal: 16, marginTop: 24 }]}>Ещё от {product.brand?.name ?? "бренда"}</Text>
            <FlatList
              horizontal
              data={related}
              keyExtractor={(p) => String(p.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 10, paddingVertical: 6 }}
              renderItem={({ item }) => (
                <View style={{ width: 180 }}>
                  <CatalogCard
                    product={item}
                    customer={customer}
                    activePrice={active}
                    inCart={cart.find((x) => x.cartKey === String(item.id))?.quantity ?? 0}
                    isFavorite={favorites.some((f) => f.id === item.id)}
                    onAdd={addToCart}
                    onFavorite={toggleFav}
                  />
                </View>
              )}
            />
          </>
        ) : null}

        {!reduceMotion ? headerBg : null}

        {/* the photo: shrinks into the compact header thumbnail while scrolling (same element, no swap) */}
        <Animated.View
          style={[
            styles.photo,
            { top: PHOTO_TOP, left: (W - S) / 2, width: S, height: S, backgroundColor: dark ? "#fff" : "transparent" },
            !reduceMotion && anim.photo,
          ]}
        >
          {gallery}
        </Animated.View>

        {/* the title: moves next to the thumbnail and gets smaller */}
        {titleBox && !reduceMotion ? (
          <>
            <Animated.Text importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[titleStyle, styles.abs, { top: titleBox.y, left: 16 }, anim.title]}>
              {product.name}
            </Animated.Text>
            <Animated.Text
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              numberOfLines={2}
              style={[
                styles.abs,
                styles.compactTitle,
                { color: c.label, width: TW * k, left: textLeft, top: thumbCenterY - (TITLE_LINE * k * Math.min(2, Math.round(titleBox.h / TITLE_LINE))) / 2 },
                anim.compactTitle,
              ]}
            >
              {product.name}
            </Animated.Text>
          </>
        ) : null}
        {reduceMotion ? headerBg : null}
      </Animated.ScrollView>

      {topBar}

      {/* pinned bottom panel: quantity and «В корзину» (existing cart logic) */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: dark ? "rgba(33,16,50,0.97)" : "rgba(255,255,255,0.97)" }, !dark && styles.bottomShadow]}>
        <View style={styles.bottomInner}>
          {out ? (
            <GradientButton
              title={waiting ? "Вы в листе ожидания" : "Сообщить о поступлении"}
              icon={waiting ? "notifications" : "notifications-outline"}
              loading={waitBusy}
              onPress={onWait}
            />
          ) : variants.length > 0 ? (
            <GradientButton
              title={pickedTotal > 0 ? `Добавить ${pickedTotal} шт.` : "Выберите варианты выше"}
              icon="bag-add-outline"
              disabled={pickedTotal === 0}
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
          ) : (
            <>
              <Qty
                value={shownQty}
                onMinus={() => changeQty(shownQty - 1)}
                onPlus={() => changeQty(shownQty + 1)}
                plusDisabled={shownQty >= maxQty}
                minusDisabled={inCart === 0 && shownQty <= min}
              />
              <GradientButton
                title={inCart > 0 ? "Перейти в корзину" : "В корзину"}
                icon="bag-handle-outline"
                onPress={() => {
                  if (inCart > 0) {
                    router.navigate("/cart");
                    return;
                  }
                  add(product, qty);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                }}
              />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function Qty({
  value, onMinus, onPlus, small, plusDisabled, minusDisabled,
}: { value: number; onMinus: () => void; onPlus: () => void; small?: boolean; plusDisabled?: boolean; minusDisabled?: boolean }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const size = small ? 38 : 46;
  return (
    <View style={[styles.qty, { backgroundColor: dark ? "#352044" : "#F2F2F7" }]}>
      <Pressable onPress={onMinus} disabled={minusDisabled} hitSlop={6} accessibilityLabel="Уменьшить количество" style={{ width: size, height: size, alignItems: "center", justifyContent: "center", opacity: minusDisabled ? 0.35 : 1 }}>
        <Ionicons name="remove" size={22} color={c.label} />
      </Pressable>
      <View style={[styles.qtyBox, { backgroundColor: c.cell, height: size - 4 }]}>
        <Text style={{ fontSize: 17, fontWeight: "600", color: c.label }}>{value}</Text>
      </View>
      <Pressable onPress={onPlus} disabled={plusDisabled} hitSlop={6} accessibilityLabel="Увеличить количество" style={{ opacity: plusDisabled ? 0.4 : 1 }}>
        <LinearGradient colors={[VIOLET, "#b832e0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="add" size={24} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function GradientButton({
  title, icon, onPress, loading, disabled,
}: { title: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        if (loading || disabled) return;
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => [{ flex: 1, opacity: disabled ? 0.5 : pressed ? 0.9 : 1 }]}
    >
      <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
        {loading ? <ActivityIndicator color="#fff" /> : icon ? <Ionicons name={icon} size={22} color="#fff" /> : null}
        <Text style={styles.ctaText} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: { position: "absolute", left: 0, right: 0, top: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  barBtn: { width: 44, height: 44, justifyContent: "center" },
  brandWord: { flex: 1, textAlign: "center", fontSize: 19, letterSpacing: 3.2 },
  pad: { paddingHorizontal: 16 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 7, height: 26, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 8 },
  brand: { fontSize: 14, letterSpacing: 0.4, marginBottom: 4 },
  title: { fontSize: TITLE_FONT, lineHeight: TITLE_LINE, fontWeight: "700" },
  compactTitle: { fontSize: SMALL_FONT, lineHeight: TITLE_LINE * (SMALL_FONT / TITLE_FONT), fontWeight: "700" },
  abs: { position: "absolute" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" },
  volume: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  stock: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  stockDot: { width: 7, height: 7, borderRadius: 4 },
  stockText: { fontSize: 13, fontWeight: "500" },
  prices: { flexDirection: "row", borderRadius: 18, paddingVertical: 10, marginTop: 14 },
  priceCol: { flex: 1, paddingHorizontal: 12, justifyContent: "center", alignItems: "center" },
  panel: { borderRadius: 20, padding: 16, marginTop: 18 },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.06)" },
  h: { fontSize: 21, fontWeight: "700", marginBottom: 6 },
  variantRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  variantImg: { width: 48, height: 48, borderRadius: 10, backgroundColor: "#fff" },
  variantAdd: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(139,61,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerBg: { position: "absolute", left: 0, right: 0, top: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  headerShadow: { boxShadow: "0 6px 16px rgba(31,41,55,0.06)" },
  reducedRow: { position: "absolute", left: 16, right: 16, height: COMPACT, flexDirection: "row", alignItems: "center", gap: 12 },
  photo: { position: "absolute", borderRadius: 24, overflow: "hidden" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 16 },
  bottomShadow: { boxShadow: "0 -4px 20px rgba(31,41,55,0.08)" },
  bottomInner: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%", maxWidth: 640, alignSelf: "center" },
  qty: { flexDirection: "row", alignItems: "center", borderRadius: 26, padding: 3, gap: 4 },
  qtyBox: { minWidth: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  cta: { height: 54, borderRadius: 27, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 12, boxShadow: "0 8px 20px rgba(139,61,255,0.35)" },
  ctaText: { color: "#fff", fontSize: 18, fontWeight: "600", flexShrink: 1 },
});
