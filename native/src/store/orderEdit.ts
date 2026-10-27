import { create } from "zustand";
import type { Product } from "../types";

/** A product the customer picked on «Добавить товары» while changing an order (not saved yet). */
export type AddedLine = {
  key: string; // product id + variant
  product: Product;
  quantity: number;
  variantName: string | null;
  variantImageUrl: string | null;
};

/** «nothing added» — one shared empty list, so store selectors return the same value every render */
export const NO_LINES: AddedLine[] = [];

/**
 * The order being changed: products added on the «Добавить товары» screen wait here until the
 * customer taps «Сохранить» on the order (then they go to PUT /api/orders/:id/items).
 */
type OrderEditState = {
  orderId: number | null;
  added: AddedLine[];
  start: (orderId: number) => void;
  add: (orderId: number, product: Product, quantity: number, variant?: { name: string; imageUrl: string } | null) => void;
  setQty: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

export const useOrderEdit = create<OrderEditState>((set, get) => ({
  orderId: null,
  added: [],
  start: (orderId) => set(get().orderId === orderId ? {} : { orderId, added: [] }),
  add: (orderId, product, quantity, variant) => {
    const s = get();
    const list = s.orderId === orderId ? s.added : [];
    const key = `${product.id}:${variant?.name ?? ""}`;
    const has = list.find((l) => l.key === key);
    set({
      orderId,
      added: has
        ? list.map((l) => (l.key === key ? { ...l, quantity: l.quantity + quantity } : l))
        : [...list, { key, product, quantity, variantName: variant?.name ?? null, variantImageUrl: variant?.imageUrl ?? null }],
    });
  },
  setQty: (key, quantity) => set({ added: get().added.map((l) => (l.key === key ? { ...l, quantity } : l)) }),
  remove: (key) => set({ added: get().added.filter((l) => l.key !== key) }),
  clear: () => set({ orderId: null, added: [] }),
}));
