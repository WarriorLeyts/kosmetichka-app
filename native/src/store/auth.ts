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

/** Bumped by every login / logout: an older /api/auth/me answer must not overwrite a newer state. */
let epoch = 0;

type AuthState = {
  customer: Customer | null;
  loading: boolean;
  refresh: () => Promise<void>;
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

export const useAuth = create<AuthState>((set) => ({
  customer: null,
  loading: true,

  refresh: async () => {
    const my = epoch;
    try {
      // a logout that couldn't reach the server earlier: finish it before trusting the cookie
      if ((await AsyncStorage.getItem(LOGOUT_PENDING_KEY).catch(() => null)) === "1") {
        await api.logout();
        await AsyncStorage.removeItem(LOGOUT_PENDING_KEY).catch(() => {});
      }
      const { customer } = await api.me();
      const value = customer ? await full(customer) : null;
      if (my !== epoch) return; // logged in / out meanwhile — that state is newer
      if (value) await claimLocalData(value.id);
      if (my !== epoch) return;
      set({ customer: value, loading: false });
      if (value) useWaitlistStore.getState().load();
    } catch (e) {
      if (my !== epoch) return;
      set({ loading: false });
      // no network on start: the login cookie is still valid — try again when the app comes back
      if (e instanceof ApiError && e.status === 0) retryWhenActive();
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
    if (value) useWaitlistStore.getState().load();
  },

  logout: async () => {
    ++epoch;
    try {
      await api.logout();
      await AsyncStorage.removeItem(LOGOUT_PENDING_KEY).catch(() => {});
    } catch {
      // the cookie is still on the phone: finish the logout on the next start / refresh,
      // otherwise the account would silently come back after a restart
      await AsyncStorage.setItem(LOGOUT_PENDING_KEY, "1").catch(() => {});
    }
    clearLocalAccountData();
    await AsyncStorage.removeItem(OWNER_KEY).catch(() => {});
    set({ customer: null, loading: false });
  },

  setCustomer: (customer) => set({ customer }),
}));
