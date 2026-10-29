import { create } from "zustand";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, ApiError } from "../api";
import type { Customer } from "../types";
import { useCartStore } from "./cart";
import { useFavorites } from "./favorites";
import { useWaitlistStore } from "./waitlist";
import { clearOrderStatus } from "../unread";
import { orderCache } from "../orderCache";
import { unregisterPush } from "../push";
import { useNotifications } from "./notifications";

/** id of the account the local data (cart, comment, favourites) belongs to */
const OWNER_KEY = "kosmetichka-owner";
/** set when «Выйти» could not reach the server: the login cookie is still in the phone's cookie store */
const LOGOUT_PENDING_KEY = "kosmetichka-logout-pending";

/** Everything kept on the phone for the signed-in account. */
function clearLocalAccountData() {
  useCartStore.getState().clear();
  useCartStore.getState().setComment("");
  useFavorites.getState().clear();
  useWaitlistStore.getState().reset();
  orderCache.clear();
  clearOrderStatus();
}

/**
 * Another account signed in on this phone (e.g. the session expired and someone else logged in):
 * the previous account's cart, comment and favourites must not show up. A guest cart is kept.
 */
async function claimLocalData(customerId: number) {
  try {
    const owner = await AsyncStorage.getItem(OWNER_KEY);
    if (owner && owner !== String(customerId)) clearLocalAccountData();
    if (owner !== String(customerId)) await AsyncStorage.setItem(OWNER_KEY, String(customerId));
  } catch {
    /* storage unavailable — nothing to compare with */
  }
}

/** Registration with auto-login has just set a fresh cookie: an older unfinished logout no longer applies. */
export async function clearPendingLogout() {
  await AsyncStorage.removeItem(LOGOUT_PENDING_KEY).catch(() => {});
}

/** The last signed-in customer: the app opens with it at once, the server check runs in the background. */
const CUSTOMER_KEY = "kosmetichka-customer";
function saveCustomer(c: Customer | null) {
  (c ? AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(c)) : AsyncStorage.removeItem(CUSTOMER_KEY)).catch(() => {});
}
let started = false;

/** Bumped by every login / logout: an older /api/auth/me answer must not overwrite a newer state. */
let epoch = 0;

type AuthState = {
  customer: Customer | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /** the account's data again (price type, address…) — e.g. a manager changed it on the site */
  reloadCustomer: () => Promise<void>;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setCustomer: (c: Customer | null) => void;
};

/** Same as the site's normalizePhone: phones are stored as 8XXXXXXXXXX, emails in lower case. */
function normalizeLogin(v: string) {
  const t = v.trim();
  if (t.includes("@")) return t.toLowerCase();
  const d = t.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("7")) return "8" + d.slice(1);
  if (d.length === 10) return "8" + d;
  return d || t;
}

/** /api/auth/me has no company name etc. — take the full profile when possible. */
async function full(c: Customer): Promise<Customer> {
  try {
    const { customer } = await api.profile();
    return { ...c, ...customer };
  } catch {
    return c;
  }
}

/** me + profile in parallel (one round trip instead of two). */
async function whoAmI(): Promise<Customer | null> {
  const [me, profile] = await Promise.all([api.me(), api.profile().catch(() => null)]);
  if (!me.customer) return null;
  return profile?.customer ? { ...me.customer, ...profile.customer } : me.customer;
}

let retrying = false;
function retryWhenActive() {
  if (retrying) return;
  retrying = true;
  const sub = AppState.addEventListener("change", (st) => {
    if (st !== "active") return;
    sub.remove();
    retrying = false;
    useAuth.getState().refresh();
  });
  // also retry a bit later while the app stays open
  setTimeout(() => {
    if (!retrying) return;
    sub.remove();
    retrying = false;
    useAuth.getState().refresh();
  }, 15000);
}

export const useAuth = create<AuthState>((set, get) => ({
  customer: null,
  loading: true,

  refresh: async () => {
    const my = epoch;
    try {
      const pendingLogout = (await AsyncStorage.getItem(LOGOUT_PENDING_KEY).catch(() => null)) === "1";
      // first start: show the app right away with the last known account (no waiting on the network)
      if (!started) {
        started = true;
        const raw = pendingLogout ? null : await AsyncStorage.getItem(CUSTOMER_KEY).catch(() => null);
        let cached: Customer | null = null;
        try {
          cached = raw ? (JSON.parse(raw) as Customer) : null;
        } catch {
          cached = null;
        }
        if (my === epoch) set({ customer: cached, loading: false });
      }
      // a logout that couldn't reach the server earlier: finish it before trusting the cookie
      if (pendingLogout) {
        await api.logout();
        await AsyncStorage.removeItem(LOGOUT_PENDING_KEY).catch(() => {});
      }
      const value = await whoAmI();
      if (my !== epoch) return; // logged in / out meanwhile — that state is newer
      if (value) await claimLocalData(value.id);
      if (my !== epoch) return;
      set({ customer: value, loading: false });
      saveCustomer(value);
      if (value) useWaitlistStore.getState().load();
    } catch (e) {
      if (my !== epoch) return;
      set({ loading: false });
      // no network on start: the login cookie is still valid — try again when the app comes back
      if (e instanceof ApiError && e.status === 0) retryWhenActive();
    }
  },

  reloadCustomer: async () => {
    const my = epoch;
    const was = get().customer;
    if (!was) return;
    try {
      const value = await whoAmI();
      if (my !== epoch || !value || value.id !== was.id) return;
      set({ customer: value });
      saveCustomer(value);
    } catch {
      /* offline: keep what we have */
    }
  },

  login: async (login, password) => {
    const my = ++epoch;
    await api.login(normalizeLogin(login), password);
    // the server has just set a fresh cookie — a pending logout must not remove it
    await AsyncStorage.removeItem(LOGOUT_PENDING_KEY).catch(() => {});
    const { customer } = await api.me();
    const value = customer ? await full(customer) : null;
    if (my !== epoch) return;
    if (value) await claimLocalData(value.id);
    set({ customer: value, loading: false });
    saveCustomer(value);
    if (value) useWaitlistStore.getState().load();
  },

  logout: async () => {
    ++epoch;
    await unregisterPush();
    useNotifications.getState().reset();
    try {
      await api.logout();
      await AsyncStorage.removeItem(LOGOUT_PENDING_KEY).catch(() => {});
    } catch {
      // the cookie is still on the phone: finish the logout on the next start / refresh,
      // otherwise the account would silently come back after a restart
      await AsyncStorage.setItem(LOGOUT_PENDING_KEY, "1").catch(() => {});
    }
    clearLocalAccountData();
    saveCustomer(null);
    await AsyncStorage.removeItem(OWNER_KEY).catch(() => {});
    set({ customer: null, loading: false });
  },

  setCustomer: (customer) => {
    set({ customer });
    saveCustomer(customer);
  },
}));
