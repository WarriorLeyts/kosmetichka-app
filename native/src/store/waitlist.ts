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

export const useWaitlistStore = create<WaitState>((set, get) => ({
  ids: [],
  load: async () => {
    try {
      const r = await api.wishlist();
      set({ ids: r.productIds ?? [] });
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
  reset: () => set({ ids: [] }),
}));
