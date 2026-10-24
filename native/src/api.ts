/**
 * Client for the site's API (kosmetichka-opt.ru).
 * Login uses the site's own httpOnly cookie `auth_token`: iOS and Android keep
 * cookies for the domain natively, so every request below is authenticated
 * after /api/auth/login — exactly like the website.
 */
import type {
  Brand, Category, ChatMessage, Customer, Order, OrdersPage, Product, Variant,
} from "./types";

export const BASE_URL = "https://kosmetichka-opt.ru";

export type ChatUpload = { url: string; kind: "img" | "video" | "file"; name: string; size: number; mime: string };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE_URL + path, {
      credentials: "include",
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
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
  if (!res.ok) {
    throw new ApiError(data?.error || `Ошибка сервера (${res.status})`, res.status);
  }
  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

export function imageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/")) return BASE_URL + path;
  return `${BASE_URL}/1c/${path}`;
}

export type CatalogQuery = {
  page?: number;
  search?: string;
  categoryGuids?: string[];
  brandGuids?: string[];
  sort?: "popularity" | "price_asc" | "price_desc" | "name";
  onlyStock?: boolean;
  quick?: ("new" | "sale" | "gift")[];
};

export type CatalogPage = { products: Product[]; total: number; page: number; hasMore: boolean };

export const api = {
  // ── Catalog ──
  catalog(q: CatalogQuery): Promise<CatalogPage> {
    const p = new URLSearchParams();
    p.set("page", String(q.page ?? 1));
    if (q.search) p.set("search", q.search);
    q.categoryGuids?.forEach((g) => p.append("categoryGuid", g));
    q.brandGuids?.forEach((g) => p.append("brandGuid", g));
    if (q.sort) p.set("sort", q.sort);
    if (q.onlyStock) p.set("onlyStock", "true");
    q.quick?.forEach((x) => p.append("quick", x));
    return request(`/api/catalog/products?${p.toString()}`);
  },
  catalogMeta(): Promise<{ categories: Category[]; brands: Brand[] }> {
    return request("/api/mobile/catalog-meta");
  },
  homeStats(): Promise<{ totalProducts: number; totalBrands: number; totalCategories: number }> {
    return request("/api/mobile/home");
  },
  product(id: number | string): Promise<Product> {
    return request(`/api/products/${id}`);
  },
  variants(id: number): Promise<{ variants: Variant[] }> {
    return request(`/api/products/${id}/variants`);
  },

  // ── Auth ──
  login(login: string, password: string) {
    return request<{ success: boolean }>("/api/auth/login", {
      method: "POST",
      body: json({ email: login, password }),
    });
  },
  me(): Promise<{ customer: Customer | null }> {
    return request("/api/auth/me");
  },
  logout() {
    return request("/api/auth/logout", { method: "POST" });
  },
  sendSms(phone: string) {
    return request<{ success?: boolean }>("/api/auth/sms/send", { method: "POST", body: json({ phone }) });
  },
  register(body: {
    name: string; companyName?: string; phone: string; email: string; password: string;
    captchaToken: string; smsCode: string; priceType: string;
  }) {
    return request<{ success: boolean; autoLogin: boolean; message: string }>("/api/auth/register", {
      method: "POST",
      body: json(body),
    });
  },
  forgotPassword(email: string) {
    return request("/api/auth/forgot-password", { method: "POST", body: json({ email }) });
  },

  // ── Profile ──
  profile(): Promise<{ customer: Customer }> {
    return request("/api/mobile/profile");
  },
  saveProfile(body: Record<string, string>): Promise<{ customer: Customer }> {
    return request("/api/mobile/profile", { method: "PATCH", body: json(body) });
  },

  // ── Orders ──
  createOrder(items: { id: number; quantity: number; variantName?: string | null; variantImageUrl?: string | null }[], comment: string) {
    return request<{ success: boolean; orderId: number }>("/api/orders", {
      method: "POST",
      body: json({ items, comment }),
    });
  },
  orders(page = 1, status = ""): Promise<OrdersPage> {
    const p = new URLSearchParams();
    p.set("page", String(page));
    if (status) p.set("status", status);
    return request(`/api/mobile/orders?${p.toString()}`);
  },
  order(id: number | string): Promise<Order> {
    return request(`/api/mobile/orders/${id}`);
  },
  cancelOrder(id: number) {
    return request(`/api/orders/${id}/cancel`, { method: "POST" });
  },
  confirmOrder(id: number) {
    return request(`/api/orders/${id}/confirm`, { method: "POST" });
  },
  orderStatus(): Promise<{
    pending: number;
    statuses: { id: number; status: string }[];
    managerMessages: { orderId: number; latestAt: string; preview: string }[];
    isApproved?: boolean;
  }> {
    return request("/api/orders/status");
  },
  messages(orderId: number): Promise<{ messages: ChatMessage[] }> {
    return request(`/api/orders/${orderId}/messages`);
  },
  /** photo / video / file for the manager chat (site endpoint /api/uploads/chat, same cookie login) */
  async uploadChat(file: { uri: string; name: string; mime: string }): Promise<ChatUpload> {
    const form = new FormData();
    form.append("file", { uri: file.uri, name: file.name, type: file.mime } as unknown as Blob);
    let res: Response;
    try {
      res = await fetch(BASE_URL + "/api/uploads/chat", { method: "POST", body: form, credentials: "include", headers: { Accept: "application/json" } });
    } catch {
      throw new ApiError("Нет связи с сервером. Проверьте интернет.", 0);
    }
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.url) throw new ApiError(data?.error || `Не удалось загрузить файл (${res.status})`, res.status);
    return data as ChatUpload;
  },
  sendMessage(orderId: number, text: string) {
    return request(`/api/orders/${orderId}/messages`, { method: "POST", body: json({ text }) });
  },

  // ── Waiting list ──
  wishlist(): Promise<{ productIds: number[]; products: (Product & { notified: boolean; wishlistItemId: number; prices?: { priceType: string; price: number }[] })[] }> {
    return request("/api/wishlist");
  },
  /** Toggles: adds if absent, removes if present. */
  wishlistToggle(productId: number): Promise<{ added: boolean }> {
    return request("/api/wishlist", { method: "POST", body: json({ productId }) });
  },
  wishlistRemove(productId: number) {
    return request(`/api/wishlist?productId=${productId}`, { method: "DELETE" });
  },
};
