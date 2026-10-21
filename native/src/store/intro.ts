import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./storage";

/** Has the user seen the welcome slides? */
export const useIntro = create<{ seen: boolean; hydrated: boolean; done: () => void }>()(
  persist(
    (set) => ({ seen: false, hydrated: false, done: () => set({ seen: true }) }),
    {
      name: "kosmetichka-intro",
      storage: persistStorage,
      partialize: (s) => ({ seen: s.seen }),
      onRehydrateStorage: () => () => useIntro.setState({ hydrated: true }),
    }
  )
);
