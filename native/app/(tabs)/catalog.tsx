import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/api";
import { colors, radius, themed } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { CategoryDrawer } from "@/components/CategoryDrawer";
import { BRAND_GRADIENT } from "@/components/GradientText";
import { SORT_LABELS, useCatalog } from "@/store/catalog";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { effectivePriceType } from "@/pricing";
import { ProductCard } from "@/components/ProductCard";
import { Empty, ErrorView, tap } from "@/components/ui";
import { plural } from "@/format";
import { useAddToCart } from "@/useAddToCart";
import type { Product } from "@/types";

/** Square gradient button like the site's mobile .catalog-button (☰). */
function GradientButton({ icon, onPress, badge = 0 }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; badge?: number }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.gradBtnWrap, { opacity: pressed ? 0.9 : 1, transform: [{ translateY: pressed ? 1 : 0 }] }]}
    >
      <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradBtn}>
        <Ionicons name={icon} size={20} color="#fff" />
      </LinearGradient>
      {badge > 0 && (
        <View style={styles.dot}>
          <Text style={styles.dotText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

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
  const [catOpen, setCatOpen] = useState(false);
  const reqId = useRef(0);
  const listRef = useRef<FlatList<Product>>(null);

  useEffect(() => {
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

  const header = (
    <View>
      <View style={styles.countRow}>
        <Text style={styles.count} numberOfLines={1}>
          {selectedCat ? `${selectedCat.name} · ` : ""}
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
      <View style={styles.top}>
        <GradientButton icon="menu" onPress={() => setCatOpen(true)} />
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Название, бренд, артикул"
            placeholderTextColor={colors.faint}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => f.set({ search: query.trim() })}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>
        <GradientButton icon="barcode-outline" onPress={() => router.push("/scanner")} />
        <GradientButton icon="options-outline" onPress={() => router.push("/filters")} badge={filterCount} />
      </View>

      <CategoryDrawer
        open={catOpen}
        onClose={() => setCatOpen(false)}
        categories={f.categories}
        selected={f.categoryGuid}
        onSelect={(guid) => f.set({ categoryGuid: guid })}
      />

      {error && products.length === 0 ? (
        <ErrorView message={error} onRetry={() => load(1, "replace")} />
      ) : (
        <FlatList
          ref={listRef}
          data={products}
          numColumns={2}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ paddingHorizontal: 7, paddingBottom: 24 }}
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

const styles = themed(() => ({
  top: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  searchBox: {
    flex: 1, height: 46, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, height: "100%" },
  gradBtnWrap: {
    borderRadius: 15,
    shadowColor: "#e82c87",
    shadowOpacity: 0.18,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  gradBtn: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  iconBtn: {
    width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  dot: {
    position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.card,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 1, borderColor: colors.pink,
  },
  dotText: { color: colors.pink, fontSize: 10, fontWeight: "900" },
  chips: { paddingHorizontal: 5, paddingVertical: 6, gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, maxWidth: 240,
  },
  chipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  chipText: { fontWeight: "700", color: colors.text, fontSize: 13 },
  countRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, paddingVertical: 6 },
  count: { color: colors.muted, fontWeight: "700", fontSize: 13 },
  sort: { color: colors.violet, fontWeight: "700", fontSize: 13 },
}));
