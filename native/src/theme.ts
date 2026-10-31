/**
 * Light / dark palettes. `colors` is a live object: when the user switches the
 * theme, its values are replaced and the app re-mounts (see app/_layout.tsx),
 * so every screen — including styles made with `themed()` — picks up the new colors.
 */
import { Appearance, AppState, StyleSheet } from "react-native";
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
  // plum dark theme (same colours as the dark home header)
  pink: "#EF419A",
  pinkLight: "#FF6FB5",
  violet: "#B57CFF",
  blue: "#7C8CFF",
  bg: "#170D25",
  card: "#2B193D",
  text: "#FAF7FD",
  muted: "#C3AECF",
  faint: "#8E77A6",
  border: "rgba(200,160,255,0.16)",
  soft: "#211032",
  success: "#34d399",
  successBg: "#123027",
  warning: "#fbbf24",
  warningBg: "#33260f",
  danger: "#ff7a8a",
  dangerBg: "#3a1526",
  violetSoft: "#2E1A48",
  violetBorder: "rgba(181,124,255,0.3)",
  pinkSoft: "#3A1934",
  strong: "#FAF7FD",
  pageGradient: ["#2A1030", "#211032", "#170D25"],
  overlay: "rgba(33,16,50,0.92)",
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

/** «Как в телефоне» (default) or a theme the customer picked in the app. */
export type ThemePref = "system" | "light" | "dark";

const systemMode = (): ThemeMode => (Appearance.getColorScheme() === "dark" ? "dark" : "light");
const initialMode: ThemeMode = systemMode();
applyTheme(initialMode);

type ThemeState = {
  pref: ThemePref;
  mode: ThemeMode;
  /** header button: switch to the other theme (becomes the customer's choice) */
  toggle: () => void;
  setPref: (pref: ThemePref) => void;
};

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      pref: "system",
      mode: initialMode,
      toggle: () => {
        const mode: ThemeMode = get().mode === "dark" ? "light" : "dark";
        applyTheme(mode);
        set({ mode, pref: mode });
      },
      setPref: (pref) => {
        const mode = pref === "system" ? systemMode() : pref;
        applyTheme(mode);
        set({ pref, mode });
      },
    }),
    {
      name: "kosmetichka-theme",
      version: 1,
      storage: persistStorage,
      partialize: (s) => ({ pref: s.pref }),
      // v0 saved only the current mode, also when nobody chose it — start following the phone again
      migrate: () => ({ pref: "system" as ThemePref }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const mode = state.pref === "system" ? systemMode() : state.pref;
        applyTheme(mode);
        useTheme.setState({ mode });
      },
    }
  )
);

// The phone switched between light and dark (e.g. automatically at sunset): follow it while the
// customer hasn't picked a theme. A theme switch re-mounts the whole app (app/_layout.tsx), which
// would wipe a half-typed message or form — so while the app is on screen the switch waits until
// the customer leaves the app and comes back.
let pendingSystem: ThemeMode | null = null;
function followSystem(mode: ThemeMode) {
  const st = useTheme.getState();
  if (st.pref !== "system" || mode === st.mode) return;
  applyTheme(mode);
  useTheme.setState({ mode });
}
Appearance.addChangeListener(({ colorScheme }) => {
  const mode: ThemeMode = colorScheme === "dark" ? "dark" : "light";
  if (AppState.currentState === "active") pendingSystem = mode;
  else followSystem(mode);
});
AppState.addEventListener("change", (state) => {
  if (state === "active") return;
  if (!pendingSystem) return;
  const mode = pendingSystem;
  pendingSystem = null;
  followSystem(mode);
});
