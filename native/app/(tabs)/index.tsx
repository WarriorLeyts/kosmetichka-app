import { useEffect, useRef, useState } from "react";
import { Alert, Animated, FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BRAND_PINK, BRAND_VIOLET, Wordmark } from "@/components/Wordmark";
import { FavHeart } from "@/components/FavHeart";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/api";
import { colors, gradient, radius, themed, useTheme } from "@/theme";
import { topCategories, useCatalog, type Quick } from "@/store/catalog";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { effectivePriceType } from "@/pricing";
import { ProductCard } from "@/components/ProductCard";
import { tap } from "@/components/ui";
import { useAddToCart } from "@/useAddToCart";
import { HomeScene } from "@/components/home/HomeScene";
import { HomeCategories } from "@/components/home/HomeCategories";
import { useTabBarSpace } from "@/components/TabBar";
import { Sheet, SheetOptions } from "@/components/iosui/Sheet";
import { UI_SIZES, uiScale } from "@/uiScale";
import type { Product } from "@/types";

const QUICK: { key: Quick; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "new", label: "Новинки", icon: "sparkles-outline" },
  { key: "sale", label: "Со скидкой", icon: "pricetag-outline" },
  { key: "gift", label: "Подарочные наборы", icon: "gift-outline" },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const bottomSpace = useTabBarSpace();
  const mode = useTheme((s) => s.mode);
  const toggleTheme = useTheme((s) => s.toggle);
  const customer = useAuth((s) => s.customer);
  const cart = useCartStore((s) => s.items);
  const favorites = useFavorites((s) => s.items);
  const toggleFav = useFavorites((s) => s.toggle);
  const { categories, loadMeta, set: setFilters } = useCatalog();
  const addToCart = useAddToCart();

  const [sizeOpen, setSizeOpen] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [sceneTop, setSceneTop] = useState<number | null>(null);
  const [fresh, setFresh] = useState<Product[]>([]);

  useEffect(() => {
    loadMeta();
    api.catalog({ page: 1, quick: ["new"], onlyStock: true }).then((r) => setFresh(r.products.slice(0, 12))).catch(() => {});
  }, [loadMeta]);

  const active = effectivePriceType(cart, customer);
  const dark = mode === "dark";
  const iconColor = dark ? "#E7D9FF" : BRAND_VIOLET;
  const glass = dark ? styles.glassDark : styles.glassLight;
  // wordmark fits between the two left buttons and the right one on any phone width
  const wordSize = Math.max(14, Math.min(19, (winW - 36 - 2 * 100) / 8.6));
  const tops = topCategories(categories).slice(0, 12);

  const openCatalog = (patch: Parameters<typeof setFilters>[0]) => {
    tap();
    useCatalog.getState().reset();
    setFilters(patch);
    router.navigate("/catalog");
  };

  return (
    <>
    <Animated.ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: bottomSpace }}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      scrollEventThrottle={16}
    >
      <View style={[styles.hero, { paddingTop: insets.top + 8, backgroundColor: dark ? "#170D25" : "#FFFFFF" }]}>
        {/* soft glow: pink on the left, lavender on the right */}
        <LinearGradient
          colors={dark ? ["rgba(239,65,154,0.38)", "rgba(23,13,37,0)", "rgba(121,37,214,0.45)"] : ["rgba(239,65,154,0.13)", "rgba(255,255,255,0)", "rgba(155,110,240,0.16)"]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.6 }}
          end={{ x: 1, y: 0.4 }}
          style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
        />
        <LinearGradient
          colors={dark ? ["rgba(23,13,37,0)", colors.bg] : ["rgba(255,255,255,0)", colors.bg]}
          start={{ x: 0, y: 0.55 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
        />
        <View style={styles.heroTop}>
          <View style={[styles.heroSide, { left: 0 }]}>
            <Pressable
              onPress={() => {
                tap();
                toggleTheme();
              }}
              hitSlop={6}
              style={[styles.glass, glass]}
              accessibilityLabel={mode === "dark" ? "Светлая тема" : "Тёмная тема"}
            >
              <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} size={20} color={iconColor} />
            </Pressable>
            {uiScale.available ? (
              <Pressable
                onPress={() => {
                  tap();
                  setSizeOpen(true);
                }}
                hitSlop={6}
                style={[styles.glass, glass]}
                accessibilityLabel="Размер интерфейса"
              >
                <Text style={[styles.sizeIcon, { color: iconColor }]}>Aa</Text>
              </Pressable>
            ) : null}
          </View>
          <Wordmark size={wordSize} />
          <View style={[styles.heroSide, { right: 0 }]}>
            <Pressable onPress={() => router.push("/favorites")} hitSlop={6} style={[styles.glass, glass]} accessibilityLabel="Избранное">
              <FavHeart size={21} />
            </Pressable>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: dark ? "#E3D3F2" : "#7A6A9A" }]} numberOfLines={1} adjustsFontSizeToFit>
          Сеть магазинов косметики и парфюмерии
        </Text>

        <View style={styles.searchRow}>
          <Pressable
            style={[styles.search, dark ? styles.searchDark : styles.searchLight]}
            onPress={() => openCatalog({})}
            accessibilityRole="search"
            accessibilityLabel="Поиск: название, бренд, артикул"
          >
            <Ionicons name="search-outline" size={20} color={dark ? "#FAF7FD" : BRAND_VIOLET} />
            <Text style={[styles.searchText, { color: dark ? "#C3AECF" : "#8A7CA6" }]} numberOfLines={1}>
              Название, бренд, артикул
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              tap();
              router.push("/scanner");
            }}
            accessibilityRole="button"
            accessibilityLabel="Сканировать штрихкод"
            style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.96 : 1 }] }]}
          >
            <LinearGradient colors={[BRAND_PINK, "#A93BF2"]} start={{ x: 0, y: 0.3 }} end={{ x: 1, y: 0.9 }} style={styles.scan}>
              <Ionicons name="barcode-outline" size={26} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* new home content: scroll-driven box scene + categories with images */}
      <View onLayout={(e) => setSceneTop(e.nativeEvent.layout.y)}>
        <HomeScene scrollY={scrollY} sectionTop={sceneTop} topInset={insets.top} bottomSpace={bottomSpace} onCatalog={() => openCatalog({})} />
      </View>
      {tops.length > 0 && <HomeCategories categories={tops} onOpen={(guid) => openCatalog(guid ? { categoryGuid: guid } : {})} />}

      {!customer && (
        <Pressable style={styles.loginBanner} onPress={() => router.push("/login")}>
          <Ionicons name="pricetags-outline" size={22} color={colors.violet} />
          <View style={{ flex: 1 }}>
            <Text style={styles.loginTitle}>Войдите, чтобы видеть оптовые цены</Text>
            <Text style={styles.loginText}>И оформлять заказы с подтверждением менеджера</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.violet} />
        </Pressable>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
        {QUICK.map((q) => (
          <Pressable key={q.key} style={styles.quick} onPress={() => openCatalog({ quick: [q.key] })}>
            <Ionicons name={q.icon} size={18} color={colors.pink} />
            <Text style={styles.quickText}>{q.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {fresh.length > 0 && (
        <>
          <Text style={styles.section}>Новинки</Text>
          <FlatList
            horizontal
            data={fresh}
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

      <Pressable style={styles.contacts} onPress={() => router.push("/info")}>
        <Ionicons name="call-outline" size={18} color={colors.muted} />
        <Text style={{ color: colors.muted, fontWeight: "600" }}>Контакты и документы</Text>
      </Pressable>
    </Animated.ScrollView>
    <Sheet open={sizeOpen} onClose={() => setSizeOpen(false)} title="Размер интерфейса">
      <SheetOptions
        options={[...UI_SIZES]}
        value={uiScale.available ? uiScale.get() : "1"}
        onSelect={(v) => {
          setSizeOpen(false);
          if (v === uiScale.get()) return;
          Alert.alert("Изменить размер?", "Приложение перезапустится, чтобы применить новый размер.", [
            { text: "Отмена", style: "cancel" },
            { text: "Применить", onPress: () => uiScale.apply(v) },
          ]);
        }}
      />
    </Sheet>
    </>
  );
}

const styles = themed(() => ({
  hero: { paddingHorizontal: 18, paddingBottom: 18, overflow: "hidden" },
  heroTop: { height: 56, alignItems: "center", justifyContent: "center" },
  heroSide: { position: "absolute", top: 8, flexDirection: "row", gap: 8 },
  glass: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  glassLight: { backgroundColor: "rgba(255,255,255,0.62)", borderColor: "rgba(121,37,214,0.16)", boxShadow: "0 6px 16px rgba(121,37,214,0.12)" },
  glassDark: { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(220,190,255,0.24)", boxShadow: "0 6px 16px rgba(0,0,0,0.25)" },
  sizeIcon: { fontSize: 16, fontWeight: "600" },
  subtitle: { fontSize: 14, fontWeight: "500", textAlign: "center", marginTop: 4, marginBottom: 18 },
  searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  search: { flex: 1, height: 52, borderRadius: 26, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, borderWidth: 1 },
  searchLight: { backgroundColor: "rgba(250,247,255,0.85)", borderColor: "rgba(121,37,214,0.22)", boxShadow: "0 8px 20px rgba(121,37,214,0.08)" },
  searchDark: { backgroundColor: "rgba(255,255,255,0.09)", borderColor: "rgba(200,160,255,0.35)" },
  searchText: { fontSize: 16, flexShrink: 1 },
  scan: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px rgba(169,59,242,0.32)" },
  loginBanner: {
    margin: 16, marginBottom: 0, padding: 14, borderRadius: radius.lg, backgroundColor: colors.violetSoft,
    flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.violetBorder,
  },
  loginTitle: { fontWeight: "800", color: colors.text, fontSize: 14 },
  loginText: { color: colors.muted, fontSize: 12, marginTop: 2 },
  quickRow: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  quick: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.card, borderRadius: 999,
    paddingHorizontal: 14, height: 40, borderWidth: 1, borderColor: colors.border,
  },
  quickText: { fontWeight: "700", color: colors.text, fontSize: 13 },
  section: { fontSize: 20, fontWeight: "900", color: colors.text, marginHorizontal: 16, marginTop: 24, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 8 },
  cat: {
    width: "48%", flexGrow: 1, minHeight: 56, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6,
  },
  catText: { flex: 1, fontWeight: "700", color: colors.text, fontSize: 13 },
  contacts: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 28, padding: 10 },
}));
