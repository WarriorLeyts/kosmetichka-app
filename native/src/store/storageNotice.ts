import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { create } from "zustand";

// Acknowledges an informational notice. This is not analytics or advertising consent.
export const STORAGE_NOTICE_KEY = "kosmetichka-storage-notice-v1";
let hydration: Promise<void> | null = null;

export const useStorageNotice = create<{
  status: "loading" | "visible" | "dismissed";
  hydrate: () => Promise<void>;
  dismiss: () => void;
}>((set, get) => ({
  status: "loading",
  hydrate: () => {
    if (get().status !== "loading") return Promise.resolve();
    if (hydration) return hydration;
    hydration = (async () => {
      const [current, legacy] = await Promise.all([
        AsyncStorage.getItem(STORAGE_NOTICE_KEY).catch(() => null),
        Platform.OS === "web" ? AsyncStorage.getItem("cookie_consent").catch(() => null) : Promise.resolve(null),
      ]);
      if (get().status !== "loading") return;
      set({ status: current === "1" || legacy === "1" ? "dismissed" : "visible" });
    })();
    return hydration;
  },
  dismiss: () => {
    set({ status: "dismissed" });
    // Unavailable storage must not block shopping or make the notice reappear during this session.
    void AsyncStorage.setItem(STORAGE_NOTICE_KEY, "1").catch(() => {});
    // The existing document pages use this acknowledgement flag for their own notice.
    if (Platform.OS === "web") void AsyncStorage.setItem("cookie_consent", "1").catch(() => {});
  },
}));
