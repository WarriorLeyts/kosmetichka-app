/**
 * Client for the site's API (kosmetichka-opt.ru).
 * Login uses the site's own httpOnly cookie `auth_token`: iOS and Android keep
 * cookies for the domain natively, so every request below is authenticated
 * after /api/auth/login — exactly like the website.
 */
import { Platform } from "react-native";
import type {
  AppNotification, Brand, Category, ChatMessage, Customer, Order, OrdersPage, Product, RoleInfo, Variant,
} from "./types";

// in the phone apps — the site's address; on the website (this app built for the browser) — the same origin
export const BASE_URL = Platform.OS === "web" ? "" : "https://kosmetichka-opt.ru";

export type ChatUpload = { url: string; kind: "img" | "video" | "file"; name: string; size: number; mime: string };

export class ApiError extends Error {
  status: number;
  /** machine-readable reason from the server, e.g. «bonuses_unavailable» */
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
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
    // only a string can be shown in <Text> — anything else would crash the screen that renders it
    const msg = typeof data?.error === "string" && data.error ? data.error : `Ошибка сервера (${res.status})`;
    throw new ApiError(msg, res.status, typeof data?.code === "string" ? data.code : undefined);
  }
  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

/** One URL path segment: ids come from routes / deep links, so «../» etc. must never reach the path. */
const seg = (id: number | string) => encodeURIComponent(String(id));

/** Thumbnail widths the server makes (lib/thumb.ts on the site): 160 / 320 / 480 / 800 / 1200. */
export type ThumbWidth = 160 | 320 | 480 | 800 | 1200;

/** `w` → a small WebP copy made by the server instead of the full photo (5–10× fewer bytes). */
export function imageUrl(path?: string | null, w?: ThumbWidth): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/")) return BASE_URL + path;
  return `${BASE_URL}/1c/${path}${w ? `?w=${w}` : ""}`;
}

export type CatalogQuery = {
  page?: number;
  search?: string;
  categoryGuids?: string[];
  brandGuids?: string[];
  sort?: "popularity" | "price_asc" | "price_desc" | "name";
  onlyStock?: boolean;
  quick?: ("new" | "sale" | "gift")[];
  /** product type inside a subcategory: the name contains any of these fragments */
  nameAny?: string[];
};

export type CheckoutCalc = {
  subtotal: number;
  promo: { code: string; name: string | null; discount: number } | null;
  promoError?: string;
  bonuses: { canSpend: boolean; balance: number | null; maxToApply: number; applied: number; collected: number } | null;
  total: number;
  loyaltyError?: string;
};

export type CatalogPage = { products: Product[]; total: number; page: number; hasMore: boolean; nameAnyApplied?: boolean };

export const api = {
  // ── Catalog ──
  catalog(q: CatalogQuery, signal?: AbortSignal): Promise<CatalogPage> {
    const p = new URLSearchParams();
    p.set("page", String(q.page ?? 1));
    if (q.search) p.set("search", q.search);
    q.categoryGuids?.forEach((g) => p.append("categoryGuid", g));
    q.brandGuids?.forEach((g) => p.append("brandGuid", g));
    if (q.sort) p.set("sort", q.sort);
    if (q.onlyStock) p.set("onlyStock", "true");
    q.quick?.forEach((x) => p.append("quick", x));
    q.nameAny?.forEach((x) => p.append("nameAny", x));
    // cards don't show the description — the server leaves it out (≈65% of the page)
    p.set("lite", "1");
    return request(`/api/catalog/products?${p.toString()}`, signal ? { signal } : {});
  },
  catalogMeta(): Promise<{ categories: Category[]; brands: Brand[] }> {
    return request("/api/mobile/catalog-meta");
  },
  homeStats(): Promise<{ totalProducts: number; totalBrands: number; totalCategories: number }> {
    return request("/api/mobile/home");
  },
  product(id: number | string): Promise<Product> {
    return request(`/api/products/${seg(id)}`);
  },
  variants(id: number): Promise<{ variants: Variant[] }> {
    return request(`/api/products/${seg(id)}/variants`);
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
    name: string; companyName?: string; address?: string; phone: string; email: string; password: string;
    captchaToken: string; smsCode: string; priceType: string; source?: "site";
  }) {
    return request<{ success: boolean; autoLogin: boolean; message: string }>("/api/auth/register", {
      method: "POST",
      body: json(body),
    });
  },
  forgotPassword(email: string) {
    return request("/api/auth/forgot-password", { method: "POST", body: json({ email }) });
  },

  // ── Loyalty card (MAXMA, by the customer's phone) ──
  loyalty(): Promise<{
    card: {
      number: string;
      name: string;
      level: string | null;
      cashback: string | null;
      bonuses: number;
      pendingBonuses: number;
    } | null;
    reason?: string;
  }> {
    return request("/api/mobile/loyalty");
  },
  /** «Добавить карту», step 1: phone or card number → MAXMA texts a code to the card owner */
  loyaltyFind(query: string): Promise<{ sent: boolean; phone: string | null }> {
    return request("/api/mobile/loyalty/link", { method: "POST", body: json({ query }) });
  },
  /** step 2: the code from the SMS → the card is linked to this account */
  loyaltyConfirm(code: string): Promise<{ card: { number: string; name: string; level: string | null; cashback: string | null; bonuses: number; pendingBonuses: number } }> {
    return request("/api/mobile/loyalty/link", { method: "POST", body: json({ code }) });
  },
  loyaltyUnlink(): Promise<{ ok: boolean }> {
    return request("/api/mobile/loyalty", { method: "DELETE" });
  },

  // ── Price type: retail ↔ granted wholesale at once, a higher level by request ──
  role(): Promise<RoleInfo> {
    return request("/api/mobile/role");
  },
  roleSet(priceType: string): Promise<RoleInfo> {
    return request("/api/mobile/role", { method: "POST", body: json({ priceType }) });
  },
  roleWithdraw(): Promise<RoleInfo> {
    return request("/api/mobile/role", { method: "DELETE" });
  },

  // ── Notifications («Уведомления», push) ──
  notifications(before?: number): Promise<{ unread: number; items: AppNotification[]; hasMore: boolean }> {
    return request(`/api/mobile/notifications${before ? `?before=${before}` : ""}`);
  },
  notificationsUnread(): Promise<{ unread: number }> {
    return request("/api/mobile/notifications?count=1");
  },
  notificationsRead(ids?: number[]): Promise<{ unread: number }> {
    return request("/api/mobile/notifications/read", { method: "POST", body: json(ids ? { ids } : {}) });
  },
  pushTokenSave(token: string, platform: string): Promise<{ ok: boolean }> {
    return request("/api/mobile/push-token", { method: "POST", body: json({ token, platform }) });
  },
  pushTokenRemove(token: string): Promise<{ ok: boolean }> {
    return request("/api/mobile/push-token", { method: "DELETE", body: json({ token }) });
  },
  /** Website only: browser Web Push (VAPID public key; enabled=false when the server has no keys). */
  webPushKey(): Promise<{ enabled: boolean; publicKey?: string }> {
    return request("/api/web-push/key");
  },
  webPushSubscribe(sub: PushSubscriptionJSON): Promise<{ ok: boolean }> {
    return request("/api/web-push/subscribe", { method: "POST", body: json(sub) });
  },
  webPushUnsubscribe(endpoint: string): Promise<{ ok: boolean }> {
    return request("/api/web-push/unsubscribe", { method: "POST", body: json({ endpoint }) });
  },
  setPushPromo(on: boolean): Promise<{ customer: Customer }> {
    return request("/api/mobile/profile", { method: "PATCH", body: json({ pushPromo: on }) });
  },

  // ── Profile ──
  /** Deletes the account (personal data erased, orders stay without it); the password confirms it. */
  deleteAccount(password: string): Promise<{ success: boolean }> {
    return request("/api/mobile/profile", { method: "DELETE", body: json({ password }) });
  },
  profile(): Promise<{ customer: Customer }> {
    return request("/api/mobile/profile");
  },
  saveProfile(body: Record<string, string>): Promise<{ customer: Customer }> {
    return request("/api/mobile/profile", { method: "PATCH", body: json(body) });
  },

  // ── Orders ──
  createOrder(
    items: { id: number; quantity: number; variantName?: string | null; variantImageUrl?: string | null }[],
    comment: string,
    extra: { promocode?: string; applyBonuses?: number; address?: string } = {}
  ) {
    return request<{ success: boolean; orderId: number; loyaltyWarning?: string }>("/api/orders", {
      method: "POST",
      body: json({
        items,
        comment,
        ...(extra.promocode ? { promocode: extra.promocode } : {}),
        ...(extra.applyBonuses ? { applyBonuses: extra.applyBonuses } : {}),
        ...(extra.address ? { address: extra.address } : {}),
      }),
    });
  },
  /** Cart total with MAXMA: promo code, bonuses to spend, bonuses to be accrued (nothing is reserved yet). */
  checkoutCalc(body: { items: { id: number; quantity: number; variantName?: string | null }[]; promocode?: string; applyBonuses?: number }) {
    return request<CheckoutCalc>("/api/checkout/calc", { method: "POST", body: json(body) });
  },
  /** Promo code from MAXMA: the server prices the cart and asks MAXMA for the discount (nothing is reserved yet). */
  promoCheck(code: string, items: { id: number; quantity: number; variantName?: string | null }[]) {
    return request<{ ok: true; code: string; name?: string; subtotal: number; discount: number; total: number }>("/api/promo/check", {
      method: "POST",
      body: json({ code, items }),
    });
  },
  orders(page = 1, status = ""): Promise<OrdersPage> {
    const p = new URLSearchParams();
    p.set("page", String(page));
    if (status) p.set("status", status);
    return request(`/api/mobile/orders?${p.toString()}`);
  },
  order(id: number | string): Promise<Order> {
    return request(`/api/mobile/orders/${seg(id)}`);
  },
  /** customer changes the order: quantities, removed lines, added products (prices are set by the site) */
  editOrder(
    id: number,
    body: {
      items: { id: number; quantity: number }[];
      removeIds: number[];
      newItems: { id: number; quantity: number; variantName?: string | null; variantImageUrl?: string | null }[];
    }
  ) {
    return request<{ order: unknown }>(`/api/orders/${seg(id)}/items`, { method: "PUT", body: json(body) });
  },
  cancelOrder(id: number) {
    return request(`/api/orders/${seg(id)}/cancel`, { method: "POST" });
  },
  confirmOrder(id: number) {
    return request(`/api/orders/${seg(id)}/confirm`, { method: "POST" });
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
    return request(`/api/orders/${seg(orderId)}/messages`);
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
    if (!res.ok || typeof data?.url !== "string") {
      throw new ApiError(typeof data?.error === "string" && data.error ? data.error : `Не удалось загрузить файл (${res.status})`, res.status);
    }
    return data as ChatUpload;
  },
  sendMessage(orderId: number, text: string) {
    return request(`/api/orders/${seg(orderId)}/messages`, { method: "POST", body: json({ text }) });
  },
  /** «Добавить товар» in the order chat: the site writes a product card the manager adds to the order with one tap */
  requestProduct(orderId: number, line: { productId: number; quantity: number; variantName?: string | null }) {
    return request(`/api/orders/${seg(orderId)}/messages`, { method: "POST", body: json({ productRequest: line }) });
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
    return request(`/api/wishlist?productId=${seg(productId)}`, { method: "DELETE" });
  },
};
