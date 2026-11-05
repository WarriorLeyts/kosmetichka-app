import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import { api } from "./api";
import { useAuth } from "./store/auth";
import { favQuiet, useFavorites } from "./store/favorites";
import type { Product } from "./types";

/**
 * One list of favourites for the account on every device (site, phone apps) — the same rules as the
 * cart (src/cartSync.ts): saved on the server after each change, read again when the app opens, comes
 * back to the screen, or the customer signs in.
 *
 * - The first time a device meets an account, its own favourites and the saved ones are put together.
 * - Later, a newer saved list replaces this device's copy, unless this device has changes of its own
 *   not sent yet: then the two are put together again. So a product removed on one device stays removed.
 */
type Meta = { owner: number | null; syncedAt: string | null; dirty: boolean };
const META_KEY = "kosmetichka-favorites-sync";
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

/** this device's favourites first, then the saved ones it doesn't have */
export function mergeFavorites(local: Product[], saved: Product[]): Product[] {
  const have = new Set(local.map((p) => p.id));
  return [...local, ...saved.filter((p) => p && !have.has(p.id))];
}

function apply(items: Product[]) {
  applying = true;
  try {
    useFavorites.setState({ items });
  } finally {
    applying = false;
  }
}

async function push(customerId: number) {
  const r = await api.favoritesPut(useFavorites.getState().items);
  if (useAuth.getState().customer?.id !== customerId) return;
  meta = { owner: customerId, syncedAt: r.updatedAt, dirty: false };
  saveMeta();
}

/** read the saved favourites and settle them with this device's copy */
export function syncFavorites(): Promise<void> {
  if (busy) return busy;
  busy = (async () => {
    const customerId = useAuth.getState().customer?.id;
    if (!customerId) return;
    await loadMeta();
    // another tab of the site may have changed them meanwhile (not a change of this device)
    applying = true;
    try {
      await useFavorites.persist.rehydrate();
    } finally {
      applying = false;
    }
    const saved = await api.favoritesGet();
    if (useAuth.getState().customer?.id !== customerId) return;
    const savedItems = Array.isArray(saved.items) ? saved.items : [];
    const local = useFavorites.getState().items;
    if (meta.owner !== customerId) {
      // first time with this account here: keep both
      const items = mergeFavorites(local, savedItems);
      apply(items);
      if (items.length || saved.updatedAt) await push(customerId);
      else {
        meta = { owner: customerId, syncedAt: null, dirty: false };
        saveMeta();
      }
      return;
    }
    const newer = !!saved.updatedAt && (!meta.syncedAt || saved.updatedAt > meta.syncedAt);
    if (newer) {
      if (meta.dirty) {
        apply(mergeFavorites(local, savedItems));
        await push(customerId);
      } else {
        apply(savedItems);
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

/** what the customer can change: which products (fresh prices / stock don't count) */
const sig = (items: Product[]) => items.map((i) => i.id).join(",");

let started = false;
/** called once from the root layout */
export function startFavoritesSync() {
  if (started) return;
  started = true;
  useFavorites.subscribe((s, prev) => {
    if (applying || favQuiet.n > 0 || s.items === prev.items) return;
    if (sig(s.items) === sig(prev.items)) return;
    const customerId = useAuth.getState().customer?.id;
    if (!customerId) return;
    meta = { ...meta, dirty: true };
    saveMeta();
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      if (useAuth.getState().customer?.id !== customerId) return; // signed out meanwhile
      if (busy) void busy.then(() => syncFavorites());
      else if (meta.owner === customerId) void push(customerId).catch(() => {});
      else void syncFavorites();
    }, 700);
  });
  let lastId = useAuth.getState().customer?.id ?? null;
  useAuth.subscribe((s) => {
    const id = s.customer?.id ?? null;
    if (id !== lastId) {
      lastId = id;
      if (id) void syncFavorites();
      else {
        // signed out: this device's copy is cleared, the saved one stays — the next sign-in
        // (same account or another) takes the saved one again and adds what is here then
        if (pushTimer) clearTimeout(pushTimer);
        pushTimer = null;
        meta = { owner: null, syncedAt: null, dirty: false };
        saveMeta();
      }
    }
  });
  AppState.addEventListener("change", (st) => {
    if (st === "active") void syncFavorites();
  });
  if (Platform.OS === "web" && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void syncFavorites();
    });
  }
  if (lastId) void syncFavorites();
}
