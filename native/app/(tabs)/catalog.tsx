import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/api";
import { colors, radius } from "@/theme";
import { childCategories, SORT_LABELS, topCategories, useCatalog } from "@/store/catalog";
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
  const chips = f.categoryGuid ? childCategories(f.categories, f.categoryGuid) : topCategories(f.categories);

  const header = (
    <View>
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
      <View style={styles.top}>
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
        <Pressable style={styles.iconBtn} onPress={() => { tap(); router.push("/scanner"); }}>
          <Ionicons name="barcode-outline" size={22} color={colors.violet} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => { tap(); router.push("/filters"); }}>
          <Ionicons name="options-outline" size={22} color={colors.violet} />
          {filterCount > 0 && (
            <View style={styles.dot}>
              <Text style={styles.dotText}>{filterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

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

const styles = StyleSheet.create({
  top: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  searchBox: {
    flex: 1, height: 46, borderRadius: radius.md, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border,
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, height: "100%" },
  iconBtn: {
    width: 46, height: 46, borderRadius: radius.md, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  dot: {
    position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.pink,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  dotText: { color: "#fff", fontSize: 10, fontWeight: "800" },
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
