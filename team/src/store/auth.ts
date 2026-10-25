import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./storage";
import { get, post } from "../api";

export type Role = "admin" | "manager" | "picker";
export type Staff = { id: number; name: string | null; login: string; role: Role; roleLabel?: string };
type Me = { id: number; name: string; login: string; role: string; roleLabel: string; tokenRole: Role };
// rights follow the role in the login token (tokenRole)
const toStaff = (m: Me): Staff => ({ id: m.id, name: m.name, login: m.login, role: m.tokenRole, roleLabel: m.roleLabel });

type AuthState = {
  user: Staff | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

/** staff session: the cookie lives in the system cookie store, the profile is cached for a fast start */
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      login: async (login, password) => {
        await post<{ success: boolean; role: Role }>("/api/admin/login", { login: login.trim(), password });
        const me = await get<Me>("/api/team/me");
        set({ user: toStaff(me) });
      },
      logout: async () => {
        await post("/api/team/logout").catch(() => {});
        set({ user: null });
      },
      refresh: async () => {
        try {
          const me = await get<Me>("/api/team/me");
          set({ user: toStaff(me), loading: false });
        } catch (e) {
          // 401 = session ended; network errors keep the cached profile
          if ((e as { status?: number }).status === 401) set({ user: null });
          set({ loading: false });
        }
      },
    }),
    { name: "team-auth", storage: persistStorage, partialize: (s) => ({ user: s.user }) }
  )
);

export const isPicker = (u: Staff | null) => u?.role === "picker";
export const ROLE_LABEL: Record<Role, string> = { admin: "Администратор", manager: "Менеджер", picker: "Сборщик" };
