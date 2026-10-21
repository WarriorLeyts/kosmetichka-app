import { create } from "zustand";
import { api, type CatalogQuery } from "../api";
import type { Brand, Category } from "../types";

export type Sort = NonNullable<CatalogQuery["sort"]>;
export type Quick = "new" | "sale" | "gift";

export const SORT_LABELS: Record<Sort, string> = {
  popularity: "Недавно обновлённые",
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
  /** bumps when filters change, so the list reloads */
  version: number;

  categories: Category[];
  brands: Brand[];
  metaLoaded: boolean;
  loadMeta: () => Promise<void>;

  set: (patch: Partial<Pick<CatalogState, "search" | "categoryGuid" | "brandGuids" | "sort" | "onlyStock" | "quick">>) => void;
  reset: () => void;
  activeFilterCount: () => number;
  /** category + all its descendants, as the site does */
  categoryGuidsFor: (guid: string | null) => string[];
};

const DEFAULTS = { search: "", categoryGuid: null, brandGuids: [], sort: "popularity" as Sort, onlyStock: false, quick: [] as Quick[] };

/** Top-level categories, like the site's sidebar (children of «Каталог», or roots). */
export function topCategories(all: Category[]): Category[] {
  const root = all.find((c) => c.name.toLowerCase() === "каталог");
  return all.filter((c) => c.name.toLowerCase() !== "каталог" && (root ? c.parentGuid === root.guid : !c.parentGuid));
}

export function childCategories(all: Category[], parentGuid: string): Category[] {
  return all.filter((c) => c.parentGuid === parentGuid);
}

export const useCatalog = create<CatalogState>((set, get) => ({
  ...DEFAULTS,
  version: 0,
  categories: [],
  brands: [],
  metaLoaded: false,

  loadMeta: async () => {
    if (get().metaLoaded) return;
    try {
      const { categories, brands } = await api.catalogMeta();
      set({ categories, brands, metaLoaded: true });
    } catch {
      /* filters just stay empty */
    }
  },

  set: (patch) => set((s) => ({ ...patch, version: s.version + 1 })),
  reset: () => set((s) => ({ ...DEFAULTS, version: s.version + 1 })),

  activeFilterCount: () => {
    const s = get();
    return (s.categoryGuid ? 1 : 0) + s.brandGuids.length + (s.onlyStock ? 1 : 0) + s.quick.length + (s.sort !== "popularity" ? 1 : 0);
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
