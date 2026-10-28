import { get } from "./api";

export type Category = { id: number; guid: string; name: string; parentGuid: string | null };
export type ProductRow = {
  id: number;
  name: string;
  barcode: string | null;
  article: string | null;
  stock: number | null;
  price: number;
  prices: { priceType: string; price: number }[];
  imagePath: string | null;
  hasVariants: boolean;
};

let catCache: Category[] | null = null;
export async function categories(): Promise<Category[]> {
  if (catCache) return catCache;
  const r = await get<{ categories: Category[] }>("/api/admin/categories");
  catCache = r.categories;
  return catCache;
}

/** the admin catalog search (name / article / barcode, category incl. sub-categories) */
export async function searchProducts(q: string, categoryGuid: string, offset: number, limit = 40) {
  const p = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (q.trim().length >= 2) p.set("q", q.trim());
  if (categoryGuid) p.set("categoryGuid", categoryGuid);
  const r = await get<{ products: ProductRow[]; hasMore: boolean }>(`/api/admin/products/search?${p}`);
  return { items: r.products, hasMore: r.hasMore };
}

export const PRICE_LABELS: Record<string, string> = { retail: "Розница", discount: "Скидка по карте", wholesale: "Опт", big_wholesale: "Кр. опт" };

/** the four price types in the order the shop uses them */
export const PRICE_TYPES = ["retail", "discount", "wholesale", "big_wholesale"] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

/**
 * Price of a product for a price type, with the same fallbacks as the site (lib/pricing priceFor):
 * крупный опт → опт → розница, опт → розница, скидка по карте → розница. 0 — no price.
 */
export function priceOf(prices: { priceType: string; price: number }[] | undefined, type: string | null | undefined): number {
  const pm: Record<string, number> = {};
  for (const x of prices ?? []) pm[x.priceType] = Number(x.price);
  const pick = (...v: (number | undefined)[]) => v.find((n) => typeof n === "number" && Number.isFinite(n) && n > 0) ?? 0;
  if (type === "retail") return pick(pm.retail);
  if (type === "big_wholesale") return pick(pm.big_wholesale, pm.wholesale, pm.retail);
  if (type === "wholesale") return pick(pm.wholesale, pm.retail);
  return pick(pm.discount, pm.retail);
}
