import { Platform } from "react-native";

/**
 * Browsers allow a permission prompt / install prompt only inside a user gesture. Features that want
 * «the first tap» register here; one capture listener on the page offers each tap to them in order
 * (lower `order` first) and stops at the first that used it — so one tap never opens two prompts.
 */
type Handler = { order: number; run: () => boolean };
const handlers = new Set<Handler>();
let installed = false;

function onGesture() {
  for (const h of [...handlers].sort((a, b) => a.order - b.order)) {
    try {
      if (h.run()) return;
    } catch {
      /* next one */
    }
  }
}

/** `run` returns true when it used this tap. Returns the unsubscribe function. */
export function onUserGesture(order: number, run: () => boolean): () => void {
  if (Platform.OS !== "web" || typeof document === "undefined") return () => {};
  if (!installed) {
    installed = true;
    // `click` carries user activation in every browser (touchend alone doesn't in Firefox)
    document.addEventListener("click", onGesture, { capture: true });
  }
  const h = { order, run };
  handlers.add(h);
  return () => {
    handlers.delete(h);
  };
}

/** iPhone / iPad (iPadOS reports itself as a Mac with touch) */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const n = navigator as Navigator & { maxTouchPoints?: number };
  return /iP(hone|ad|od)/.test(n.userAgent) || (n.platform === "MacIntel" && (n.maxTouchPoints ?? 0) > 1);
}

/** opened from the home screen (no browser bars) */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const n = navigator as Navigator & { standalone?: boolean };
  return n.standalone === true || !!window.matchMedia?.("(display-mode: standalone)").matches;
}

/** small localStorage helpers that never throw (private mode, blocked storage) */
export function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
