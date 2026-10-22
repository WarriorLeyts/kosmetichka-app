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
  repeat: (items: OrderItem[]) => void;
  count: () => number;
  quantityOf: (cartKey: string) => number;
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
        const items = get().items;
        const existing = items.find((i) => i.cartKey === key);
        if (existing) {
          set({ items: items.map((i) => (i.cartKey === key ? { ...i, quantity: i.quantity + step } : i)) });
        } else {
          set({ items: [...items, { ...slim(product), cartKey: key, quantity: Math.max(min, step) }] });
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
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.cartKey !== cartKey) });
          return;
        }
        set({ items: get().items.map((i) => (i.cartKey === cartKey ? { ...i, quantity } : i)) });
      },

      remove: (cartKey) => set({ items: get().items.filter((i) => i.cartKey !== cartKey) }),
      clear: () => set({ items: [] }),

      repeat: (orderItems) => {
        const items = [...get().items];
        for (const it of orderItems) {
          const key = String(it.productId) + (it.variantName ? `_r${it.variantName}` : "");
          const idx = items.findIndex((i) => i.cartKey === key);
          if (idx >= 0) {
            items[idx] = { ...items[idx], quantity: items[idx].quantity + it.quantity };
          } else {
            items.push({
              id: it.productId,
              name: it.productName,
              cartKey: key,
              quantity: it.quantity,
              wholesalePrice: it.price,
              retailPrice: it.price,
              discountPrice: it.price,
              barcode: it.barcode ?? null,
              variantName: it.variantName ?? null,
              variantImageUrl: it.variantImageUrl ?? null,
              images: it.imagePath ? [{ path: it.imagePath }] : [],
            });
          }
        }
        set({ items });
      },

      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
      quantityOf: (cartKey) => get().items.find((i) => i.cartKey === cartKey)?.quantity ?? 0,
    }),
    { name: "kosmetichka-cart", storage: persistStorage, partialize: (s) => ({ items: s.items, comment: s.comment }) }
  )
);
