/**
 * Light / dark palettes. `colors` is a live object: when the user switches the
 * theme, its values are replaced and the app re-mounts (see app/_layout.tsx),
 * so every screen — including styles made with `themed()` — picks up the new colors.
 */
import { StyleSheet } from "react-native";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./store/storage";

/*
 * Design from the mockup: deep plum «luxury» dark theme with hot-pink accents,
 * serif display headings (Cormorant Garamond). The light theme uses the same
 * accents on a warm off-white background.
 */
const light = {
  pink: "#e5157f",
  pinkLight: "#ff5fae",
  violet: "#9b2fd6",
  blue: "#5b2bd9",
  bg: "#fbf6f9",
  card: "#ffffff",
  card2: "#f7eef3",
  text: "#24121c",
  muted: "#7a6370",
  faint: "#a8939f",
  border: "#efdfe8",
  soft: "#f6ecf2",
  success: "#0f9f6e",
  successBg: "#e5f8f0",
  warning: "#b66a00",
  warningBg: "#fff4e0",
  danger: "#d92d4a",
  dangerBg: "#fde9ed",
  violetSoft: "#f6ecf6",
  violetBorder: "#ead3e4",
  pinkSoft: "#fde8f2",
  strong: "#24121c",
  /** accent (buttons, active tabs, prices) */
  accent: "#e5157f",
  accentText: "#ffffff",
  /** hero/banner backdrop */
  heroGradient: ["#3a0f2c", "#7a1450", "#d1137a"] as readonly [string, string, ...string[]],
  pageGradient: ["#fbf6f9", "#f8eef4", "#f4ecf8"] as readonly [string, string, ...string[]],
  glow: "rgba(229,21,127,0.18)",
  overlay: "rgba(255,255,255,0.9)",
  tabBar: "#ffffff",
  statusBar: "dark" as "dark" | "light",
};

type Palette = typeof light;

// Dark palette from the design sources (assets/palette.json + web/style.css)
const dark: Palette = {
  pink: "#ff2ca7",
  pinkLight: "#ff69d2",
  violet: "#8100eb",
  blue: "#6a0b50",
  bg: "#130517",
  card: "#290824",
  card2: "#3b0a32",
  text: "#fff6fd",
  muted: "#cba3c6",
  faint: "#8f6a89",
  border: "#5a2246",
  soft: "#2a0b26",
  success: "#38d39f",
  successBg: "#0f2a20",
  warning: "#ffb547",
  warningBg: "#2e2010",
  danger: "#ff276b",
  dangerBg: "#3a0a22",
  violetSoft: "#3b0a32",
  violetBorder: "#8f1b67",
  pinkSoft: "#4a0c3a",
  strong: "#fff6fd",
  accent: "#ff2ca7",
  accentText: "#ffffff",
  heroGradient: ["#230821", "#6a0b50", "#c0157f"],
  pageGradient: ["#210921", "#130715", "#220621"],
  glow: "rgba(255,44,167,0.3)",
  overlay: "rgba(41,8,36,0.88)",
  tabBar: "#2a0b26",
  statusBar: "light",
};

/** Serif display font for brand name, banners and big titles (loaded in app/_layout.tsx). */
export const fonts = {
  serif: "CormorantGaramond_600SemiBold",
  serifMedium: "CormorantGaramond_500Medium",
  serifBold: "CormorantGaramond_700Bold",
};

export type ThemeMode = "light" | "dark";

/** Live palette — read it at render time. */
export const colors: Palette = { ...dark };

/** Accent gradient for primary buttons — the same in both themes. */
export const gradient = ["#ff2d95", "#e5157f", "#b0106a"] as const;

export const radius = { sm: 10, md: 14, lg: 18, xl: 24 };

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
      mode: "dark",
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
