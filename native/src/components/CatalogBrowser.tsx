import { CardHintStrip } from "./CardHint";
import { DESKTOP_WIDE, useDesktop } from "@/useDesktop";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, imageUrl } from "@/api";
import { Image } from "expo-image";
import { SORT_LABELS, useCatalogStore, type Sort } from "@/store/catalog";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { effectivePriceType } from "@/pricing";
import { iosText, useIOS } from "@/ios";
import { CatalogCard } from "@/components/CatalogCard";
import { ClearX } from "@/components/ClearX";
import { BrandHeader } from "@/components/iosui/BrandHeader";
import { TitleBar } from "@/components/iosui/TitleBar";
import { useTabBarSpace } from "@/components/TabBar";
import { Sheet, SheetOptions } from "@/components/iosui/Sheet";
import { CategoryDrawer } from "@/components/CategoryDrawer";
import { BrandSheet } from "@/components/BrandSheet";
import { BrandButton } from "@/components/BrandButton";
import { DESKTOP_SIDEBAR_W, DesktopCategories } from "@/components/DesktopCategories";
import { Empty, ErrorView, tap } from "@/components/ui";
import { plural } from "@/format";
import { useAddToCart } from "@/useAddToCart";
import { SUB_FILTERS } from "@/subFilters";
import type { Product } from "@/types";

const EMPTY: Product[] = [];
const SORT_OPTIONS = (Object.keys(SORT_LABELS) as Sort[]).map((v) => ({ value: v, label: SORT_LABELS[v] }));

/** Search field with its own state: typing re-renders only this field, not the whole catalog. */
function SearchInput() {
  const c = useIOS();
  const { store } = useCatalogStore();
  const search = store((s) => s.search);
  const [query, setQuery] = useState(search);

  // keep in sync when search is set from elsewhere (home, scanner, reset); not while typing ("крем " keeps its space)
  useEffect(() => {
    setQuery((q) => (q.trim() === search ? q : search));
  }, [search]);

  // debounce typing; meanwhile the list shows «loading» at once (typing flag), not the old results
  useEffect(() => {
    const pending = query.trim() !== store.getState().search;
    if (store.getState().typing !== pending) store.setState({ typing: pending });
    if (!pending) return;
    const t = setTimeout(() => store.getState().set({ search: query.trim() }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  useEffect(() => () => store.setState({ typing: false }), [store]);

  return (
    <>
    <TextInput
      value={query}
      onChangeText={setQuery}
      placeholder="Название, бренд, артикул"
      placeholderTextColor={c.secondary}
      style={[styles.searchInput, { color: c.label }]}
      returnKeyType="search"
      onSubmitEditing={() => store.getState().set({ search: query.trim() })}
      autoCorrect={false}
      accessibilityLabel="Поиск по каталогу"
      keyboardAppearance={c.blurTint}
    />
    <ClearX
      value={query}
      color={c.secondary}
      onClear={() => {
        setQuery("");
        store.getState().set({ search: "" });
      }}
    />
    </>
  );
}

/** «Добавить товар» to an order: the cards pick products instead of putting them into the cart. */
export type CatalogPick = {
  title: string;
  onBack: () => void;
  /** product id → picked quantity (all its variants together) */
  counts: Map<number, number>;
  /** product whose variants are being checked */
  busyId: number | null;
  onAdd: (p: Product) => void;
  onStep: (p: Product, dir: 1 | -1) => void;
  /** room under the list for the screen's bottom button */
  bottomSpace: number;
};

/**
 * The catalogue: search with categories and scanner, type chips, count, filters, sort, card grid.
 * The «Каталог» tab renders it as is; «Добавить товар» renders it with `pick` (and its own store
 * through CatalogStoreContext).
 */
export function CatalogBrowser({ pick }: { pick?: CatalogPick }) {
  const insets = useSafeAreaInsets();
  const c = useIOS();
  const { width } = useWindowDimensions();
  const desktop = useDesktop();
  // computer: categories on the left, the goods beside them — up to 5 cards in a row (≥ 165 px each)
  const deskMain = Math.min(width, DESKTOP_WIDE) - 40 - DESKTOP_SIDEBAR_W - 24;
  const columns = desktop ? Math.max(3, Math.min(5, Math.floor(deskMain / 165))) : width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const tabSpace = useTabBarSpace();
  const bottomSpace = pick ? pick.bottomSpace : tabSpace;
  const { store, name: storeName } = useCatalogStore();
  const f = store();
  const customer = useAuth((s) => s.customer);
  const cart = useCartStore((s) => s.items);
  const favorites = useFavorites((s) => s.items);
  const toggleFav = useFavorites((s) => s.toggle);
  const addToCart = useAddToCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  // a new first page is on its way: the old (unrelated) list is not shown meanwhile
  const [replacing, setReplacing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  // far down the list: a round «наверх» button takes the customer back to the search at once
  const [toTop, setToTop] = useState(false);
  const reqId = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const listRef = useRef<FlatList<Product>>(null);

  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    f.loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(
    async (nextPage: number, mode: "replace" | "append" | "refresh") => {
      const id = ++reqId.current;
      // a stale request is cancelled (and its late answer ignored by the id check)
      abort.current?.abort();
      const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      abort.current = ctl;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setReplacing(mode === "replace");
      setError("");
      const s = store.getState();
      const type = s.categoryGuid && s.typeLabel ? SUB_FILTERS[s.categoryGuid]?.find((x) => x.label === s.typeLabel) : undefined;
      try {
        const q = {
          page: nextPage,
          search: s.search || undefined,
          categoryGuids: s.categoryGuidsFor(s.categoryGuid),
          brandGuids: s.brandGuids,
          sort: s.sort,
          onlyStock: s.onlyStock,
          quick: s.quick,
          nameAny: type?.q,
        };
        let r = await api.catalog(q, ctl?.signal);
        // a site without the type filter yet returns everything — narrow by the main fragment instead
        if (type && !r.nameAnyApplied && !q.search && id === reqId.current) r = await api.catalog({ ...q, nameAny: undefined, search: type.q[0] }, ctl?.signal);
        if (id !== reqId.current) return;
        // warm the image cache for the cards that are about to scroll in
        Image.prefetch(r.products.map((p) => imageUrl(p.images?.[0]?.path, 480)).filter((u): u is string => !!u), "disk").catch(() => {});
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
          setReplacing(false);
        }
      }
    },
    [store]
  );

  // reload whenever filters change (and on first open)
  // a category's subcategories come from the meta — wait for it only when a category is chosen
  const needMeta = !!f.categoryGuid && !f.metaLoaded;
  useEffect(() => {
    if (needMeta) return;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    load(1, "replace");
  }, [f.version, needMeta, load]);

  // signed in / out / another price type: the list again (a guest's list has no wholesale prices)
  // (only once the account is known: the start of the app sets the saved account — not a change)
  const authLoading = useAuth((s) => s.loading);
  const accountKey = `${customer?.id ?? 0}:${customer?.priceType ?? ""}`;
  const seenAccount = useRef<string | null>(authLoading ? null : accountKey);
  useEffect(() => {
    if (authLoading) return;
    if (seenAccount.current === null) {
      seenAccount.current = accountKey;
      return;
    }
    if (seenAccount.current === accountKey) return;
    seenAccount.current = accountKey;
    if (!needMeta) load(1, "refresh");
  }, [accountKey, authLoading, needMeta, load]);

  const active = effectivePriceType(cart, customer);
  // lookups built once per change instead of scanning arrays for every card
  const inCartMap = useMemo(() => new Map(cart.map((x) => [x.cartKey, x.quantity])), [cart]);
  const favSet = useMemo(() => new Set(favorites.map((x) => x.id)), [favorites]);
  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={{ flex: 1 / columns }}>
        <CatalogCard
          product={item}
          customer={customer}
          activePrice={active}
          inCart={inCartMap.get(String(item.id)) ?? 0}
          isFavorite={favSet.has(item.id)}
          onAdd={pick ? pick.onAdd : addToCart}
          onFavorite={toggleFav}
          pickMode={!!pick}
          picked={pick?.counts.get(item.id) ?? 0}
          picking={pick?.busyId === item.id}
          onPickStep={pick?.onStep}
        />
      </View>
    ),
    [columns, customer, active, inCartMap, favSet, addToCart, toggleFav, pick]
  );
  const closeCats = useCallback(() => setCatOpen(false), []);
  const selectCat = useCallback((guid: string | null) => store.getState().set({ categoryGuid: guid }), [store]);
  const routeSuffix = storeName === "main" ? "" : `?store=${storeName}`;
  // typing or a new first page on its way: show «loading» at once instead of the old list
  const busy = f.typing || (loading && replacing);
  // the filters badge: not the sort, not the brands (they show on «Бренд · N»)
  const filterCount = f.activeFilterCount() - (f.sort !== "popularity" ? 1 : 0) - f.brandGuids.length;
  const selectedCat = f.categories.find((x) => x.guid === f.categoryGuid);
  // the chosen brands with their names (their logos on «Бренд»)
  const selectedBrands = useMemo(
    () => f.brandGuids.map((g) => f.brands.find((b) => b.guid === g)).filter((b): b is NonNullable<typeof b> => !!b),
    [f.brandGuids, f.brands]
  );
  const types = f.categoryGuid ? SUB_FILTERS[f.categoryGuid] : undefined;
  const dark = c.blurTint === "dark";
  // a phone: the count, «Бренд», filters and sort in one row — the sort shows only its icon
  const narrow = !desktop && width < 440;

  const header = (
    <View>
      {pick ? (
        <View style={{ paddingHorizontal: 5 }}>
          <TitleBar title={pick.title} onBack={pick.onBack} />
        </View>
      ) : (
        <>
          {/* top: «КОСМЕТИЧКА» + notifications */}
          <View style={{ paddingHorizontal: 5 }}>
            <BrandHeader />
          </View>

          {/* large title */}
          <Text style={[iosText.largeTitle, styles.title, { color: c.label }]} accessibilityRole="header">
            Каталог
          </Text>
        </>
      )}

      {/* search */}
      <View style={[styles.search, { backgroundColor: c.blurTint === "dark" ? "#2B193D" : "rgba(118,118,128,0.12)" }]}>
        {desktop ? <View style={{ width: 8 }} /> : (
        <Pressable
          onPress={() => { tap(); setCatOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel="Все категории"
          style={[styles.scan, { backgroundColor: c.cell }]}
        >
          <Ionicons name="apps-outline" size={20} color="#8b3dff" />
        </Pressable>
        )}
        <Ionicons name="search-outline" size={21} color={c.secondary} />
        <SearchInput />
        <Pressable
          onPress={() => { tap(); router.push(`/scanner${routeSuffix}`); }}
          accessibilityRole="button"
          accessibilityLabel="Сканировать штрихкод"
          style={[styles.scan, { backgroundColor: c.cell }]}
        >
          <Ionicons name="scan-outline" size={21} color="#8b3dff" />
        </Pressable>
      </View>

      {/* count + filters + sort */}
      <View style={styles.controls}>
        <Text style={[styles.count, { color: c.secondary }]} numberOfLines={1}>
          {busy ? (f.typing || f.search ? "Поиск…" : "Загрузка…") : `${total.toLocaleString("ru-RU")} ${plural(total, "товар", "товара", "товаров")}`}
        </Text>
        <BrandButton brands={selectedBrands} count={f.brandGuids.length} onPress={() => setBrandOpen(true)} max={narrow ? 1 : 2} />
        <Pressable
          onPress={() => { tap(); router.push(`/filters${routeSuffix}`); }}
          accessibilityRole="button"
          accessibilityLabel={filterCount > 0 ? `Фильтры, выбрано ${filterCount}` : "Фильтры"}
          style={[styles.filterBtn, { backgroundColor: c.blurTint === "dark" ? "#2B193D" : "rgba(118,118,128,0.12)" }]}
        >
          <Ionicons name="options-outline" size={19} color={c.label} />
          {filterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          onPress={() => { tap(); setSortOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel={`Сортировка: ${SORT_LABELS[f.sort]}`}
          style={[styles.sortBtn, narrow && styles.sortBtnIcon, { backgroundColor: c.cell }]}
        >
          {narrow ? (
            <>
              <Ionicons name="swap-vertical" size={19} color={c.label} />
              {f.sort !== "popularity" ? <View style={styles.sortDot} /> : null}
            </>
          ) : (
            <>
              <Text style={[styles.sortText, { color: c.label }]} numberOfLines={1}>{SORT_LABELS[f.sort]}</Text>
              <Ionicons name="chevron-down" size={16} color={c.label} />
            </>
          )}
        </Pressable>
      </View>

      {selectedCat ? (
        <Pressable
          onPress={() => { tap(); f.set({ categoryGuid: null }); }}
          accessibilityRole="button"
          accessibilityLabel={`Категория ${selectedCat.name}, убрать`}
          style={styles.catChip}
        >
          <Text style={styles.catChipText} numberOfLines={1}>{selectedCat.name}</Text>
          <Ionicons name="close" size={15} color="#8b3dff" />
        </Pressable>
      ) : null}
      {/* retail without a loyalty card: what «Скидка по карте» needs */}
      <CardHintStrip />

      {/* product types inside a subcategory: «Все», «Мисты», «Спреи»… */}
      {types ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.types}
          style={styles.typesWrap}
        >
          {[null, ...types.map((t) => t.label)].map((label) => {
            const on = f.typeLabel === label;
            return (
              <Pressable
                key={label ?? "all"}
                onPress={() => {
                  tap();
                  if (!on) f.set({ typeLabel: label });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={label ?? "Все товары подкатегории"}
                style={[
                  styles.typeChip,
                  on
                    ? { backgroundColor: "#8b3dff", borderColor: "#8b3dff" }
                    : { backgroundColor: c.cell, borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(139,61,255,0.18)" },
                ]}
              >
                <Text style={[styles.typeChipText, { color: on ? "#fff" : c.label }]} numberOfLines={1}>
                  {label ?? "Все"}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "transparent", paddingTop: insets.top }}>
      {error && products.length === 0 ? (
        <>
          <View style={{ paddingHorizontal: 11 }}>{header}</View>
          <ErrorView message={error} onRetry={() => load(1, "replace")} />
        </>
      ) : (
        <View style={desktop ? styles.deskRow : { flex: 1 }}>
        {desktop ? (
          <View style={styles.deskSide}>
            <DesktopCategories categories={f.categories} selected={f.categoryGuid} onSelect={selectCat} />
          </View>
        ) : null}
        <FlatList
          style={{ flex: 1 }}
          key={`cols-${columns}`}
          ref={listRef}
          data={busy ? EMPTY : products}
          numColumns={columns}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={[{ paddingHorizontal: 11, paddingBottom: bottomSpace }, desktop && { paddingHorizontal: 0, paddingBottom: 40 }]}
          ListHeaderComponent={header}
          keyboardDismissMode="on-drag"
          renderItem={renderItem}
          // keep fewer cards mounted on mid-range phones
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={9}
          removeClippedSubviews={Platform.OS === "android"}
          onScroll={(e) => {
            const far = e.nativeEvent.contentOffset.y > e.nativeEvent.layoutMeasurement.height * 1.5;
            setToTop((was) => (was === far ? was : far));
          }}
          scrollEventThrottle={100}
          onEndReachedThreshold={1.2}
          onEndReached={() => {
            // not during a refresh (after login): the next page would cancel the list being reloaded
            if (!loading && !refreshing && !busy && hasMore && products.length > 0) load(page + 1, "append");
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, "refresh")} tintColor="#8b3dff" />}
          ListEmptyComponent={
            busy || loading ? (
              <ActivityIndicator style={{ marginTop: 60 }} color="#8b3dff" size="large" />
            ) : (
              <Empty
                icon="search-outline"
                title="Ничего не нашлось"
                text="Попробуйте изменить запрос или сбросить фильтры"
                action={filterCount > 0 || f.search || f.categoryGuid ? "Сбросить фильтры" : undefined}
                onAction={() => f.reset()}
              />
            )
          }
          ListFooterComponent={loading && !busy && products.length > 0 ? <ActivityIndicator style={{ margin: 24 }} color="#8b3dff" /> : null}
        />
        </View>
      )}

      {toTop ? (
        <Pressable
          onPress={() => {
            tap();
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
          accessibilityRole="button"
          accessibilityLabel="Наверх"
          style={({ pressed }) => [styles.toTop, { bottom: (desktop ? 28 : bottomSpace) + 12, opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="arrow-up" size={24} color="#fff" />
        </Pressable>
      ) : null}
      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title="Сортировка">
        <SheetOptions
          options={SORT_OPTIONS}
          value={f.sort}
          onSelect={(v) => {
            setSortOpen(false);
            if (v !== f.sort) f.set({ sort: v });
          }}
        />
      </Sheet>
      <BrandSheet open={brandOpen} onClose={() => setBrandOpen(false)} store={store} />
      <CategoryDrawer
        open={catOpen}
        onClose={closeCats}
        categories={f.categories}
        selected={f.categoryGuid}
        onSelect={selectCat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toTop: {
    position: "absolute",
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#8b3dff",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 18px rgba(139,61,255,0.38)",
  },
  deskRow: { flex: 1, flexDirection: "row", gap: 24, width: "100%", maxWidth: DESKTOP_WIDE, alignSelf: "center", paddingHorizontal: 20 },
  deskSide: { paddingTop: 24, paddingBottom: 20 },
  typesWrap: { marginHorizontal: -11, marginTop: 4, marginBottom: 6 },
  types: { paddingHorizontal: 16, gap: 8 },
  typeChip: { height: 36, paddingHorizontal: 15, borderRadius: 18, borderWidth: 1, justifyContent: "center" },
  typeChipText: { fontSize: 15, fontWeight: "500" },
  title: { paddingHorizontal: 5, marginTop: 14, marginBottom: 12 },
  search: { flexDirection: "row", alignItems: "center", gap: 9, height: 52, borderRadius: 26, paddingLeft: 5, paddingRight: 5, marginHorizontal: 5 },
  // minWidth 0: on the web the input would otherwise push the scanner button off the field
  searchInput: { flex: 1, minWidth: 0, fontSize: 17, height: "100%" },
  scan: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  controls: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 5, marginTop: 14, marginBottom: 8 },
  count: { flex: 1, minWidth: 0, fontSize: 15 },
  filterBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  filterBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#8b3dff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    maxWidth: "52%",
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
  },
  sortText: { fontSize: 15, flexShrink: 1 },
  sortBtnIcon: { width: 38, paddingHorizontal: 0, justifyContent: "center" },
  sortDot: { position: "absolute", top: 2, right: 2, width: 9, height: 9, borderRadius: 5, backgroundColor: "#8b3dff" },
  brandBtn: { flexDirection: "row", alignItems: "center", gap: 5, height: 38, borderRadius: 19, paddingHorizontal: 13, flexShrink: 0, boxShadow: "0 1px 6px rgba(0,0,0,0.07)" },
  brandBtnOn: { backgroundColor: "#8b3dff" },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginHorizontal: 5,
    marginBottom: 6,
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(139,61,255,0.1)",
    maxWidth: "90%",
  },
  catChipText: { color: "#8b3dff", fontSize: 15, fontWeight: "500", flexShrink: 1 },
});
