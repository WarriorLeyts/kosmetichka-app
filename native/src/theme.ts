/**
 * Light / dark palettes. `colors` is a live object: when the user switches the
 * theme, its values are replaced and the app re-mounts (see app/_layout.tsx),
 * so every screen — including styles made with `themed()` — picks up the new colors.
 */
import { Appearance, AppState, StyleSheet } from "react-native";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./store/storage";
import { lazyStyles } from "./lazyStyles";

const light = {
  pink: "#e82c87",
  pinkLight: "#ff6aaa",
  violet: "#8b3dff",
  /** the brand violet of buttons, tabs and chips — the same in both themes; a promo can repaint it (setAccent) */
  brand: "#8b3dff",
  /** brand text on dark violet surfaces (contrast ≥ 5 : 1) */
  brandOnDark: "#b58cff",
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
  brand: "#8b3dff",
  brandOnDark: "#b58cff",
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
let accent: string | null = null;

/** Gradients of the main buttons and the active tab — live like `colors` (a promo repaints them, setAccent) */
const BASE_GRADIENTS = {
  button: ["#8b3dff", "#b832e0", "#e82c87"],
  capsule: ["#c400fb", "#7a05fd", "#5a06f6", "#b80dfc"],
  scene: ["#6a2bf0", "#b62ee6", "#f0388f"],
};
export const brandGradients = {
  button: [...BASE_GRADIENTS.button] as [string, string, string],
  capsule: [...BASE_GRADIENTS.capsule] as [string, string, string, string],
  scene: [...BASE_GRADIENTS.scene] as [string, string, string],
};

/** hex → the same colour mixed with white (t = 0…1) */
function tint(hex: string, t: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function paint(mode: ThemeMode) {
  Object.assign(colors, mode === "dark" ? dark : light);
  for (const k of Object.keys(BASE_GRADIENTS) as (keyof typeof BASE_GRADIENTS)[]) {
    const base = BASE_GRADIENTS[k];
    // the promo colour: light at the edges, deep in the middle — the same shape as the usual ones
    const promo = [tint(accent ?? "#000000", 0.18), accent ?? "", tint(accent ?? "#000000", 0.18), accent ?? ""].slice(0, base.length);
    brandGradients[k].splice(0, base.length, ...(accent ? (k === "button" ? [accent, tint(accent, 0.15), accent] : promo) : base));
  }
  if (accent) {
    colors.brand = accent;
    colors.brandOnDark = tint(accent, 0.35);
    if (mode === "light") {
      colors.violet = accent;
      colors.violetSoft = tint(accent, 0.93);
      colors.violetBorder = tint(accent, 0.85);
    } else {
      colors.violet = tint(accent, 0.3);
    }
  }
  version++;
}

let currentMode: ThemeMode = "light";
export function applyTheme(mode: ThemeMode) {
  currentMode = mode;
  paint(mode);
}

/**
 * Promo colour instead of the brand violet (null — the usual look). Returns whether anything changed;
 * the caller re-mounts the app (see useTheme.accentKey) so every screen picks it up.
 */
export function setAccent(hex: string | null): boolean {
  const next = hex && /^#[0-9a-f]{6}$/i.test(hex) && hex.toLowerCase() !== "#8b3dff" ? hex.toLowerCase() : null;
  if (next === accent) return false;
  accent = next;
  paint(currentMode);
  return true;
}
export const currentAccent = () => accent;

/**
 * StyleSheet that is rebuilt from the current palette after a theme switch.
 * Use exactly like StyleSheet.create: `const styles = themed(() => ({ ... }))`.
 */
export function themed<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(make: () => T & StyleSheet.NamedStyles<any>): T {
  return lazyStyles(() => StyleSheet.create(make()), () => version);
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
