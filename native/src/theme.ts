/**
 * Light / dark palettes. `colors` is a live object: when the user switches the
 * theme, its values are replaced and the app re-mounts (see app/_layout.tsx),
 * so every screen — including styles made with `themed()` — picks up the new colors.
 */
import { StyleSheet } from "react-native";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./store/storage";

const light = {
  pink: "#e82c87",
  pinkLight: "#ff6aaa",
  violet: "#8b3dff",
  blue: "#0036b8",
  bg: "#f6f7fb",
  card: "#ffffff",
  text: "#1f2937",
  muted: "#6b7280",
  faint: "#9ca3af",
  border: "#e8eaf0",
  soft: "#f1f3f9",
  success: "#059669",
  successBg: "#ecfdf5",
  warning: "#b45309",
  warningBg: "#fffbeb",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  // soft tints used for icons, chips, banners
  violetSoft: "#f5f3ff",
  violetBorder: "#ede9fe",
  pinkSoft: "#fdf2f8",
  /** text on the white «card» surfaces (site's slate-800 / slate-700) */
  strong: "#1e293b",
  /** «Мои заказы» page background (site: #fdf2f8 → #f5f3ff → #eff6ff) */
  pageGradient: ["#fdf2f8", "#f5f3ff", "#eff6ff"] as readonly [string, string, ...string[]],
  overlay: "rgba(255,255,255,0.92)",
  statusBar: "dark" as "dark" | "light",
};

type Palette = typeof light;

const dark: Palette = {
  pink: "#ff4fa3",
  pinkLight: "#ff7cbc",
  violet: "#a57aff",
  blue: "#5b7cff",
  bg: "#0f0f17",
  card: "#1a1a26",
  text: "#f1f2f6",
  muted: "#a3a8b8",
  faint: "#6f7487",
  border: "#2a2a3a",
  soft: "#232333",
  success: "#34d399",
  successBg: "#0f2a22",
  warning: "#fbbf24",
  warningBg: "#2b2210",
  danger: "#f87171",
  dangerBg: "#2d1517",
  violetSoft: "#2a2342",
  violetBorder: "#3a2f5c",
  pinkSoft: "#331a2a",
  strong: "#f1f2f6",
  pageGradient: ["#1c1020", "#16122a", "#0f1426"],
  overlay: "rgba(26,26,38,0.92)",
  statusBar: "light",
};

export type ThemeMode = "light" | "dark";

/** Live palette — read it at render time. */
export const colors: Palette = { ...light };

/** Brand gradient (buttons, hero) — the same in both themes. */
export const gradient = ["#e82c87", "#8b3dff", "#0036b8"] as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 };

export const shadow = {
  shadowColor: "#1f2937",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

let version = 0;

export function applyTheme(mode: ThemeMode) {
  Object.assign(colors, mode === "dark" ? dark : light);
  version++;
}

/**
 * StyleSheet that is rebuilt from the current palette after a theme switch.
 * Use exactly like StyleSheet.create: `const styles = themed(() => ({ ... }))`.
 */
export function themed<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(make: () => T & StyleSheet.NamedStyles<any>): T {
  let cache: T | null = null;
  let built = -1;
  return new Proxy({} as T, {
    get(_t, prop) {
      if (!cache || built !== version) {
        cache = StyleSheet.create(make());
        built = version;
      }
      return (cache as any)[prop];
    },
  });
}

type ThemeState = { mode: ThemeMode; toggle: () => void };

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "light",
      toggle: () => {
        const mode: ThemeMode = get().mode === "dark" ? "light" : "dark";
        applyTheme(mode);
        set({ mode });
      },
    }),
    {
      name: "kosmetichka-theme",
      storage: persistStorage,
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.mode);
      },
    }
  )
);
