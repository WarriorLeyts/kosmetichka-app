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

export const PRICE_LABELS: Record<string, string> = { retail: "Розница", discount: "Скидка", wholesale: "Опт", big_wholesale: "Кр. опт" };
