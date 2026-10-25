/**
 * Client for the site's staff API (kosmetichka-opt.ru).
 * Login: POST /api/admin/login sets the httpOnly cookie `admin_token` (same as the site's /admin and
 * /picker pages); iOS and Android keep cookies for the domain natively, so every request below is
 * authenticated after login.
 */
export const BASE_URL = "https://kosmetichka-opt.ru";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
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
  if (!res.ok) throw new ApiError(data?.error || `Ошибка сервера (${res.status})`, res.status);
  return data as T;
}

export const json = (body: unknown) => JSON.stringify(body);
export const get = <T,>(path: string) => request<T>(path);
export const post = <T,>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body === undefined ? undefined : json(body) });
export const put = <T,>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: json(body) });
export const patch = <T,>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: json(body) });
export const del = <T,>(path: string) => request<T>(path, { method: "DELETE" });

/** absolute URL for site paths and 1C product images */
export function imageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/")) return BASE_URL + path;
  return `${BASE_URL}/api/1c/${path}`;
}

export type ChatUpload = { url: string; kind: "img" | "video" | "file"; name: string; size: number; mime: string };

/** photo / video / file for chats (site endpoint /api/uploads/chat accepts staff cookies) */
export async function uploadChat(file: { uri: string; name: string; mime: string }): Promise<ChatUpload> {
  const form = new FormData();
  form.append("file", { uri: file.uri, name: file.name, type: file.mime } as unknown as Blob);
  const data = await request<ChatUpload & { url?: string }>("/api/uploads/chat", { method: "POST", body: form });
  return { kind: "img", name: file.name, size: 0, mime: file.mime, ...data } as ChatUpload;
}
