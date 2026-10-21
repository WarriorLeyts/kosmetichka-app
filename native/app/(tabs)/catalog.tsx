import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/api";
import { colors, fonts, themed } from "@/theme";
import { categoryIcon } from "@/categoryIcon";
import { CategoryDrawer } from "@/components/CategoryDrawer";
import { childCategories, SORT_LABELS, topCategories, useCatalog } from "@/store/catalog";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { effectivePriceType } from "@/pricing";
import { ProductCard } from "@/components/ProductCard";
import { Empty, ErrorView, IconButton, SearchBar, tap } from "@/components/ui";
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

  // tiles: subcategories of the selected category, or top-level ones
  const tiles = (f.categoryGuid ? childCategories(f.categories, f.categoryGuid) : topCategories(f.categories)).filter(
    (c) => !c.name.startsWith("<")
  );

  const header = (
    <View>
      {tiles.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiles}>
          {tiles.map((c) => (
            <Pressable key={c.guid} onPress={() => { tap(); f.set({ categoryGuid: c.guid }); }} style={styles.tile}>
              <Ionicons name={categoryIcon(c.name)} size={24} color={colors.pink} />
              <Text style={styles.tileText} numberOfLines={2}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {selectedCat && (
        <Pressable
          onPress={() => {
            tap();
            const parent = selectedCat.parentGuid;
            const parentIsRoot = !parent || f.categories.find((c) => c.guid === parent)?.name.toLowerCase() === "каталог";
            f.set({ categoryGuid: parentIsRoot ? null : parent });
          }}
          style={styles.crumb}
        >
          <Ionicons name="chevron-back" size={15} color={colors.pink} />
          <Text style={styles.crumbText} numberOfLines={1}>{selectedCat.name}</Text>
          <Ionicons name="close" size={15} color={colors.faint} />
        </Pressable>
      )}
      <View style={styles.controls}>
        <Pressable onPress={() => { tap(); router.push("/filters"); }} style={styles.filterBtn}>
          <Ionicons name="options-outline" size={16} color={colors.text} />
          <Text style={styles.filterText}>Фильтры{filterCount > 0 ? ` · ${filterCount}` : ""}</Text>
        </Pressable>
        <Pressable onPress={() => { tap(); router.push("/filters"); }} style={styles.sortBtn} hitSlop={6}>
          <Text style={styles.sortText} numberOfLines={1}>{SORT_LABELS[f.sort]}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.muted} />
        </Pressable>
      </View>
      <Text style={styles.count}>
        {loading && products.length === 0 ? "Загрузка…" : `${total.toLocaleString("ru-RU")} ${plural(total, "товар", "товара", "товаров")}`}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={styles.titleRow}>
        <IconButton name="menu" onPress={() => setCatOpen(true)} />
        <Text style={styles.title}>Каталог</Text>
        <IconButton name="barcode-outline" onPress={() => router.push("/scanner")} />
      </View>
      <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>
        <SearchBar value={query} onChangeText={setQuery} onSubmit={() => f.set({ search: query.trim() })} placeholder="Поиск товаров" />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, "refresh")} tintColor={colors.pink} />}
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
          ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 24 }} color={colors.pink} /> : null}
        />
      )}
    </View>
  );
}

const styles = themed(() => ({
  titleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingBottom: 6 },
  title: { flex: 1, fontSize: 22, fontWeight: "700", color: colors.text, marginLeft: 4 },
  tiles: { paddingHorizontal: 5, paddingTop: 10, gap: 10 },
  tile: {
    width: 80,
    height: 88,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  tileText: { fontSize: 10.5, color: colors.text, textAlign: "center", lineHeight: 13 },
  crumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginLeft: 5,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.pinkSoft,
    maxWidth: "90%",
  },
  crumbText: { color: colors.pink, fontWeight: "700", fontSize: 13, flexShrink: 1 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 5, marginTop: 12 },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "55%" },
  sortText: { color: colors.muted, fontSize: 13 },
  count: { color: colors.faint, fontSize: 12, marginHorizontal: 6, marginTop: 10, marginBottom: 2 },
}));
