import { Platform } from "react-native";
import { reportError } from "./crash";

/**
 * A screen that mounts / loads again and again (a loop somewhere) is reported once to «Ошибки приложений»
 * with what the page looked like, so the cause can be found. Costs nothing in normal use.
 */
const hits = new Map<string, number[]>();
const told = new Set<string>();

export function stormWatch(what: string, info: () => Record<string, unknown>) {
  const now = Date.now();
  const list = (hits.get(what) ?? []).filter((t) => now - t < 3000);
  list.push(now);
  hits.set(what, list);
  if (list.length < 15 || told.has(what)) return;
  told.add(what);
  let extra: Record<string, unknown> = {};
  try {
    extra = info();
    if (Platform.OS === "web" && typeof window !== "undefined") {
      extra = { ...extra, url: location.pathname + location.search, w: window.innerWidth, h: window.innerHeight, vis: document.visibilityState, standalone: matchMedia?.("(display-mode: standalone)").matches };
    }
  } catch {
    /* best effort */
  }
  reportError(new Error(`storm: ${what} ×${list.length}/3s ${JSON.stringify(extra).slice(0, 600)}`), false);
}
