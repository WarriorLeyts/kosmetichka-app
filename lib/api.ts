/**
 * Mobile-app networking.
 *
 * The app ships its UI inside the phone (capacitor://localhost or
 * https://localhost), but the data lives on the live site. Every request the
 * site code makes to a relative "/api/..." or "/1c/..." URL is rewritten to
 * the live server here, so the copied site components keep working unchanged.
 *
 * Cookies (auth_token) are handled natively by Capacitor's HTTP plugin
 * (CapacitorHttp, enabled in capacitor.config.ts), which also removes CORS
 * from the equation — no server changes needed.
 */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "https://kosmetichka-opt.ru").replace(/\/$/, "");

const REMOTE_PREFIXES = ["/api/", "/1c/", "/image/", "/uploads/"];

export function isRemotePath(path: string) {
  return REMOTE_PREFIXES.some((p) => path.startsWith(p));
}

/** Absolute URL on the live server for a relative "/..." path. */
export function remoteUrl(path: string) {
  if (!path) return path;
  if (/^https?:\/\//.test(path)) return path;
  return API_BASE + (path.startsWith("/") ? path : "/" + path);
}

/** Absolute URL of a public site page — used for things the app opens in the browser (invoice, share links). */
export function siteUrl(path: string) {
  return remoteUrl(path);
}

/** Image path from 1C ("folder/file.jpg", "/1c/...", or full URL) → absolute URL. */
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/")) return remoteUrl(path);
  return `${API_BASE}/1c/${path}`;
}

let installed = false;

/** Patch window.fetch once so relative API calls go to the live server. */
export function installRemoteFetch() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && isRemotePath(input)) {
      return original(remoteUrl(input), { credentials: "include", ...init });
    }
    if (input instanceof URL && input.origin === window.location.origin && isRemotePath(input.pathname)) {
      return original(remoteUrl(input.pathname + input.search), { credentials: "include", ...init });
    }
    return original(input as RequestInfo, init);
  }) as typeof window.fetch;
}

/** Was this endpoint added to the server yet? (optional /api/mobile/* routes) */
export async function fetchMobileApi<T>(path: string, init?: RequestInit): Promise<
  { ok: true; data: T } | { ok: false; status: number; error?: string }
> {
  try {
    const res = await fetch(`/api/mobile${path}`, init);
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const body = isJson ? await res.json() : null;
    if (!res.ok || !isJson) return { ok: false, status: res.status, error: body?.error };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** Open a URL outside the app (system browser). */
export async function openExternal(url: string) {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
  } catch {
    window.open(url, "_blank");
  }
}
