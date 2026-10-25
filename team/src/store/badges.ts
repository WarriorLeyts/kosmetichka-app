import { create } from "zustand";

/** numbers on the tab bar (e.g. new orders waiting for a manager) */
export const useBadges = create<{ counts: Record<string, number>; set: (tab: string, n: number) => void }>((set) => ({
  counts: {},
  set: (tab, n) => set((s) => ({ counts: { ...s.counts, [tab]: n } })),
}));
