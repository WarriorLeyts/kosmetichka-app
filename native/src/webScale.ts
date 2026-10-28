import { Platform } from "react-native";

/**
 * Website on a phone: the page is drawn at this scale (set by the inline script in public/index.html,
 * the layout is 1/scale wider than the screen). 1 everywhere else, including the native apps.
 */
export function webPageScale(): number {
  if (Platform.OS !== "web" || typeof window === "undefined") return 1;
  const k = (window as unknown as { __kosScale?: number }).__kosScale;
  return typeof k === "number" && k > 0 && k < 1 ? k : 1;
}
