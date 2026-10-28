import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./storage";
import type { CartItem, OrderItem, Product, Variant } from "../types";

type CartState = {
  items: CartItem[];
  /** «Комментарий к заказу» — kept while the cart changes, cleared after checkout */
  comment: string;
  setComment: (comment: string) => void;
  add: (product: Product, quantity?: number) => void;
  addVariants: (product: Product, entries: { variant: Variant; quantity: number }[]) => void;
  setQuantity: (cartKey: string, quantity: number) => void;
  remove: (cartKey: string) => void;
  clear: () => void;
  /** Repeat an order with the products' current data (prices, stock); returns names that were skipped. */
  repeat: (items: OrderItem[], fresh: Map<number, Product>, variantIds?: Map<string, Variant>) => string[];
  count: () => number;
  quantityOf: (cartKey: string) => number;
  /** Today's prices / stock for the products in the cart (e.g. added before signing in, when the site
   * showed only retail prices) — lines keep their quantity and variant. */
  refreshProducts: (fresh: Map<number, Product>) => void;
};

/** Keep only what the cart needs — product objects from the API can be large. */
function slim(p: Product): Product {
  return {
    id: p.id,
    name: p.name,
    barcode: p.barcode,
    article: p.article,
    stock: p.stock,
    minOrderQty: p.minOrderQty,
    retailPrice: p.retailPrice,
    discountPrice: p.discountPrice,
    wholesalePrice: p.wholesalePrice,
    bigWholesalePrice: p.bigWholesalePrice,
    images: p.images?.slice(0, 1),
    brand: p.brand ? { name: p.brand.name } : null,
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      comment: "",
      setComment: (comment) => set({ comment }),

      add: (product, quantity) => {
        const key = String(product.id);
        const min = Math.max(1, product.minOrderQty ?? 1);
        const step = quantity ?? min;
        const cap = typeof product.stock === "number" && product.stock > 0 ? product.stock : Infinity;
        const items = get().items;
        const existing = items.find((i) => i.cartKey === key);
        if (existing) {
          // refresh prices/stock from the latest product data, never above the stock
          set({ items: items.map((i) => (i.cartKey === key ? { ...i, ...slim(product), quantity: Math.min(cap, i.quantity + step) } : i)) });
        } else {
          set({ items: [...items, { ...slim(product), cartKey: key, quantity: Math.min(cap, Math.max(min, step)) }] });
        }
      },

      addVariants: (product, entries) => {
        const items = [...get().items];
        for (const { variant, quantity } of entries) {
          if (quantity <= 0) continue;
          const key = `${product.id}_v${variant.id}`;
          const idx = items.findIndex((i) => i.cartKey === key);
          if (idx >= 0) items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity };
          else
            items.push({
              ...slim(product),
              cartKey: key,
              quantity,
              variantId: variant.id,
              variantName: variant.name,
              variantImageUrl: variant.imageUrl,
            });
        }
        set({ items });
      },

      setQuantity: (cartKey, quantity) => {
        if (!Number.isFinite(quantity)) return;
        quantity = Math.floor(quantity);
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.cartKey !== cartKey) });
          return;
        }
        set({ items: get().items.map((i) => (i.cartKey === cartKey ? { ...i, quantity } : i)) });
      },

      remove: (cartKey) => set({ items: get().items.filter((i) => i.cartKey !== cartKey) }),
      refreshProducts: (fresh) =>
        set({
          items: get().items.map((i) => {
            const p = fresh.get(i.id);
            return p ? { ...i, ...slim(p), cartKey: i.cartKey, quantity: i.quantity } : i;
          }),
        }),
      clear: () => set({ items: [] }),

      repeat: (orderItems, fresh, variantIds) => {
        const items = [...get().items];
        const skipped: string[] = [];
        for (const it of orderItems) {
          const p = fresh.get(it.productId);
          // product removed or out of stock — can't be ordered again
          if (!p || (typeof p.stock === "number" && p.stock <= 0)) {
            skipped.push(it.productName + (it.variantName ? ` (${it.variantName})` : ""));
            continue;
          }
          const v = it.variantName ? variantIds?.get(`${it.productId}|${it.variantName}`) : undefined;
          // same keys as when adding from the product screen, so lines merge instead of duplicating
          const key = it.variantName ? (v ? `${it.productId}_v${v.id}` : `${it.productId}_r${it.variantName}`) : String(it.productId);
          const cap = typeof p.stock === "number" && p.stock > 0 ? p.stock : Infinity;
          const min = Math.max(1, p.minOrderQty ?? 1);
          const idx = items.findIndex((i) => i.cartKey === key);
          if (idx >= 0) {
            items[idx] = { ...items[idx], ...slim(p), quantity: Math.min(cap, items[idx].quantity + it.quantity) };
          } else {
            items.push({
              ...slim(p),
              cartKey: key,
              quantity: Math.min(cap, Math.max(min, it.quantity)),
              variantId: v?.id,
              variantName: it.variantName ?? null,
              variantImageUrl: v?.imageUrl ?? it.variantImageUrl ?? null,
            });
          }
        }
        set({ items });
        return skipped;
      },

      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
      quantityOf: (cartKey) => get().items.find((i) => i.cartKey === cartKey)?.quantity ?? 0,
    }),
    {
      name: "kosmetichka-cart",
      storage: persistStorage,
      partialize: (s) => ({ items: s.items, comment: s.comment }),
      // saved data from an older version / a broken write: keep only lines that can be ordered
      merge: (saved, current) => {
        const p = (saved ?? {}) as Partial<CartState>;
        const items = Array.isArray(p.items)
          ? p.items.filter((i) => i && typeof i.id === "number" && typeof i.cartKey === "string" && Number.isInteger(i.quantity) && i.quantity > 0)
          : current.items;
        return { ...current, items, comment: typeof p.comment === "string" ? p.comment : current.comment };
      },
    }
  )
);
