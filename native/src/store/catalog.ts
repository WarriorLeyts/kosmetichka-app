import { createContext, useContext } from "react";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, type CatalogQuery } from "../api";
import type { Brand, Category } from "../types";

export type Sort = NonNullable<CatalogQuery["sort"]>;
export type Quick = "new" | "sale" | "gift" | "promo";
export type QuickFilter = { key: Quick; label: string; visible: boolean };

/** the quick filters until the admin panel's settings arrive */
export const QUICK_DEFAULT: QuickFilter[] = [
  { key:"promo", label:"Акции", visible:true },
  { key: "new", label: "Новинки", visible: true },
  { key: "sale", label: "Со скидкой", visible: true },
  { key: "gift", label: "Подарочные наборы", visible: true },
];

export const SORT_LABELS: Record<Sort, string> = {
  popularity: "Популярные",
  price_asc: "Сначала дешевле",
  price_desc: "Сначала дороже",
  name: "По названию",
};

type CatalogState = {
  search: string;
  categoryGuid: string | null;
  brandGuids: string[];
  sort: Sort;
  onlyStock: boolean;
  quick: Quick[];
  /** price range «от – до», ₽ (null — no bound) */
  priceMin: number | null;
  priceMax: number | null;
  /** product-type chip inside a subcategory (label from SUB_FILTERS) */
  typeLabel: string | null;
  /** bumps when filters change, so the list reloads */
  version: number;
  /** the search field has text that is not applied yet (debounce): the list shows «loading» at once */
  typing: boolean;

  categories: Category[];
  brands: Brand[];
  /** names / order / shown — admin panel → Каталог → Быстрые фильтры */
  quickFilters: QuickFilter[];
  /** show them as chips above the goods */
  quickChips: boolean;
  metaLoaded: boolean;
  loadMeta: () => Promise<void>;

  set: (patch: Partial<Pick<CatalogState, "search" | "categoryGuid" | "brandGuids" | "sort" | "onlyStock" | "quick" | "priceMin" | "priceMax" | "typeLabel">>) => void;
  reset: () => void;
  activeFilterCount: () => number;
  /** category + all its descendants, as the site does */
  categoryGuidsFor: (guid: string | null) => string[];
};

const DEFAULTS = { search: "", categoryGuid: null, brandGuids: [], sort: "popularity" as Sort, onlyStock: false, quick: [] as Quick[], priceMin: null as number | null, priceMax: null as number | null, typeLabel: null as string | null };

/** Top-level categories, like the site's sidebar (children of «Каталог», or roots). */
export function topCategories(all: Category[]): Category[] {
  const root = all.find((c) => c.name.toLowerCase() === "каталог");
  return all.filter((c) => !c.hidden && c.name.toLowerCase() !== "каталог" && (root ? c.parentGuid === root.guid : !c.parentGuid));
}

export function childCategories(all: Category[], parentGuid: string): Category[] {
  return all.filter((c) => c.parentGuid === parentGuid);
}

const META_KEY = "kosmetichka-catalog-meta";
type Meta = { categories: Category[]; brands: Brand[]; quick?: QuickFilter[]; quickChips?: boolean };
// categories + brands are the same for every catalogue instance: one shared copy and one request
let sharedMeta: Meta | null = null;
let metaLoading: Promise<void> | null = null;
const metaListeners = new Set<(m: Meta) => void>();
const publishMeta = (m: Meta) => {
  sharedMeta = m;
  metaListeners.forEach((f) => f(m));
};

// shown at once from the phone's copy, refreshed from the server in the background
function loadSharedMeta(): Promise<void> {
  if (metaLoading) return metaLoading;
  metaLoading = (async () => {
    let fresh = false;
    try {
      const raw = await AsyncStorage.getItem(META_KEY);
      if (raw && !sharedMeta) {
        const cached = JSON.parse(raw) as { at: number } & Meta;
        if (Array.isArray(cached.categories) && Array.isArray(cached.brands)) {
          publishMeta({ categories: cached.categories, brands: cached.brands, quick: cached.quick, quickChips: cached.quickChips });
          fresh = Date.now() - cached.at < 10 * 60_000;
        }
      }
    } catch {
      /* no cached copy */
    }
    if (fresh) return;
    try {
      const { categories, brands, quick, quickChips } = await api.catalogMeta();
      publishMeta({ categories, brands, quick, quickChips });
      AsyncStorage.setItem(META_KEY, JSON.stringify({ at: Date.now(), categories, brands, quick, quickChips })).catch(() => {});
    } catch {
      /* filters just stay empty (or on the cached copy) */
    }
  })().finally(() => {
    metaLoading = null;
  });
  return metaLoading;
}

/** the admin panel's quick filters (only known keys, each once), the defaults until they come */
function quickOf(m: Meta | null): QuickFilter[] {
  const list = (m?.quick ?? []).filter((q, i, a) => QUICK_DEFAULT.some((d) => d.key === q.key) && a.findIndex((x) => x.key === q.key) === i && q.label);
  return [{key:"promo",label:"Акции",visible:true}, ...(list.length ? list : QUICK_DEFAULT).filter(q=>q.key!=="promo")];
}

export type CatalogStore = UseBoundStore<StoreApi<CatalogState>>;

/** A catalogue state (search, filters, sort). The «Каталог» tab and the order picker each have their own. */
export function createCatalogStore(): CatalogStore {
  const store = create<CatalogState>((set, get) => ({
    ...DEFAULTS,
    version: 0,
    typing: false,
    categories: sharedMeta?.categories ?? [],
    brands: sharedMeta?.brands ?? [],
    quickFilters: quickOf(sharedMeta),
    quickChips: sharedMeta?.quickChips ?? true,
    metaLoaded: !!sharedMeta,

    loadMeta: async () => {
      if (get().metaLoaded && !metaLoading) return;
      return loadSharedMeta();
    },

    // another category → its type chips no longer apply
    set: (patch) =>
      set((s) => ({
        ...("categoryGuid" in patch && patch.categoryGuid !== s.categoryGuid && !("typeLabel" in patch) ? { typeLabel: null } : {}),
        ...patch,
        ...("search" in patch ? { typing: false } : {}),
        version: s.version + 1,
      })),
    reset: () => set((s) => ({ ...DEFAULTS, typing: false, version: s.version + 1 })),

    activeFilterCount: () => {
      const s = get();
      return (s.categoryGuid ? 1 : 0) + s.brandGuids.length + (s.onlyStock ? 1 : 0) + s.quick.length + (s.priceMin !== null || s.priceMax !== null ? 1 : 0) + (s.typeLabel ? 1 : 0) + (s.sort !== "popularity" ? 1 : 0);
    },

    categoryGuidsFor: (guid) => {
      if (!guid) return [];
      const all = get().categories;
      const out = [guid];
      const walk = (g: string) => {
        for (const c of all) if (c.parentGuid === g) {
          out.push(c.guid);
          walk(c.guid);
        }
      };
      walk(guid);
      return out;
    },
  }));
  metaListeners.add((m) => store.setState({ categories: m.categories, brands: m.brands, quickFilters: quickOf(m), quickChips: m.quickChips ?? true, metaLoaded: true }));
  return store;
}

/** The «Каталог» tab (home, scanner, desktop search write here). */
export const useCatalog = createCatalogStore();
/** «Добавить товар» to an order: its own search and filters, the tab is not touched. */
export const usePickCatalog = createCatalogStore();

/** Named instances, for routes that edit one of them (/filters?store=pick, /scanner?store=pick). */
export const CATALOG_STORES = { main: useCatalog, pick: usePickCatalog } as const;
export type CatalogStoreName = keyof typeof CATALOG_STORES;
export function catalogStoreByName(name: unknown): CatalogStore {
  return name === "pick" ? usePickCatalog : useCatalog;
}

/** The catalogue components read the store of the nearest provider (the tab's by default). */
export const CatalogStoreContext = createContext<{ store: CatalogStore; name: CatalogStoreName }>({ store: useCatalog, name: "main" });
export function useCatalogStore() {
  return useContext(CatalogStoreContext);
}
