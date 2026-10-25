import type { ReactNode } from "react";
import { Redirect } from "expo-router";
import { useAuth, type Role } from "../store/auth";

/** screens a picker may open (route names of the root stack and of the tabs) */
const PICKER_ROUTES = new Set(["(tabs)", "index", "picker", "more", "pick/[id]", "login", "+not-found"]);
/** admin-only screens (staff management) */
const ADMIN_ROUTES = new Set(["users", "user/new", "user/[id]"]);
/** screens reachable without a session */
const PUBLIC_ROUTES = new Set(["login", "+not-found"]);

export function canOpen(role: Role | undefined, route: string): boolean {
  if (!role) return PUBLIC_ROUTES.has(route);
  if (role === "picker") return PICKER_ROUTES.has(route);
  if (ADMIN_ROUTES.has(route)) return role === "admin";
  return role === "admin" || role === "manager";
}

/**
 * Wraps every screen (root stack and tabs): a deep link or a stale route can't show a screen
 * the role may not use (pickers → only assembly; staff management → admin only),
 * and inner screens go to the sign-in screen when the session ends.
 */
export function RoleGuard({ route, children }: { route: string; children: ReactNode }) {
  const role = useAuth((s) => s.user?.role);
  const loading = useAuth((s) => s.loading);
  // the tabs layout redirects to /login by itself
  if (route === "(tabs)" && !role) return <>{children}</>;
  if (canOpen(role, route)) return <>{children}</>;
  if (!role && loading) return null; // profile still loading — don't mount the screen yet
  return <Redirect href={role ? "/" : "/login"} />;
}
