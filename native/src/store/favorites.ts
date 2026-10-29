import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./storage";
import type { Product } from "../types";

type FavState = {
  items: Product[];
  toggle: (p: Product) => boolean;
  has: (id: number) => boolean;
  remove: (id: number) => void;
  clear: () => void;
  /** today's prices / stock (a favourite added as a guest has no wholesale prices) */
  refreshProducts: (fresh: Map<number, Product>) => void;
};

export const useFavorites = create<FavState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (p) => {
        const exists = get().items.some((i) => i.id === p.id);
        if (exists) {
          set({ items: get().items.filter((i) => i.id !== p.id) });
          return false;
        }
        const slim: Product = {
          id: p.id,
          name: p.name,
          stock: p.stock,
          retailPrice: p.retailPrice,
          discountPrice: p.discountPrice,
          wholesalePrice: p.wholesalePrice,
          bigWholesalePrice: p.bigWholesalePrice,
          minOrderQty: p.minOrderQty,
          images: p.images?.slice(0, 1),
          brand: p.brand ? { name: p.brand.name } : null,
        };
        set({ items: [slim, ...get().items] });
        return true;
      },
      has: (id) => get().items.some((i) => i.id === id),
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      clear: () => set({ items: [] }),
      refreshProducts: (fresh) =>
        set({
          items: get().items.map((i) => {
            const p = fresh.get(i.id);
            return p
              ? { ...i, stock: p.stock, minOrderQty: p.minOrderQty, retailPrice: p.retailPrice, discountPrice: p.discountPrice, wholesalePrice: p.wholesalePrice, bigWholesalePrice: p.bigWholesalePrice }
              : i;
          }),
        }),
    }),
    { name: "kosmetichka-favorites", storage: persistStorage }
  )
);
