import { create } from "zustand";
import { api, forgetCalm } from "../api";

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
let lastBump = 0;
let trailing: ReturnType<typeof setTimeout> | null = null;

export const useNotifications = create<NotifState>((set) => ({
  unread: 0,
  pushTick: 0,
  // many hints at once → one reload a second at most (the open screens reload on each tick)
  bump: () => {
    const now = Date.now();
    if (now - lastBump >= 1000) {
      lastBump = now;
      forgetCalm();
      set((st) => ({ pushTick: st.pushTick + 1 }));
    } else if (!trailing) {
      trailing = setTimeout(() => {
        trailing = null;
        lastBump = Date.now();
        forgetCalm();
        set((st) => ({ pushTick: st.pushTick + 1 }));
      }, 1000 - (now - lastBump));
    }
  },
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
