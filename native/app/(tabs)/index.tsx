import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Image } from "expo-image";
import { LOGO } from "@/components/PageTitle";
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
import { useTabBarSpace } from "@/components/TabBar";
import type { Product } from "@/types";

const QUICK: { key: Quick; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "new", label: "Новинки", icon: "sparkles-outline" },
  { key: "sale", label: "Со скидкой", icon: "pricetag-outline" },
  { key: "gift", label: "Подарочные наборы", icon: "gift-outline" },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const mode = useTheme((s) => s.mode);
  const toggleTheme = useTheme((s) => s.toggle);
  const customer = useAuth((s) => s.customer);
  const cart = useCartStore((s) => s.items);
  const favorites = useFavorites((s) => s.items);
  const toggleFav = useFavorites((s) => s.toggle);
  const { categories, loadMeta, set: setFilters } = useCatalog();
  const addToCart = useAddToCart();

  const [stats, setStats] = useState<{ totalProducts: number; totalBrands: number } | null>(null);
  const [fresh, setFresh] = useState<Product[]>([]);

  useEffect(() => {
    loadMeta();
    api.homeStats().then(setStats).catch(() => {});
    api.catalog({ page: 1, quick: ["new"], onlyStock: true }).then((r) => setFresh(r.products.slice(0, 12))).catch(() => {});
  }, [loadMeta]);

  const active = effectivePriceType(cart, customer);
  const tops = topCategories(categories).slice(0, 12);

  const openCatalog = (patch: Parameters<typeof setFilters>[0]) => {
    tap();
    useCatalog.getState().reset();
    setFilters(patch);
    router.navigate("/catalog");
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: bottomSpace }}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 18 }]}>
        <View style={styles.heroTop}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Image source={LOGO} style={styles.logoImg} contentFit="contain" />
              <Text style={styles.logo}>Косметичка</Text>
            </View>
            <Text style={styles.subtitle}>Косметика и парфюмерия оптом</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => {
                tap();
                toggleTheme();
              }}
              hitSlop={10}
              style={styles.heroIcon}
              accessibilityLabel={mode === "dark" ? "Светлая тема" : "Тёмная тема"}
            >
              <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} size={21} color="#fff" />
            </Pressable>
            <Pressable onPress={() => router.push("/favorites")} hitSlop={10} style={styles.heroIcon}>
              <Ionicons name="heart-outline" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={styles.searchRow}>
          <Pressable style={styles.search} onPress={() => openCatalog({})}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <Text style={styles.searchText}>Название, бренд, артикул</Text>
          </Pressable>
          <Pressable
            style={styles.scan}
            onPress={() => {
              tap();
              router.push("/scanner");
            }}
          >
            <Ionicons name="barcode-outline" size={24} color={colors.violet} />
          </Pressable>
        </View>

        {stats && (
          <Text style={styles.stats}>
            {stats.totalProducts.toLocaleString("ru-RU")} товаров · {stats.totalBrands.toLocaleString("ru-RU")} брендов · остатки из 1С
          </Text>
        )}
      </LinearGradient>

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

      {tops.length > 0 && (
        <>
          <Text style={styles.section}>Категории</Text>
          <View style={styles.grid}>
            {tops.map((c) => (
              <Pressable key={c.guid} style={styles.cat} onPress={() => openCatalog({ categoryGuid: c.guid })}>
                <Text style={styles.catText} numberOfLines={2}>{c.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.faint} />
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => openCatalog({})} style={{ alignSelf: "center", padding: 10 }}>
            <Text style={{ color: colors.violet, fontWeight: "800" }}>Весь каталог →</Text>
          </Pressable>
        </>
      )}

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
    </ScrollView>
  );
}

const styles = themed(() => ({
  hero: { paddingHorizontal: 18, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  logo: { color: "#fff", fontSize: 26, fontWeight: "900" },
  logoImg: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "rgba(255,255,255,0.85)" },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2, fontWeight: "600" },
  heroIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  searchRow: { flexDirection: "row", gap: 10 },
  search: { flex: 1, height: 48, borderRadius: radius.md, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14 },
  searchText: { color: colors.faint, fontSize: 15 },
  scan: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  stats: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600", marginTop: 12 },
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
