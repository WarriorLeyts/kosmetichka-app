import { create } from "zustand";
import { api } from "../api";

/** «Лист ожидания» — server-side list of out-of-stock products the customer waits for. */
type WaitState = {
  ids: number[];
  missingCount: number;
  quantities: Record<number, number>;
  save: (productId: number, quantity: number) => Promise<void>;
  load: () => Promise<void>;
  toggle: (productId: number) => Promise<boolean>;
  remove: (productId: number) => Promise<void>;
  reset: () => void;
};

/** bumped by reset (logout): a list loaded for the previous account is dropped */
let gen = 0;

export const useWaitlistStore = create<WaitState>((set, get) => ({
  ids: [],
  missingCount: 0,
  quantities: {},
  load: async () => {
    const my = gen;
    try {
      const r = await api.wishlist();
      if (my === gen) set({ ids: r?.productIds ?? [], missingCount: r.missingCount ?? 0, quantities: Object.fromEntries((r.products ?? []).filter(p => p.quantity != null).map(p => [p.id, p.quantity!])) });
    } catch {
      /* not logged in */
    }
  },
  toggle: async (productId) => {
    const my = gen;
    const { added } = await api.wishlistToggle(productId);
    if (my !== gen) return added;
    const ids = get().ids.filter((x) => x !== productId);
    set({ ids: added ? [...ids, productId] : ids });
    return added;
  },
  save: async (productId, quantity) => {
    const my = gen;
    await api.wishlistSave(productId, quantity);
    if (my === gen) set({ ids: [...get().ids.filter(id => id !== productId), productId], quantities: { ...get().quantities, [productId]: quantity } });
  },
  remove: async (productId) => {
    const my = gen;
    await api.wishlistRemove(productId);
    if (my !== gen) return;
    set({ ids: get().ids.filter((x) => x !== productId) });
  },
  reset: () => {
    gen++;
    set({ ids: [], missingCount: 0, quantities: {} });
  },
}));
