import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, type CatalogQuery } from "../api";
import type { Brand, Category } from "../types";

export type Sort = NonNullable<CatalogQuery["sort"]>;
export type Quick = "new" | "sale" | "gift";

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
  /** product-type chip inside a subcategory (label from SUB_FILTERS) */
  typeLabel: string | null;
  /** bumps when filters change, so the list reloads */
  version: number;

  categories: Category[];
  brands: Brand[];
  metaLoaded: boolean;
  loadMeta: () => Promise<void>;

  set: (patch: Partial<Pick<CatalogState, "search" | "categoryGuid" | "brandGuids" | "sort" | "onlyStock" | "quick" | "typeLabel">>) => void;
  reset: () => void;
  activeFilterCount: () => number;
  /** category + all its descendants, as the site does */
  categoryGuidsFor: (guid: string | null) => string[];
};

const DEFAULTS = { search: "", categoryGuid: null, brandGuids: [], sort: "popularity" as Sort, onlyStock: false, quick: [] as Quick[], typeLabel: null as string | null };

/** Top-level categories, like the site's sidebar (children of «Каталог», or roots). */
export function topCategories(all: Category[]): Category[] {
  const root = all.find((c) => c.name.toLowerCase() === "каталог");
  return all.filter((c) => c.name.toLowerCase() !== "каталог" && (root ? c.parentGuid === root.guid : !c.parentGuid));
}

export function childCategories(all: Category[], parentGuid: string): Category[] {
  return all.filter((c) => c.parentGuid === parentGuid);
}

const META_KEY = "kosmetichka-catalog-meta";
let metaLoading: Promise<void> | null = null;

export const useCatalog = create<CatalogState>((set, get) => ({
  ...DEFAULTS,
  version: 0,
  categories: [],
  brands: [],
  metaLoaded: false,

  // categories + brands: shown at once from the phone's copy, refreshed from the server in the background
  loadMeta: async () => {
    if (get().metaLoaded || metaLoading) return metaLoading ?? undefined;
    metaLoading = (async () => {
      let fresh = false;
      try {
        const raw = await AsyncStorage.getItem(META_KEY);
        if (raw && !get().metaLoaded) {
          const cached = JSON.parse(raw) as { at: number; categories: Category[]; brands: Brand[] };
          if (Array.isArray(cached.categories) && Array.isArray(cached.brands)) {
            set({ categories: cached.categories, brands: cached.brands, metaLoaded: true });
            fresh = Date.now() - cached.at < 10 * 60_000;
          }
        }
      } catch {
        /* no cached copy */
      }
      if (fresh) return;
      try {
        const { categories, brands } = await api.catalogMeta();
        set({ categories, brands, metaLoaded: true });
        AsyncStorage.setItem(META_KEY, JSON.stringify({ at: Date.now(), categories, brands })).catch(() => {});
      } catch {
        /* filters just stay empty (or on the cached copy) */
      }
    })().finally(() => {
      metaLoading = null;
    });
    return metaLoading;
  },

  // another category → its type chips no longer apply
  set: (patch) =>
    set((s) => ({
      ...("categoryGuid" in patch && patch.categoryGuid !== s.categoryGuid && !("typeLabel" in patch) ? { typeLabel: null } : {}),
      ...patch,
      version: s.version + 1,
    })),
  reset: () => set((s) => ({ ...DEFAULTS, version: s.version + 1 })),

  activeFilterCount: () => {
    const s = get();
    return (s.categoryGuid ? 1 : 0) + s.brandGuids.length + (s.onlyStock ? 1 : 0) + s.quick.length + (s.typeLabel ? 1 : 0) + (s.sort !== "popularity" ? 1 : 0);
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
