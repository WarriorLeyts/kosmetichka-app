import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { imageUrl } from "../api";
import { plural } from "../format";
import { useIOS } from "../ios";
import { PRICE_TYPES, searchProducts, type PriceType, type ProductRow } from "../products";
import { fetchCatalog, filterCount, queryOf, SORT_LABELS, useCatalogMeta, type CatalogProduct, type CatalogStore, type Sort } from "../catalog";
import { SUB_FILTERS } from "../subFilters";
import { useDesktop } from "../useDesktop";
import { CatalogCard } from "./CatalogCard";
import { CatalogFilters } from "./CatalogFilters";
import { CategoryDrawer } from "./CategoryDrawer";
import { Sheet, SheetOptions } from "./iosui/Sheet";
import { ErrorState } from "./kit";
import { Scanner } from "./Scanner";
import { useTabBarSpace } from "./TabBar";
import { tap } from "./ui";

const VIOLET = "#8b3dff";
const SORT_OPTIONS = (Object.keys(SORT_LABELS) as Sort[]).map((v) => ({ value: v, label: SORT_LABELS[v] }));
const PRICE_SHORT: Record<PriceType, string> = { retail: "Розница", discount: "Скидка по карте", wholesale: "Опт", big_wholesale: "Крупный опт" };
const SIDEBAR = 248; // Sidebar.tsx

/** Search field with its own state: typing re-renders only this field, not the whole catalog. */
function SearchInput({ store }: { store: CatalogStore }) {
  const c = useIOS();
  const search = store((s) => s.search);
  const [query, setQuery] = useState(search);

  // keep in sync when search is set from elsewhere (scanner, reset); not while typing
  useEffect(() => {
    setQuery((q) => (q.trim() === search ? q : search));
  }, [search]);

  // debounce typing
  useEffect(() => {
    if (query.trim() === search) return;
    const t = setTimeout(() => store.getState().set({ search: query.trim() }), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <TextInput
      value={query}
      onChangeText={setQuery}
      placeholder="Название, бренд, артикул, штрихкод"
      placeholderTextColor={c.secondary}
      style={[styles.searchInput, { color: c.label }, Platform.OS === "web" && ({ outlineStyle: "none" } as object)]}
      returnKeyType="search"
      onSubmitEditing={() => store.getState().set({ search: query.trim() })}
      clearButtonMode="while-editing"
      autoCorrect={false}
      accessibilityLabel="Поиск по каталогу"
      keyboardAppearance={c.blurTint}
    />
  );
}

type Props = {
  store: CatalogStore;
  /** what is above the search: the tab header or the picker's title bar */
  top: ReactNode;
  /** «Товары» tab (room for the tab bar and the side menu) or the full-screen picker */
  tab?: boolean;
  priceType: PriceType;
  onPriceType: (t: PriceType) => void;
  onOpen: (p: CatalogProduct) => void;
  /** picker: the card's button */
  actionLabel?: string;
  onAction?: (p: CatalogProduct) => void;
  busyId?: number | null;
  /** the scanned barcode matched exactly one product */
  onScanHit: (row: ProductRow) => void;
};

/**
 * The customer app's catalog (categories with 3D icons, sub-filters, filters, sorting, search, card grid)
 * for staff: + price type selector, + barcode scanner. Used by the «Товары» tab and by ProductPicker.
 */
export function Catalog({ store, top, tab, priceType, onPriceType, onOpen, actionLabel, onAction, busyId, onScanHit }: Props) {
  const insets = useSafeAreaInsets();
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const { width } = useWindowDimensions();
  const desktop = useDesktop();
  const tabSpace = useTabBarSpace();
  const f = store();
  const meta = useCatalogMeta();

  // computer: as many ~220 px cards as fit (content up to 1180 px); phone: like the customer app
  const pad = desktop ? 32 : 11;
  const avail = Math.min(1180, width - (desktop && tab ? SIDEBAR : 0)) - pad * 2;
  const columns = desktop ? Math.max(3, Math.min(6, Math.floor(avail / 220))) : width >= 900 ? 4 : width >= 600 ? 3 : 2;

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [scan, setScan] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const reqId = useRef(0);
  const listRef = useRef<FlatList<CatalogProduct>>(null);

  useEffect(() => {
    meta.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(
    async (nextPage: number, mode: "replace" | "append" | "refresh") => {
      const id = ++reqId.current;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError("");
      const { typeQ, ...q } = queryOf(store.getState(), nextPage);
      try {
        let r = await fetchCatalog(q);
        // a site without the type filter returns everything — narrow by the main fragment instead
        if (typeQ && !r.nameAnyApplied && !q.search) r = await fetchCatalog({ ...q, nameAny: undefined, search: typeQ[0] });
        if (id !== reqId.current) return;
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
        }
      }
    },
    [store]
  );

  // reload whenever filters change; a category's subcategories come from the meta — wait for it then
  const needMeta = !!f.categoryGuid && !meta.loaded;
  useEffect(() => {
    if (needMeta) return;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    load(1, "replace");
  }, [f.version, needMeta, load]);

  const onScanned = async (code: string) => {
    setScan(false);
    setScanMsg("");
    store.getState().set({ search: code });
    try {
      // exact barcode lookup in the admin search: one product → open / pick it at once
      const r = await searchProducts(code, "", 0, 5);
      if (r.items.length === 1) onScanHit(r.items[0]);
      else if (r.items.length === 0) setScanMsg(`Товар со штрихкодом ${code} не найден`);
    } catch {
      /* the grid shows the search */
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: CatalogProduct }) => (
      <View style={{ flex: 1 / columns, minWidth: 0 }}>
        <CatalogCard product={item} priceType={priceType} onPress={onOpen} actionLabel={actionLabel} onAction={onAction} busy={busyId === item.id} />
      </View>
    ),
    [columns, priceType, onOpen, actionLabel, onAction, busyId]
  );
  const closeCats = useCallback(() => setCatOpen(false), []);
  const selectCat = useCallback((guid: string | null) => store.getState().set({ categoryGuid: guid }), [store]);
  const nFilters = filterCount(f);
  const selectedCat = meta.categories.find((x) => x.guid === f.categoryGuid);
  const types = f.categoryGuid ? SUB_FILTERS[f.categoryGuid] : undefined;
  const fieldBg = dark ? "#2B193D" : "rgba(118,118,128,0.12)";

  const header = (
    <View>
      {top}

      {/* search: categories · field · scanner */}
      <View style={[styles.search, { backgroundColor: fieldBg }]}>
        <Pressable onPress={() => { tap(); setCatOpen(true); }} accessibilityRole="button" accessibilityLabel="Все категории" style={[styles.round, { backgroundColor: c.cell }]}>
          <Ionicons name="apps-outline" size={20} color={VIOLET} />
        </Pressable>
        <Ionicons name="search-outline" size={21} color={c.secondary} />
        <SearchInput store={store} />
        <Pressable
          onPress={() => { tap(); setScanMsg(""); setScan(true); }}
          accessibilityRole="button"
          accessibilityLabel="Сканировать штрихкод"
          style={[styles.round, { backgroundColor: c.cell }]}
        >
          <Ionicons name="scan-outline" size={21} color={VIOLET} />
        </Pressable>
      </View>
      {scanMsg ? <Text style={styles.scanMsg}>{scanMsg}</Text> : null}

      {/* which price the cards show */}
      <View style={[styles.segment, { backgroundColor: fieldBg }, desktop && styles.segmentWide]} accessibilityRole="radiogroup" accessibilityLabel="Цены">
        {PRICE_TYPES.map((t) => {
          const on = t === priceType;
          return (
            <Pressable
              key={t}
              onPress={() => { tap(); onPriceType(t); }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[styles.segItem, desktop && { paddingHorizontal: 18 }, on && { backgroundColor: dark ? "#4A2D66" : "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }]}
            >
              <Text numberOfLines={1} style={[styles.segText, { color: on ? (dark ? "#fff" : VIOLET) : c.secondary, fontWeight: on ? "700" : "500" }]}>
                {PRICE_SHORT[t]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* count + filters + sort */}
      <View style={styles.controls}>
        <Text style={[styles.count, { color: c.secondary }]} numberOfLines={1}>
          {loading && products.length === 0 ? "Загрузка…" : `${total.toLocaleString("ru-RU")} ${plural(total, "товар", "товара", "товаров")}`}
        </Text>
        <Pressable
          onPress={() => { tap(); setFiltersOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel={nFilters > 0 ? `Фильтры, выбрано ${nFilters}` : "Фильтры"}
          style={[styles.filterBtn, { backgroundColor: fieldBg }]}
        >
          <Ionicons name="options-outline" size={19} color={c.label} />
          {nFilters > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{nFilters}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          onPress={() => { tap(); setSortOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel={`Сортировка: ${SORT_LABELS[f.sort]}`}
          style={[styles.sortBtn, { backgroundColor: c.cell }]}
        >
          <Text style={[styles.sortText, { color: c.label }]} numberOfLines={1}>{SORT_LABELS[f.sort]}</Text>
          <Ionicons name="chevron-down" size={16} color={c.label} />
        </Pressable>
      </View>

      {selectedCat ? (
        <Pressable onPress={() => { tap(); f.set({ categoryGuid: null }); }} accessibilityRole="button" accessibilityLabel={`Категория ${selectedCat.name}, убрать`} style={styles.catChip}>
          <Text style={styles.catChipText} numberOfLines={1}>{selectedCat.name}</Text>
          <Ionicons name="close" size={15} color={VIOLET} />
        </Pressable>
      ) : null}

      {/* product types inside a subcategory: «Все», «Мисты», «Спреи»… */}
      {types ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.types, { paddingHorizontal: pad + 5 }]} style={[styles.typesWrap, { marginHorizontal: -pad }]}>
          {[null, ...types.map((t) => t.label)].map((label) => {
            const on = f.typeLabel === label;
            return (
              <Pressable
                key={label ?? "all"}
                onPress={() => { tap(); if (!on) f.set({ typeLabel: label }); }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={label ?? "Все товары подкатегории"}
                style={[styles.typeChip, on ? { backgroundColor: VIOLET, borderColor: VIOLET } : { backgroundColor: c.cell, borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(139,61,255,0.18)" }]}
              >
                <Text style={[styles.typeChipText, { color: on ? "#fff" : c.label }]} numberOfLines={1}>{label ?? "Все"}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  const container = {
    paddingHorizontal: pad,
    paddingTop: tab ? insets.top + (desktop ? 12 : 0) : 0,
    paddingBottom: tab ? tabSpace + 8 : insets.bottom + 20,
    width: "100%" as const,
    maxWidth: desktop ? 1180 : undefined,
    alignSelf: "center" as const,
  };

  return (
    <View style={{ flex: 1 }}>
      {error && products.length === 0 ? (
        <ScrollView contentContainerStyle={container}>
          {header}
          <ErrorState text={error} onRetry={() => load(1, "replace")} />
        </ScrollView>
      ) : (
        <FlatList
          key={`cols-${columns}`}
          ref={listRef}
          data={products}
          numColumns={columns}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={container}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={renderItem}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={9}
          removeClippedSubviews={Platform.OS === "android"}
          onEndReachedThreshold={1.2}
          onEndReached={() => {
            if (!loading && hasMore && products.length > 0) load(page + 1, "append");
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, "refresh")} tintColor={VIOLET} colors={[VIOLET]} />}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={{ marginTop: 60 }} color={VIOLET} size="large" />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={42} color={c.secondary} />
                <Text style={[styles.emptyTitle, { color: c.label }]}>Ничего не нашлось</Text>
                <Text style={[styles.emptyText, { color: c.secondary }]}>Попробуйте изменить запрос или сбросить фильтры</Text>
                {nFilters > 0 || f.search || f.categoryGuid ? (
                  <Pressable onPress={() => { tap(); f.reset(); }} hitSlop={8} accessibilityRole="button">
                    <Text style={styles.emptyAction}>Сбросить фильтры</Text>
                  </Pressable>
                ) : null}
              </View>
            )
          }
          ListFooterComponent={loading && products.length > 0 ? <ActivityIndicator style={{ margin: 24 }} color={VIOLET} /> : null}
        />
      )}

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
      <CategoryDrawer open={catOpen} onClose={closeCats} categories={meta.categories} selected={f.categoryGuid} onSelect={selectCat} />
      <CatalogFilters open={filtersOpen} onClose={() => setFiltersOpen(false)} store={store} />
      <Scanner open={scan} onClose={() => setScan(false)} onCode={onScanned} />
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 9, height: 52, borderRadius: 26, paddingLeft: 5, paddingRight: 5, marginHorizontal: 5 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 17, height: "100%" },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  scanMsg: { color: "#DC2626", fontSize: 14, fontWeight: "600", marginTop: 8, marginHorizontal: 10 },
  segment: { flexDirection: "row", borderRadius: 19, padding: 3, marginHorizontal: 5, marginTop: 12, gap: 2 },
  // computer: a compact control, not stretched over 1100 px
  segmentWide: { alignSelf: "flex-start" },
  segItem: { flexGrow: 1, flexShrink: 1, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  segText: { fontSize: 13.5 },
  controls: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 5, marginTop: 12, marginBottom: 8 },
  count: { flex: 1, fontSize: 15 },
  filterBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  filterBadge: { position: "absolute", top: -3, right: -3, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: VIOLET, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  filterBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 38, borderRadius: 19, paddingHorizontal: 14, maxWidth: "52%", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" },
  sortText: { fontSize: 15, flexShrink: 1 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginHorizontal: 5, marginBottom: 6, paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: "rgba(139,61,255,0.1)", maxWidth: "90%" },
  catChipText: { color: VIOLET, fontSize: 14, fontWeight: "500", flexShrink: 1 },
  typesWrap: { marginTop: 4, marginBottom: 6 },
  types: { gap: 8 },
  typeChip: { height: 36, paddingHorizontal: 15, borderRadius: 18, borderWidth: 1, justifyContent: "center" },
  typeChipText: { fontSize: 15, fontWeight: "500" },
  empty: { alignItems: "center", paddingVertical: 50, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 15, textAlign: "center" },
  emptyAction: { color: VIOLET, fontSize: 16, fontWeight: "600", marginTop: 6 },
});
