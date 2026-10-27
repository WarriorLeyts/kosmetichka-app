import { create } from "zustand";
import { api } from "../api";

/** Unread count for the bell dot; refreshed on screen focus, on app resume and when a push arrives. */
type NotifState = {
  unread: number;
  /** bumped when a push arrives while the app is open — the open order screen reloads its chat and status at once */
  pushTick: number;
  bump: () => void;
  refresh: () => Promise<void>;
  set: (n: number) => void;
  reset: () => void;
};

let seq = 0;

export const useNotifications = create<NotifState>((set) => ({
  unread: 0,
  pushTick: 0,
  bump: () => set((st) => ({ pushTick: st.pushTick + 1 })),
  refresh: async () => {
    const my = ++seq;
    try {
      const r = await api.notificationsUnread();
      if (my === seq) set({ unread: r.unread });
    } catch {
      /* signed out / site without notifications yet / offline: keep what is shown */
    }
  },
  set: (n) => set({ unread: Math.max(0, n) }),
  reset: () => {
    seq++;
    set({ unread: 0 });
  },
}));
