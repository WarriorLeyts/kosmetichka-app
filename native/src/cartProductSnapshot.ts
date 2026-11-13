import { cleanPromoSnapshot } from "./pricing";
import type { Product } from "./types";

/** Keep every price needed to reprice and expire a persisted cart. */
export function cartProductSnapshot(p: Product): Product {
  const metadata = cleanPromoSnapshot(p) as Pick<Product, "regularPrices" | "promoRetailPrice" | "promoWholesalePrice" | "promoBigWholesalePrice">;
  return { id:p.id, name:p.name, barcode:p.barcode, article:p.article, stock:p.stock, minOrderQty:p.minOrderQty,
    retailPrice:p.retailPrice, discountPrice:p.discountPrice, wholesalePrice:p.wholesalePrice,
    bigWholesalePrice:p.bigWholesalePrice, ...metadata,
    images:p.images?.slice(0,1), brand:p.brand ? { name:p.brand.name } : null };
}

/** Guest responses omit wholesale fields; explicit null promotions withdraw an old offer. */
export function mergeCartProductPrices(fresh: Product, known: Product): Product {
  const keep = (k: "retailPrice" | "discountPrice" | "wholesalePrice" | "bigWholesalePrice") =>
    Number(fresh[k] ?? 0) > 0 ? fresh[k] : known[k];
  return { ...known, ...fresh, retailPrice:keep("retailPrice"), discountPrice:keep("discountPrice"),
    wholesalePrice:keep("wholesalePrice"), bigWholesalePrice:keep("bigWholesalePrice"),
    ...(known.regularPrices || fresh.regularPrices ? { regularPrices:{...known.regularPrices,...fresh.regularPrices} } : {}) };
}
