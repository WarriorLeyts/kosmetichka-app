import { create } from "zustand";
import { AppState } from "react-native";
import { api, ApiError } from "../api";
import type { Customer } from "../types";
import { useCartStore } from "./cart";
import { useWaitlistStore } from "./waitlist";

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
    try {
      const { customer } = await api.me();
      set({ customer: customer ? await full(customer) : null, loading: false });
      if (customer) useWaitlistStore.getState().load();
    } catch (e) {
      set({ loading: false });
      // no network on start: the login cookie is still valid — try again when the app comes back
      if (e instanceof ApiError && e.status === 0) retryWhenActive();
    }
  },

  login: async (login, password) => {
    await api.login(normalizeLogin(login), password);
    const { customer } = await api.me();
    set({ customer: customer ? await full(customer) : null });
    useWaitlistStore.getState().load();
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      /* cookie is cleared by the server; ignore network errors */
    }
    useCartStore.getState().clear();
    useWaitlistStore.getState().reset();
    set({ customer: null });
  },

  setCustomer: (customer) => set({ customer }),
}));
