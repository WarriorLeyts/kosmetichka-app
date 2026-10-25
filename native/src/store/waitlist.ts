import { create } from "zustand";
import { api } from "../api";

/** «Лист ожидания» — server-side list of out-of-stock products the customer waits for. */
type WaitState = {
  ids: number[];
  load: () => Promise<void>;
  toggle: (productId: number) => Promise<boolean>;
  remove: (productId: number) => Promise<void>;
  reset: () => void;
};

/** bumped by reset (logout): a list loaded for the previous account is dropped */
let gen = 0;

export const useWaitlistStore = create<WaitState>((set, get) => ({
  ids: [],
  load: async () => {
    const my = gen;
    try {
      const r = await api.wishlist();
      if (my === gen) set({ ids: r?.productIds ?? [] });
    } catch {
      /* not logged in */
    }
  },
  toggle: async (productId) => {
    const { added } = await api.wishlistToggle(productId);
    const ids = get().ids.filter((x) => x !== productId);
    set({ ids: added ? [...ids, productId] : ids });
    return added;
  },
  remove: async (productId) => {
    await api.wishlistRemove(productId);
    set({ ids: get().ids.filter((x) => x !== productId) });
  },
  reset: () => {
    gen++;
    set({ ids: [] });
  },
}));
