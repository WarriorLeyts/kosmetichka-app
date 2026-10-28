import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./storage";
import { get, post, setOnUnauthorized } from "../api";
import { useBadges } from "./badges";
import { stopWebPush } from "../webPush";

export type Role = "admin" | "manager" | "picker";
export type Staff = { id: number; name: string | null; login: string; role: Role; roleLabel?: string };
type Me = { id: number; name: string; login: string; role: string; roleLabel: string; tokenRole: Role };
const ROLES: readonly Role[] = ["admin", "manager", "picker"];
// rights follow the role in the login token (tokenRole); anything unknown is not a staff session
const toStaff = (m: Me): Staff | null =>
  m && ROLES.includes(m.tokenRole) ? { id: m.id, name: m.name, login: m.login, role: m.tokenRole, roleLabel: m.roleLabel } : null;

type AuthState = {
  user: Staff | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

/** the session cookie lives in the system cookie store; the server deletes it on /api/team/logout */
let dropping: Promise<unknown> = Promise.resolve();
const dropServerSession = () => {
  dropping = post("/api/team/logout").catch(() => {});
  return dropping;
};

/** everything kept in memory for the signed-in account */
function clearAccountState() {
  useBadges.setState({ counts: {} });
}

/** waits until the cached profile is read from storage (AsyncStorage is async) */
function hydrated(): Promise<void> {
  if (useAuth.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useAuth.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

/** staff session: the cookie lives in the system cookie store, the profile is cached for a fast start */
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      login: async (login, password) => {
        clearAccountState();
        // a sign-out still in flight must not delete the new session cookie after this login
        await dropping;
        await post<{ success: boolean; role: Role }>("/api/admin/login", { login: login.trim(), password });
        const me = toStaff(await get<Me>("/api/team/me"));
        if (!me) {
          await dropServerSession();
          throw new Error("Эта учётная запись не может войти в приложение");
        }
        set({ user: me });
      },
      logout: async () => {
        // sign out locally right away (works offline too); the cookie is dropped on the server
        set({ user: null });
        clearAccountState();
        // this browser stops getting the account's notifications (web only)
        void stopWebPush();
        await dropServerSession();
      },
      refresh: async () => {
        await hydrated();
        if (!useAuth.getState().user) {
          // signed out (maybe offline): never resume a session from a leftover cookie
          dropServerSession();
          set({ loading: false });
          return;
        }
        try {
          const me = toStaff(await get<Me>("/api/team/me"));
          if (!useAuth.getState().user) return; // signed out meanwhile
          set({ user: me, loading: false });
          if (!me) dropServerSession();
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

// any 401 during work signs the user out; the tabs layout then shows the login screen
setOnUnauthorized(() => {
  if (useAuth.getState().user) {
    useAuth.setState({ user: null });
    clearAccountState();
    void stopWebPush();
    // /api/team/me answers 401 for a deleted account while the cookie still works elsewhere
    dropServerSession();
  }
});
