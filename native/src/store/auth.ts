import { create } from "zustand";
import { api } from "../api";
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

export const useAuth = create<AuthState>((set) => ({
  customer: null,
  loading: true,

  refresh: async () => {
    try {
      const { customer } = await api.me();
      set({ customer, loading: false });
      if (customer) useWaitlistStore.getState().load();
    } catch {
      set({ loading: false });
    }
  },

  login: async (login, password) => {
    await api.login(login.trim(), password);
    const { customer } = await api.me();
    set({ customer });
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
