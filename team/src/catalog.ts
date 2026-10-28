/**
 * The customer catalog (GET /api/catalog/products + /api/mobile/catalog-meta) for staff:
 * the «Товары» tab and the product picker show the same grid, filters and categories as the customer app.
 * The staff cookie is sent with every request, so the server returns real prices.
 */
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { request } from "./api";
import { priceOf, type ProductRow } from "./products";
import { SUB_FILTERS } from "./subFilters";

export type CatalogProduct = {
  id: number;
  guid?: string;
  name: string;
  barcode?: string | null;
  article?: string | null;
  stock?: number | null;
  minOrderQty?: number | null;
  retailPrice?: number | null;
  discountPrice?: number | null;
  wholesalePrice?: number | null;
  bigWholesalePrice?: number | null;
  prices?: { priceType: string; price: number }[];
  images?: { path: string }[];
  category?: { guid: string; name: string } | null;
  brand?: { guid?: string; name: string } | null;
};
export type MetaCategory = { id?: number; guid: string; name: string; parentGuid?: string | null; sortOrder?: number };
export type Brand = { id?: number; guid: string; name: string };

export type Sort = "popularity" | "price_asc" | "price_desc" | "name";
export type Quick = "new" | "sale" | "gift";

export type CatalogQuery = {
  page?: number;
  search?: string;
  categoryGuids?: string[];
  brandGuids?: string[];
  sort?: Sort;
  onlyStock?: boolean;
  quick?: Quick[];
  /** product type inside a subcategory: the name contains any of these fragments */
  nameAny?: string[];
};
export type CatalogPage = { products: CatalogProduct[]; total: number; page: number; hasMore: boolean; nameAnyApplied?: boolean };

export function fetchCatalog(q: CatalogQuery): Promise<CatalogPage> {
  const p = new URLSearchParams();
  p.set("page", String(q.page ?? 1));
  if (q.search) p.set("search", q.search);
  q.categoryGuids?.forEach((g) => p.append("categoryGuid", g));
  q.brandGuids?.forEach((g) => p.append("brandGuid", g));
  if (q.sort) p.set("sort", q.sort);
  if (q.onlyStock) p.set("onlyStock", "true");
  q.quick?.forEach((x) => p.append("quick", x));
  q.nameAny?.forEach((x) => p.append("nameAny", x));
  p.set("lite", "1");
  return request(`/api/catalog/products?${p.toString()}`);
}

export const SORT_LABELS: Record<Sort, string> = {
  popularity: "Популярные",
  price_asc: "Сначала дешевле",
  price_desc: "Сначала дороже",
  name: "По названию",
};

/** price list of a catalog product: the price fields first, then `prices[]` for the missing ones */
export function pricesOf(p: CatalogProduct): { priceType: string; price: number }[] {
  const out: { priceType: string; price: number }[] = [];
  const add = (t: string, v: number | null | undefined) => {
    const n = Number(v ?? 0);
    if (Number.isFinite(n) && n > 0 && !out.some((x) => x.priceType === t)) out.push({ priceType: t, price: n });
  };
  add("retail", p.retailPrice);
  add("discount", p.discountPrice);
  add("wholesale", p.wholesalePrice);
  add("big_wholesale", p.bigWholesalePrice);
  for (const x of p.prices ?? []) if (x && typeof x.priceType === "string") add(x.priceType, x.price);
  return out;
}

/** a catalog product in the admin row shape (what the order editor / chat card expect) */
export function toRow(p: CatalogProduct): ProductRow {
  const prices = pricesOf(p);
  return {
    id: p.id,
    name: p.name,
    barcode: p.barcode ?? null,
    article: p.article ?? null,
    stock: p.stock ?? null,
    price: priceOf(prices, "retail"),
    prices,
    imagePath: p.images?.[0]?.path ?? null,
    hasVariants: true, // unknown here — the picker asks the server
  };
}

// ── categories + brands (shared by every catalog view) ──

const META_KEY = "team-catalog-meta";
let metaLoading: Promise<void> | null = null;

type MetaState = { categories: MetaCategory[]; brands: Brand[]; loaded: boolean; load: () => Promise<void> };

export const useCatalogMeta = create<MetaState>((set, get) => ({
  categories: [],
  brands: [],
  loaded: false,
  // shown at once from the saved copy, refreshed from the server in the background
  load: async () => {
    if (metaLoading) return metaLoading;
    metaLoading = (async () => {
      let fresh = false;
      if (!get().loaded) {
        try {
          const raw = await AsyncStorage.getItem(META_KEY);
          if (raw) {
            const cached = JSON.parse(raw) as { at: number; categories: MetaCategory[]; brands: Brand[] };
            if (Array.isArray(cached.categories) && Array.isArray(cached.brands)) {
              set({ categories: cached.categories, brands: cached.brands, loaded: true });
              fresh = Date.now() - cached.at < 10 * 60_000;
            }
          }
        } catch {
          /* no saved copy */
        }
      } else fresh = true;
      if (fresh) return;
      try {
        const { categories, brands } = await request<{ categories: MetaCategory[]; brands: Brand[] }>("/api/mobile/catalog-meta");
        set({ categories, brands, loaded: true });
        AsyncStorage.setItem(META_KEY, JSON.stringify({ at: Date.now(), categories, brands })).catch(() => {});
      } catch {
        /* filters stay empty (or on the saved copy) */
      }
    })().finally(() => {
      metaLoading = null;
    });
    return metaLoading;
  },
}));

/** category + all its descendants, as the site does */
export function categoryGuidsFor(guid: string | null): string[] {
  if (!guid) return [];
  const all = useCatalogMeta.getState().categories;
  const out = [guid];
  const walk = (g: string) => {
    for (const c of all)
      if (c.parentGuid === g && !out.includes(c.guid)) {
        out.push(c.guid);
        walk(c.guid);
      }
  };
  walk(guid);
  return out;
}

// ── filter state (one store per view: the tab and the picker keep their own filters) ──

export type CatalogFilters = {
  search: string;
  categoryGuid: string | null;
  brandGuids: string[];
  sort: Sort;
  onlyStock: boolean;
  quick: Quick[];
  /** product-type chip inside a subcategory (label from SUB_FILTERS) */
  typeLabel: string | null;
};

type CatalogState = CatalogFilters & {
  /** bumps when filters change, so the list reloads */
  version: number;
  set: (patch: Partial<CatalogFilters>) => void;
  reset: () => void;
};

const DEFAULTS: CatalogFilters = { search: "", categoryGuid: null, brandGuids: [], sort: "popularity", onlyStock: false, quick: [], typeLabel: null };

export function createCatalogStore() {
  return create<CatalogState>((set) => ({
    ...DEFAULTS,
    version: 0,
    // another category → its type chips no longer apply
    set: (patch) =>
      set((s) => ({
        ...("categoryGuid" in patch && patch.categoryGuid !== s.categoryGuid && !("typeLabel" in patch) ? { typeLabel: null } : {}),
        ...patch,
        version: s.version + 1,
      })),
    reset: () => set((s) => ({ ...DEFAULTS, version: s.version + 1 })),
  }));
}
export type CatalogStore = ReturnType<typeof createCatalogStore>;

/** filters chosen besides sorting (the badge on the filters button) */
export function filterCount(s: CatalogFilters): number {
  return (s.categoryGuid ? 1 : 0) + s.brandGuids.length + (s.onlyStock ? 1 : 0) + s.quick.length + (s.typeLabel ? 1 : 0);
}

/** the query for the current filters */
export function queryOf(s: CatalogFilters, page: number): CatalogQuery & { typeQ?: string[] } {
  const type = s.categoryGuid && s.typeLabel ? SUB_FILTERS[s.categoryGuid]?.find((x) => x.label === s.typeLabel) : undefined;
  return {
    page,
    search: s.search || undefined,
    categoryGuids: categoryGuidsFor(s.categoryGuid),
    brandGuids: s.brandGuids,
    sort: s.sort,
    onlyStock: s.onlyStock,
    quick: s.quick,
    nameAny: type?.q,
    typeQ: type?.q,
  };
}

/** «Товары» tab and the product picker */
export const useTabCatalog = createCatalogStore();
export const usePickerCatalog = createCatalogStore();
