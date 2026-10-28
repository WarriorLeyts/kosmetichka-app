/**
 * Client for the site's staff API (kosmetichka-opt.ru).
 * Login: POST /api/admin/login sets the httpOnly cookie `admin_token` (same as the site's /admin and
 * /picker pages); iOS and Android keep cookies for the domain natively, so every request below is
 * authenticated after login.
 */
import { Platform } from "react-native";

/** the app: the site's address; the browser version is served by the site itself → same origin */
export const BASE_URL = Platform.OS === "web" ? "" : "https://kosmetichka-opt.ru";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(f: () => void) {
  onUnauthorized = f;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE_URL + path, {
      credentials: "include",
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    });
  } catch {
    throw new ApiError("Нет связи с сервером. Проверьте интернет.", 0);
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  // session ended (the login token lives 7 days) → back to the sign-in screen
  if (res.status === 401 && !path.startsWith("/api/admin/login")) onUnauthorized?.();
  if (!res.ok) throw new ApiError(data?.error || `Ошибка сервера (${res.status})`, res.status);
  return data as T;
}

/** non-JSON answers (e.g. the 1C XML export) with the same 401 handling as request() */
export async function requestText(path: string, init: RequestInit = {}): Promise<string> {
  let res: Response;
  try {
    res = await fetch(BASE_URL + path, { credentials: "include", ...init });
  } catch {
    throw new ApiError("Нет связи с сервером. Проверьте интернет.", 0);
  }
  const text = await res.text();
  if (res.status === 401) onUnauthorized?.();
  if (!res.ok) {
    let msg = `Ошибка сервера (${res.status})`;
    try {
      msg = JSON.parse(text)?.error || msg;
    } catch {}
    throw new ApiError(msg, res.status);
  }
  return text;
}

export const json = (body: unknown) => JSON.stringify(body);
export const get = <T,>(path: string) => request<T>(path);
export const post = <T,>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body === undefined ? undefined : json(body) });
export const put = <T,>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: json(body) });
export const patch = <T,>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: json(body) });
export const del = <T,>(path: string) => request<T>(path, { method: "DELETE" });

/** absolute URL for site paths and 1C product images */
/** `w` → a small WebP copy made by the server (160 / 320 / 480 / 800 / 1200) instead of the full photo. */
export function imageUrl(path?: string | null, w?: 160 | 320 | 480 | 800 | 1200): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/")) return BASE_URL + path;
  return `${BASE_URL}/api/1c/${path}${w ? `?w=${w}` : ""}`;
}

/**
 * Chat attachments (photo / video / file) come from message text that customers write, so only our own
 * upload paths are opened or loaded: /api/uploads/chat/<name> (and the older /uploads/chat/<name>)
 * on kosmetichka-opt.ru. Anything else → null.
 */
export function chatFileUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  let path = url.trim();
  if (path.startsWith(BASE_URL + "/")) path = path.slice(BASE_URL.length);
  if (!/^\/(api\/)?uploads\/chat\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(path) || path.includes("..")) return null;
  return BASE_URL + path;
}

/** https only (no cleartext http, no custom schemes) for anything opened in the in-app browser */
export function safeOpenUrl(path?: string | null): string | null {
  const u = imageUrl(path);
  return u && u.startsWith("https://") ? u : null;
}

export type ChatUpload = { url: string; kind: "img" | "video" | "file"; name: string; size: number; mime: string };

/** photo / video / file for chats (site endpoint /api/uploads/chat accepts staff cookies) */
export async function uploadChat(file: { uri: string; name: string; mime: string }): Promise<ChatUpload> {
  const form = new FormData();
  form.append("file", { uri: file.uri, name: file.name, type: file.mime } as unknown as Blob);
  // until the site's attachments update is live the server answers only { url } (photos)
  const data = await request<Partial<ChatUpload> & { url: string }>("/api/uploads/chat", { method: "POST", body: form });
  return { url: data.url, kind: data.kind ?? "img", name: data.name ?? file.name, size: data.size ?? 0, mime: data.mime ?? file.mime };
}
