import { useDesktop } from "@/useDesktop";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo, ActivityIndicator, Alert, Animated, FlatList, ScrollView, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ProductLabels } from "@/components/ProductCard";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { api, imageUrl } from "@/api";
import { money, stockLabel } from "@/format";
import { barcodeList } from "@/barcodes";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { useWaitlistStore } from "@/store/waitlist";
import { effectivePriceType, priceFor } from "@/pricing";
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
import { takeSeed } from "@/productSeed";
import { BrandPlaque } from "@/components/BrandPlaque";
import { FitText } from "@/components/FitText";
import { SafeImage } from "@/components/SafeImage";
import { productTitle, usePageTitle } from "@/pageTitle";

const VIOLET = "#8b3dff";
const PINK = "#e82c87";
// the price panel is light in both themes: a deeper pink for the text (audit UX-01)
const PRICE_COLORS = ["#c71f75", VIOLET];
const STOCK = {
  high: { dot: "#34C759", bg: "rgba(52,199,89,0.12)", fg: "#1a7a35", fgDark: "#4ade80" },
  low: { dot: "#FF9500", bg: "rgba(255,149,0,0.13)", fg: "#b35f00", fgDark: "#fbbf24" },
  out: { dot: "#FF3B30", bg: "rgba(255,59,48,0.1)", fg: "#c4271d", fgDark: "#ff7a70" },
};

// geometry of the collapsing header
const BAR = 50; // back / favourite row
const THUMB = 52; // compact photo
const COMPACT = 68; // compact row under the top bar
const TITLE_FONT = 22;
const TITLE_LINE = 28;
const SMALL_FONT = 17;

/** Volume / weight from the product name («…, 100 мл» → «100 мл»). */
function volumeOf(name: string) {
  const all = [...name.matchAll(/(\d+(?:[.,]\d+)?)\s?(мл|ml|гр|г|g|кг|л|шт)(?![a-zа-яё])/gi)];
  const m = all[all.length - 1];
  return m ? `${m[1]} ${m[2].toLowerCase()}` : null;
}

export default function ProductScreen() {
  const { id: rawId, pick } = useLocalSearchParams<{ id: string; pick?: string }>();
  // /product/12 и /product/12-shampun-fino (ЧПУ из админ-панели) — один товар: ключ — число в начале
  const id = String(rawId ?? "").match(/^(\d+)(?:-[a-z0-9-]*)?$/)?.[1] ?? String(rawId ?? "");
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const desktop = useDesktop();
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

  const [product, setProduct] = useState<Product | null>(() => takeSeed(id));
  usePageTitle(productTitle(product?.name));
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantQty, setVariantQty] = useState<Record<number, number>>({});
  // under the product: one strip, two tabs — «С этим берут» / «Похожие» (owner's choice «Б», 2026-11-10)
  const [relTab, setRelTab] = useState<"together" | "similar">("together");
  const [relLists, setRelLists] = useState<{ together: Product[] | null; similar: Product[] | null }>({ together: null, similar: null });
  const related = relLists[relTab] ?? [];
  const [error, setError] = useState("");
  const [slide, setSlide] = useState(0);
  const [waitBusy, setWaitBusy] = useState(false);
  const [qty, setLocalQty] = useState(1);
  const [titleBox, setTitleBox] = useState<{ y: number; h: number } | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  // In the browser the scroll position reaches the animations only after the page has moved (no native
  // driver), so anything pinned by following the scroll shakes. There: the simple header outside the
  // scroll (fades in, never moves) and no photo-to-thumbnail flight — as with «reduce motion».
  const simple = reduceMotion || Platform.OS === "web";
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const padY = useRef(0);
  const picked = useRef(false);
  // the waitlist call is a toggle: a double tap would add and immediately remove the product
  const waitRef = useRef(false);
  // the current variant selection, read once per «Добавить» tap (a double tap adds it only once)
  const variantQtyRef = useRef(variantQty);
  variantQtyRef.current = variantQty;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

  const load = useCallback(async () => {
    setError("");
    // deep links can carry anything here — only a numeric product id goes to the API
    if (!/^[0-9]+$/.test(String(id ?? ""))) {
      setError("Товар не найден");
      return;
    }
    // everything in parallel: the product, its variants and (when the list item gave the brand) related goods
    takeSeed(id);
    setRelLists({ together: null, similar: null });
    for (const kind of ["together", "similar"] as const)
      api
        .related(Number(id), kind)
        .then((r) => setRelLists((prev) => ({ ...prev, [kind]: r.products.filter((x) => x.id !== Number(id)) })))
        .catch(() => setRelLists((prev) => ({ ...prev, [kind]: [] })));
    api.variants(Number(id)).then((r) => setVariants(r.variants ?? [])).catch(() => {});
    try {
      const p = await api.product(id);
      setProduct(p);
      setLocalQty(Math.max(1, p.minOrderQty ?? 1));
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
      headerFade: { opacity: p(D * 0.45, D, 0, 1) },
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
      <Animated.View style={[{ flex: 1, alignItems: "center" }, !simple && anim.fadeEarly]}>
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

  const bg = "transparent";

  if (error || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        {topBar}
        {error ? <ErrorView message={error} onRetry={load} /> : <ActivityIndicator style={{ flex: 1 }} color={VIOLET} />}
      </View>
    );
  }

  const active = effectivePriceType(cart, customer);
  const imgPaths = (product.images ?? []).map((i) => i.path).filter(Boolean);
  const images = imgPaths.map((pth) => imageUrl(pth, 800)).filter(Boolean) as string[];
  // the catalog card already loaded the 480 px copy — show it at once while the big one loads
  const previews = imgPaths.map((pth) => imageUrl(pth, 480));
  const stock = stockLabel(product.stock);
  const st0 = STOCK[stock.tone];
  const st = { ...st0, fg: dark ? st0.fgDark : st0.fg };
  const out = stock.tone === "out";
  const key = String(product.id);
  const inCart = cart.find((x) => x.cartKey === key)?.quantity ?? 0;
  const min = Math.max(1, product.minOrderQty ?? 1);
  const codes = barcodeList(product.barcode, product.barcodes);
  const maxQty = typeof product.stock === "number" && product.stock > 0 ? product.stock : Infinity;
  const waiting = waitIds.includes(product.id);
  const pickedTotal = Object.values(variantQty).reduce((a, b) => a + b, 0);
  const tierRows = priceRows(product, customer, active);
  // a wholesale customer the admin allowed it: the retail price first (only here, not in the catalog)
  const retail = priceFor(product, "retail");
  const rows =
    customer?.showRetailPrice && tierRows.every((r) => r.label !== "Розница") && retail > 0
      ? [{ label: "Розница", value: retail, active: false, color: "#8A7A9B" }, ...tierRows]
      : tierRows;
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
    if (waitRef.current) return;
    waitRef.current = true;
    setWaitBusy(true);
    try {
      const added = await toggleWait(product.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (added) Alert.alert("Готово", "Сообщим, когда товар появится в наличии.");
    } catch (e) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось");
    } finally {
      waitRef.current = false;
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
        renderItem={({ item, index }) => (
          <View style={{ width: S, height: S, alignItems: "center", justifyContent: "center" }}>
            <SafeImage
              uri={item}
              placeholder={previews[index] ? { uri: previews[index]! } : undefined}
              placeholderContentFit="contain"
              style={{ width: S, height: S }}
              contentFit="contain"
              transition={150}
              iconSize={56}
            />
          </View>
        )}
      />
    ) : (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="image-outline" size={56} color={c.secondary} />
      </View>
    );


  const details = (
    <>
          <View style={styles.metaRow}>
            {volume ? (
              <View style={[styles.volume, { backgroundColor: dark ? "#352044" : "#EFEAFF" }]}>
                <Text style={{ color: dark ? c.label : "#4b3a8c", fontSize: 15 }}>{volume}</Text>
              </View>
            ) : null}
            <View style={[styles.stock, { backgroundColor: st.bg }]}>
              <View style={[styles.stockDot, { backgroundColor: st.dot }]} />
              <Text style={[styles.stockText, { color: st.fg }]}>{stock.text}</Text>
            </View>
          </View>

          {/* prices — existing pricing rules */}
          <View style={[styles.prices, { backgroundColor: dark ? "#FBF3FA" : "#FDF2F8" }]}>
            {rows.map((r, i) => (
              <View key={r.label} style={[styles.priceCol, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: "rgba(139,61,255,0.18)" }]}>
                <Text numberOfLines={1} style={{ fontSize: 13, color: r.color ?? PRICE_COLORS[i] ?? "#6B5A7B" }}>
                  {r.label}
                </Text>
                <FitText minimumFontScale={0.6} style={{ fontSize: rows.length >= 4 ? 17 : rows.length >= 3 ? 20 : 22, fontWeight: "700", color: r.color ?? PRICE_COLORS[i] ?? "#2A1A3A" }}>
                  {money(r.value)}
                </FitText>
                {r.hint ? <Text numberOfLines={1} style={{ fontSize: 11, color: "#8A7A9B", marginTop: 1 }}>{r.hint}</Text> : null}
              </View>
            ))}
          </View>
          {!customer ? (
            <Pressable onPress={() => router.push("/login")} hitSlop={6} style={{ marginTop: 10 }}>
              <Text style={{ color: VIOLET, fontSize: 15, fontWeight: "600" }}>Войдите, чтобы увидеть оптовые цены</Text>
            </Pressable>
          ) : null}
          <View style={{ marginTop: 10, gap: 3 }}>
            {min > 1 ? <Text style={{ color: VIOLET, fontSize: 15, fontWeight: "600" }}>Минимальный заказ — {min} шт.</Text> : null}
            {product.article ? <Text style={{ color: c.secondary, fontSize: 13 }}>Арт. {product.article}</Text> : null}
            {codes.length ? (
              <Text selectable style={{ color: c.secondary, fontSize: 13 }}>
                {codes.length > 1 ? `Штрихкоды: ${codes.join(", ")}` : `Штрихкод ${codes[0]}`}
              </Text>
            ) : null}
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
                    <Image source={{ uri: imageUrl(v.imageUrl, 160) ?? undefined }} style={styles.variantImg} contentFit="cover" />
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

    </>
  );

  // описание 1С + разделы из админ-панели (краткое, особенности, применение, состав, характеристики)
  const fullText = composeDescription(product);
  const descriptionBlock = (
    <>
          <ProductLabels labels={product.labels} inline />
          {/* description right on the page */}
          {fullText ? (
            <View style={{ marginTop: 18 }}>
              <Description text={fullText} />
            </View>
          ) : null}
    </>
  );

  const relatedBlock = (
    <>
        {(relLists.together?.length ?? 0) + (relLists.similar?.length ?? 0) > 0 ? (
          <>
            {/* one strip, two tabs (a tab with nothing is not offered) */}
            <View style={[styles.relTabs, { backgroundColor: dark ? "#352044" : "#F1EEF7" }]}>
              {(
                [
                  ["together", "С этим берут"],
                  ["similar", "Похожие"],
                ] as const
              )
                .filter(([k]) => (relLists[k]?.length ?? 0) > 0)
                .map(([k, label]) => {
                  const on = relTab === k || (relLists[relTab]?.length ?? 0) === 0;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => {
                        tap();
                        setRelTab(k);
                      }}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: on }}
                      style={[styles.relTab, on && { backgroundColor: VIOLET }]}
                    >
                      <Text style={{ color: on ? "#fff" : c.label, fontWeight: "700", fontSize: 15 }}>{label}</Text>
                    </Pressable>
                  );
                })}
            </View>
            <FlatList
              horizontal
              data={(relLists[relTab]?.length ?? 0) > 0 ? related : (relLists.together?.length ? relLists.together : relLists.similar) ?? []}
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
    </>
  );

  const actions = (
    <>
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
                const sel = variantQtyRef.current;
                if (!Object.values(sel).some((n) => n > 0)) return;
                variantQtyRef.current = {};
                addVariants(product, variants.map((v) => ({ variant: v, quantity: sel[v.id] ?? 0 })));
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
                  // read the store, not this render: a fast second tap must not add the product twice
                  if (inCart > 0 || useCartStore.getState().quantityOf(key) > 0) {
                    router.navigate("/cart");
                    return;
                  }
                  add(product, qty);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                }}
              />
            </>
          )}
    </>
  );

  // compact header background: pinned, light with a thin shadow
  const headerBg = (
        <Animated.View
          style={[{ pointerEvents: "none" }, styles.headerBg, { height: T + COMPACT, backgroundColor: dark ? "#211032" : "#fff", borderBottomColor: c.separator }, !dark && styles.headerShadow, simple ? anim.headerFade : anim.headerBg]}
        >
          {simple ? (
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

  if (desktop) {
    // website on a computer: photo on the left, everything about the product on the right
    const big = images[slide] ?? images[0];
    return (
      <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={styles.dWrap}>
        <View style={styles.dTop}>
          <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Назад" style={styles.dBack}>
            <Ionicons name="chevron-back" size={20} color={VIOLET} />
            <Text style={{ color: VIOLET, fontSize: 15, fontWeight: "600" }}>Назад</Text>
          </Pressable>
        </View>
        <View style={styles.dRow}>
          <View style={{ width: 520 }}>
            <View style={[styles.dPhoto, { backgroundColor: "#fff" }, !dark && styles.shadow]}>
              {big ? (
                <Image source={{ uri: big }} placeholder={previews[slide] ? { uri: previews[slide]! } : undefined} placeholderContentFit="contain" style={{ width: 472, height: 472 }} contentFit="contain" transition={150} />
              ) : (
                <Ionicons name="image-outline" size={56} color={c.secondary} />
              )}
              <Pressable
                onPress={() => { tap(); toggleFav(product); }}
                accessibilityRole="button"
                accessibilityLabel={isFav ? "Убрать из избранного" : "В избранное"}
                style={styles.dFav}
              >
                <FavHeart size={26} active={isFav} />
              </Pressable>
            </View>
            {images.length > 1 ? (
              <View style={styles.dThumbs}>
                {images.map((u, i) => (
                  <Pressable
                    key={u + i}
                    onPress={() => setSlide(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`Фото ${i + 1}`}
                    style={[styles.dThumb, { borderColor: i === slide ? VIOLET : "transparent" }]}
                  >
                    <Image source={{ uri: previews[i] ?? u }} style={{ width: 64, height: 64 }} contentFit="contain" />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {product.brand?.name ? <BrandPlaque guid={product.brandGuid ?? product.brand.guid} name={product.brand.name} /> : null}
            <Text style={[styles.dTitle, { color: c.label }]} accessibilityRole="header">
              {product.name}
            </Text>
            {details}
            <View style={styles.dActions}>{actions}</View>
            {descriptionBlock}
          </View>
        </View>
        <View style={{ marginTop: 16 }}>{relatedBlock}</View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Animated.ScrollView
        ref={scrollRef as never}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: PHOTO_TOP, paddingBottom: bottomH + 24 }}
      >
        {/* place for the big photo (the photo itself is drawn above, see below) */}
        <View style={{ height: S }} />
        <Animated.View style={[styles.dots, !simple && anim.fadeEarly]}>
          {images.length > 1
            ? images.map((_, i) => <View key={i} style={[styles.dot, { backgroundColor: i === slide ? VIOLET : dark ? "#43295A" : "#E1DDF0" }, i === slide && styles.dotActive]} />)
            : null}
        </Animated.View>

        <View style={styles.pad}>
          {/* the brand: a plaque with its logo — a tap opens all its products */}
          {product.brand?.name ? <BrandPlaque guid={product.brandGuid ?? product.brand.guid} name={product.brand.name} /> : null}
        </View>
        {/* title placeholder: keeps the place in the layout; the visible title is the animated copy */}
        <Text
          style={[titleStyle, { marginLeft: 16, opacity: titleBox && !simple ? 0 : 1 }]}
          onLayout={(e) => setTitleBox({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}
        >
          {product.name}
        </Text>

        <View style={styles.pad} onLayout={(e) => (padY.current = e.nativeEvent.layout.y)}>
          {details}
          {descriptionBlock}
        </View>

        {relatedBlock}

        {!simple ? headerBg : null}

        {/* the photo: shrinks into the compact header thumbnail while scrolling (same element, no swap) */}
        <Animated.View
          style={[
            styles.photo,
            { top: PHOTO_TOP, left: (W - S) / 2, width: S, height: S, backgroundColor: dark ? "#fff" : "transparent" },
            !simple && anim.photo,
          ]}
        >
          {gallery}
        </Animated.View>

        {/* the title: moves next to the thumbnail and gets smaller */}
        {titleBox && !simple ? (
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
      </Animated.ScrollView>

      {simple ? headerBg : null}

      {topBar}

      {/* pinned bottom panel: quantity and «В корзину» (existing cart logic) */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: dark ? "rgba(33,16,50,0.97)" : "rgba(255,255,255,0.97)" }, !dark && styles.bottomShadow]}>
        <View style={styles.bottomInner}>
          {actions}
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
        <FitText style={styles.ctaText}>
          {title}
        </FitText>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  relTabs: { flexDirection: "row", marginHorizontal: 16, marginTop: 24, marginBottom: 4, borderRadius: 12, padding: 3, gap: 3 },
  relTab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 9 },
  dWrap: { width: "100%", maxWidth: 1240, alignSelf: "center", paddingHorizontal: 24, paddingBottom: 48 },
  dTop: { flexDirection: "row", alignItems: "center", paddingVertical: 16 },
  dBack: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 6, paddingRight: 10 },
  dRow: { flexDirection: "row", gap: 48, alignItems: "flex-start" },
  dPhoto: { width: 520, height: 520, borderRadius: 28, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  dFav: { position: "absolute", top: 16, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  dThumbs: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  dThumb: { width: 76, height: 76, borderRadius: 14, borderWidth: 2, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  dTitle: { fontSize: 30, lineHeight: 37, fontWeight: "700", marginTop: 4, marginBottom: 14 },
  dActions: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20, maxWidth: 520 },
  topBar: { position: "absolute", left: 0, right: 0, top: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  barBtn: { width: 44, height: 44, justifyContent: "center" },
  brandWord: { flex: 1, textAlign: "center", fontSize: 20, letterSpacing: 3.2 },
  pad: { paddingHorizontal: 16 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 7, height: 26, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 8 },
  brand: { fontSize: 15, letterSpacing: 0.4, marginBottom: 4 },
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
  h: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
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
  cta: { height: 52, borderRadius: 26, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 12, boxShadow: "0 8px 20px rgba(139,61,255,0.35)" },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "600", flexShrink: 1 },
});

/** Описание из 1С и разделы карточки из админ-панели — одним текстом в формате Description (**Заголовок**, «- » списки) */
export function composeDescription(p: Product): string {
  const parts: string[] = [];
  if (p.shortDescription?.trim()) parts.push(p.shortDescription.trim());
  if (p.description?.trim()) parts.push(p.description.trim());
  const sec = (title: string, text?: string | null) => {
    if (text?.trim()) parts.push(`**${title}**\n${text.trim()}`);
  };
  sec("Особенности и преимущества", p.features);
  sec("Способ применения", p.usage);
  sec("Состав", p.composition);
  const specs = [
    ...(p.skinType?.trim() ? [`- Тип кожи / волос: ${p.skinType.trim()}`] : []),
    ...(p.country?.trim() ? [`- Страна производства: ${p.country.trim()}`] : []),
    ...(p.specs ?? []).filter((x) => x?.name && x?.value).map((x) => `- ${x.name}: ${x.value}`),
  ];
  if (specs.length) parts.push(`**Характеристики**\n${specs.join("\n")}`);
  return parts.join("\n\n");
}
