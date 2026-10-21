import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/api";
import { colors, gradient, gradientEnd, gradientStart, radius } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { GradientText } from "@/components/GradientText";
import { TAB_BAR_SPACE } from "@/components/TabBar";
import { childCategories, SORT_LABELS, topCategories, useCatalog, type Quick } from "@/store/catalog";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { effectivePriceType } from "@/pricing";
import { ProductCard } from "@/components/ProductCard";
import { Empty, ErrorView, tap } from "@/components/ui";
import { plural } from "@/format";
import { useAddToCart } from "@/useAddToCart";
import type { Product } from "@/types";

export default function Catalog() {
  const insets = useSafeAreaInsets();
  const f = useCatalog();
  const customer = useAuth((s) => s.customer);
  const cart = useCartStore((s) => s.items);
  const favorites = useFavorites((s) => s.items);
  const toggleFav = useFavorites((s) => s.toggle);
  const addToCart = useAddToCart();

  const [query, setQuery] = useState(f.search);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<{ totalProducts: number; totalBrands: number; totalCategories: number } | null>(null);
  const reqId = useRef(0);
  const listRef = useRef<FlatList<Product>>(null);

  useEffect(() => {
    api.homeStats().then(setStats).catch(() => {});
    f.loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the input in sync when search is set from elsewhere (home, scanner)
  useEffect(() => setQuery(f.search), [f.search]);

  const load = useCallback(
    async (nextPage: number, mode: "replace" | "append" | "refresh") => {
      const id = ++reqId.current;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError("");
      const s = useCatalog.getState();
      try {
        const r = await api.catalog({
          page: nextPage,
          search: s.search || undefined,
          categoryGuids: s.categoryGuidsFor(s.categoryGuid),
          brandGuids: s.brandGuids,
          sort: s.sort,
          onlyStock: s.onlyStock,
          quick: s.quick,
        });
        if (id !== reqId.current) return;
        setProducts((prev) => (mode === "append" ? [...prev, ...r.products.filter((p) => !prev.some((x) => x.id === p.id))] : r.products));
        setTotal(r.total);
        setPage(nextPage);
        setHasMore(r.hasMore);
      } catch (e) {
        if (id === reqId.current) setError(e instanceof Error ? e.message : "Ошибка");
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    []
  );

  // reload whenever filters change (and on first open)
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    load(1, "replace");
  }, [f.version, f.metaLoaded, load]);

  // debounce typing
  useEffect(() => {
    if (query === f.search) return;
    const t = setTimeout(() => f.set({ search: query.trim() }), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const active = effectivePriceType(cart, customer);
  const filterCount = f.activeFilterCount();
  const selectedCat = f.categories.find((c) => c.guid === f.categoryGuid);
  const chips = f.categoryGuid ? childCategories(f.categories, f.categoryGuid) : topCategories(f.categories);

  const pristine = !f.search && !f.categoryGuid && f.brandGuids.length === 0 && f.quick.length === 0;
  const QUICK: { key: Quick; label: string }[] = [
    { key: "new", label: "✨ Новинки" },
    { key: "sale", label: "🏷️ Со скидкой" },
    { key: "gift", label: "🎁 Подарки" },
  ];

  const header = (
    <View>
      {pristine && (
        <LinearGradient colors={gradient} start={gradientStart} end={gradientEnd} style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>ОПТ И РОЗНИЦА</Text>
          </View>
          <Text style={styles.heroTitle}>Косметика и парфюмерия для вашего магазина</Text>
          <Text style={styles.heroText}>Актуальные остатки и цены — напрямую из 1С</Text>
          {stats && (
            <View style={styles.heroStats}>
              <View>
                <Text style={styles.heroStatValue}>{stats.totalProducts.toLocaleString("ru-RU")}</Text>
                <Text style={styles.heroStatLabel}>товаров</Text>
              </View>
              <View>
                <Text style={styles.heroStatValue}>{stats.totalBrands.toLocaleString("ru-RU")}</Text>
                <Text style={styles.heroStatLabel}>брендов</Text>
              </View>
              <View>
                <Text style={styles.heroStatValue}>{stats.totalCategories.toLocaleString("ru-RU")}</Text>
                <Text style={styles.heroStatLabel}>категорий</Text>
              </View>
            </View>
          )}
          {!customer && (
            <Pressable style={styles.heroLogin} onPress={() => router.push("/login")}>
              <Ionicons name="log-in-outline" size={18} color={colors.violet} />
              <Text style={styles.heroLoginText}>Войти в кабинет</Text>
            </Pressable>
          )}
        </LinearGradient>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {QUICK.map((q) => {
          const on = f.quick.includes(q.key);
          return (
            <Pressable
              key={q.key}
              style={[styles.chip, on && styles.chipActive]}
              onPress={() => { tap(); f.set({ quick: on ? f.quick.filter((x) => x !== q.key) : [...f.quick, q.key] }); }}
            >
              <Text style={[styles.chipText, on && { color: "#fff" }]}>{q.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {f.categoryGuid && (
          <Pressable
            style={[styles.chip, styles.chipActive]}
            onPress={() => {
              tap();
              const parent = selectedCat?.parentGuid;
              const parentIsRoot = !parent || f.categories.find((c) => c.guid === parent)?.name.toLowerCase() === "каталог";
              f.set({ categoryGuid: parentIsRoot ? null : parent });
            }}
          >
            <Ionicons name="arrow-back" size={14} color="#fff" />
            <Text style={[styles.chipText, { color: "#fff" }]} numberOfLines={1}>{selectedCat?.name ?? "Категория"}</Text>
          </Pressable>
        )}
        {chips.map((c) => (
          <Pressable key={c.guid} style={styles.chip} onPress={() => { tap(); f.set({ categoryGuid: c.guid }); }}>
            <Text style={styles.chipText} numberOfLines={1}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.countRow}>
        <Text style={styles.count}>
          {loading && products.length === 0 ? "Загрузка…" : `${total.toLocaleString("ru-RU")} ${plural(total, "товар", "товара", "товаров")}`}
        </Text>
        <Pressable onPress={() => router.push("/filters")} hitSlop={8}>
          <Text style={styles.sort}>{SORT_LABELS[f.sort]}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={styles.topbar}>
        <View style={styles.brandRow}>
          <GradientText style={styles.heart}>♡</GradientText>
          <View style={{ flex: 1 }}>
            <GradientText style={styles.brandName}>КОСМЕТИЧКА</GradientText>
            <Text style={styles.brandSub}>сеть магазинов косметики и парфюмерии</Text>
          </View>
          <Pressable style={styles.iconBtn} onPress={() => { tap(); router.push("/favorites"); }} hitSlop={6}>
            <Ionicons name="heart-outline" size={21} color={colors.pink} />
          </Pressable>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Название, штрихкод, артикул"
              placeholderTextColor={colors.faint}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={() => f.set({ search: query.trim() })}
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
            <Pressable onPress={() => { tap(); router.push("/scanner"); }} hitSlop={8} style={{ paddingHorizontal: 6 }}>
              <Ionicons name="barcode-outline" size={22} color={colors.violet} />
            </Pressable>
          </View>
          <Pressable onPress={() => { tap(); router.push("/filters"); }}>
            <LinearGradient colors={gradient} start={gradientStart} end={gradientEnd} style={styles.filterBtn}>
              <Ionicons name="options-outline" size={21} color="#fff" />
              {filterCount > 0 && (
                <View style={styles.dot}>
                  <Text style={styles.dotText}>{filterCount}</Text>
                </View>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {error && products.length === 0 ? (
        <ErrorView message={error} onRetry={() => load(1, "replace")} />
      ) : (
        <FlatList
          ref={listRef}
          data={products}
          numColumns={2}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ paddingHorizontal: 7, paddingBottom: TAB_BAR_SPACE }}
          ListHeaderComponent={header}
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <View style={{ flex: 1 / 2 }}>
              <ProductCard
                product={item}
                customer={customer}
                activePrice={active}
                inCart={cart.find((c) => c.cartKey === String(item.id))?.quantity ?? 0}
                isFavorite={favorites.some((x) => x.id === item.id)}
                onAdd={addToCart}
                onFavorite={toggleFav}
              />
            </View>
          )}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (!loading && hasMore && products.length > 0) load(page + 1, "append");
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, "refresh")} tintColor={colors.violet} />}
          ListEmptyComponent={
            loading ? null : (
              <Empty
                icon="search-outline"
                title="Ничего не нашлось"
                text="Попробуйте изменить запрос или сбросить фильтры"
                action={filterCount > 0 || f.search ? "Сбросить фильтры" : undefined}
                onAction={() => { setQuery(""); f.reset(); }}
              />
            )
          }
          ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 24 }} color={colors.violet} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    marginHorizontal: 10, marginTop: 6, marginBottom: 4, padding: 12, paddingBottom: 10, backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 24, borderWidth: 1, borderColor: colors.border,
    shadowColor: "#111827", shadowOpacity: 0.06, shadowRadius: 17, shadowOffset: { width: 0, height: 12 }, elevation: 3,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  heart: { fontSize: 34, lineHeight: 38 },
  brandName: { fontSize: 21, fontWeight: "900", letterSpacing: -0.6 },
  brandSub: { fontSize: 10.5, fontWeight: "600", color: colors.violet, marginTop: 1 },
  searchRow: { flexDirection: "row", gap: 8 },
  searchBox: {
    flex: 1, height: 46, borderRadius: 16, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border,
    flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 6, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, height: "100%" },
  iconBtn: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  filterBtn: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  dot: {
    position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 1, borderColor: colors.pink,
  },
  dotText: { color: colors.pink, fontSize: 10, fontWeight: "900" },
  hero: { marginHorizontal: 5, marginTop: 8, padding: 22, borderRadius: 28, overflow: "hidden" },
  heroGlow: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.18)" },
  heroBadge: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
  heroBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: -0.6, lineHeight: 28 },
  heroText: { color: "rgba(255,255,255,0.88)", fontSize: 13.5, fontWeight: "500", marginTop: 8 },
  heroStats: { flexDirection: "row", gap: 24, marginTop: 16 },
  heroStatValue: { color: "#fff", fontSize: 21, fontWeight: "900" },
  heroStatLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11.5, fontWeight: "600" },
  heroLogin: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "#fff",
    borderRadius: 15, paddingHorizontal: 16, height: 42, marginTop: 18,
  },
  heroLoginText: { color: colors.violet, fontWeight: "800", fontSize: 14 },
  chips: { paddingHorizontal: 5, paddingVertical: 6, gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, maxWidth: 240,
  },
  chipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  chipText: { fontWeight: "700", color: colors.text, fontSize: 13 },
  countRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, paddingVertical: 6 },
  count: { color: colors.muted, fontWeight: "700", fontSize: 13 },
  sort: { color: colors.violet, fontWeight: "700", fontSize: 13 },
});
