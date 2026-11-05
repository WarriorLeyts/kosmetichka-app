import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import { api } from "./api";
import { useAuth } from "./store/auth";
import { cartQuiet, useCartStore } from "./store/cart";
import type { CartItem } from "./types";

/**
 * One cart for the account on every device (site, phone apps). The cart is saved on the server after
 * each change and read again when the app opens, comes back to the screen, or the customer signs in.
 *
 * - The first time a device meets an account, its own lines and the saved ones are put together
 *   (a line in both keeps the larger quantity) — a cart made before signing in is not lost.
 * - Later, a newer saved cart replaces this device's copy, unless this device has changes of its own
 *   not sent yet: then the two are put together again. So a line removed on one device stays removed.
 */
type Meta = { owner: number | null; syncedAt: string | null; dirty: boolean };
const META_KEY = "kosmetichka-cart-sync";
let meta: Meta = { owner: null, syncedAt: null, dirty: false };
let metaLoaded = false;
let applying = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let busy: Promise<void> | null = null;

async function loadMeta() {
  if (metaLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (raw) meta = { ...meta, ...JSON.parse(raw) };
  } catch {
    /* fresh */
  }
  metaLoaded = true;
}
function saveMeta() {
  AsyncStorage.setItem(META_KEY, JSON.stringify(meta)).catch(() => {});
}

export function mergeCarts(local: CartItem[], saved: CartItem[]): CartItem[] {
  const out = new Map<string, CartItem>();
  for (const l of saved) out.set(l.cartKey, l);
  for (const l of local) {
    const s = out.get(l.cartKey);
    out.set(l.cartKey, s ? { ...s, ...l, quantity: Math.max(s.quantity, l.quantity) } : l);
  }
  return [...out.values()];
}

function apply(items: CartItem[], comment: string) {
  applying = true;
  try {
    useCartStore.setState({ items, comment });
  } finally {
    applying = false;
  }
}

async function push(customerId: number) {
  const { items, comment } = useCartStore.getState();
  const r = await api.cartPut(items, comment);
  if (useAuth.getState().customer?.id !== customerId) return;
  meta = { owner: customerId, syncedAt: r.updatedAt, dirty: false };
  saveMeta();
}

/** read the saved cart and settle it with this device's copy */
export function syncCart(): Promise<void> {
  if (busy) return busy;
  busy = (async () => {
    const customerId = useAuth.getState().customer?.id;
    if (!customerId) return;
    await loadMeta();
    // another tab of the site may have changed it meanwhile (not a change of this device)
    applying = true;
    try {
      await useCartStore.persist.rehydrate();
    } finally {
      applying = false;
    }
    const saved = await api.cartGet();
    if (useAuth.getState().customer?.id !== customerId) return;
    const local = useCartStore.getState();
    if (meta.owner !== customerId) {
      // first time with this account here: keep both
      const items = mergeCarts(local.items, saved.items);
      apply(items, local.comment || saved.comment);
      if (items.length || saved.updatedAt) await push(customerId);
      else { meta = { owner: customerId, syncedAt: null, dirty: false }; saveMeta(); }
      return;
    }
    const newer = !!saved.updatedAt && (!meta.syncedAt || saved.updatedAt > meta.syncedAt);
    if (newer) {
      if (meta.dirty) {
        apply(mergeCarts(local.items, saved.items), local.comment || saved.comment);
        await push(customerId);
      } else {
        apply(saved.items, saved.comment);
        meta = { ...meta, syncedAt: saved.updatedAt };
        saveMeta();
      }
    } else if (meta.dirty) {
      await push(customerId);
    }
  })()
    .catch(() => {
      /* offline: tried again on the next change / return to the app */
    })
    .finally(() => {
      busy = null;
    });
  return busy;
}

let started = false;
/** called once from the root layout */
export function startCartSync() {
  if (started) return;
  started = true;
  // this device changed the cart → send it a moment later (several taps go as one)
  useCartStore.subscribe((s, prev) => {
    if (applying || cartQuiet.n > 0 || (s.items === prev.items && s.comment === prev.comment)) return;
    const customerId = useAuth.getState().customer?.id;
    if (!customerId) return;
    meta = { ...meta, dirty: true };
    saveMeta();
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      if (useAuth.getState().customer?.id !== customerId) return; // signed out meanwhile
      if (busy) void busy.then(() => syncCart());
      else if (meta.owner === customerId) void push(customerId).catch(() => {});
      else void syncCart();
    }, 700);
  });
  // signed in (or another account) → settle at once
  let lastId = useAuth.getState().customer?.id ?? null;
  useAuth.subscribe((s) => {
    const id = s.customer?.id ?? null;
    if (id !== lastId) {
      lastId = id;
      if (id) void syncCart();
    }
  });
  // back to the app / the browser tab → take what the other devices changed
  AppState.addEventListener("change", (st) => {
    if (st === "active") void syncCart();
  });
  if (Platform.OS === "web" && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void syncCart();
    });
  }
  if (lastId) void syncCart();
}
