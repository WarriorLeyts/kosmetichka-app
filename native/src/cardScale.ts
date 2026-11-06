import { useWindowDimensions } from "react-native";

/**
 * Product cards (catalog grid, cart lines) on a phone are drawn at 0.8 — as the phone website was at
 * page scale 0.8 (the owner's choice: the rest of the screen is full size, the cards were too big).
 * Tablets and computers (window ≥ 600) keep 1.
 */
export const PHONE_CARD_SCALE = 0.8;

export function useCardScale(): number {
  const { width } = useWindowDimensions();
  return width < 600 ? PHONE_CARD_SCALE : 1;
}

const SIZE_KEYS = new Set([
  "fontSize", "lineHeight", "letterSpacing", "width", "height", "minWidth", "minHeight", "maxHeight", "maxWidth",
  "padding", "paddingHorizontal", "paddingVertical", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
  "margin", "marginHorizontal", "marginVertical", "marginTop", "marginBottom", "marginLeft", "marginRight",
  "gap", "rowGap", "columnGap", "borderRadius", "top", "right", "bottom", "left",
]);

/** A copy of a style map with every numeric size × k (percent strings, colours, flex… untouched). */
export function scaleStyles<T extends Record<string, object>>(styles: T, k: number): T {
  if (k === 1) return styles;
  const out: Record<string, object> = {};
  for (const [name, style] of Object.entries(styles)) {
    const s: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(style)) s[key] = typeof v === "number" && SIZE_KEYS.has(key) ? Math.round(v * k * 2) / 2 : v;
    out[name] = s;
  }
  return out as T;
}

/**
 * The scaled phone styles with the text put back on the app's type scale (11 / 13 / 15 / 17 / 20 / 22):
 * the boxes stay at k, the letters are not 9.6 or 11.9 px.
 */
export function withFonts<T extends Record<string, object>>(styles: T, fonts: Partial<Record<keyof T, object>>): T {
  const out: Record<string, object> = { ...styles };
  for (const [name, f] of Object.entries(fonts)) if (f) out[name] = { ...(styles as Record<string, object>)[name], ...f };
  return out as T;
}
