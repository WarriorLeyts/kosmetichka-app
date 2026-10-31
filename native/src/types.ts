export type ProductImage = { path: string };

export type Product = {
  id: number;
  guid?: string;
  name: string;
  barcode?: string | null;
  article?: string | null;
  description?: string | null;
  stock?: number | null;
  minOrderQty?: number | null;
  brandGuid?: string | null;
  retailPrice?: number | null;
  discountPrice?: number | null;
  wholesalePrice?: number | null;
  bigWholesalePrice?: number | null;
  images?: ProductImage[];
  category?: { guid: string; name: string } | null;
  brand?: { guid?: string; name: string } | null;
};

export type Variant = { id: number; imageId: number; imageUrl: string; name: string };

export type Category = { id?: number; guid: string; name: string; parentGuid?: string | null; sortOrder?: number };
export type Brand = { id?: number; guid: string; name: string };

export type CartItem = Product & {
  cartKey: string;
  quantity: number;
  variantId?: number;
  variantName?: string | null;
  variantImageUrl?: string | null;
  /** the product is no longer in the catalogue (the cart's last check didn't find it) */
  gone?: boolean;
};

export type Customer = {
  id: number;
  name?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  inn?: string | null;
  city?: string | null;
  address?: string | null;
  priceType?: string | null;
  /** wholesale level the admin granted ("wholesale" | "big_wholesale") */
  wholesaleAccess?: string | null;
  /** request for a wholesale price type: "pending" | "rejected" */
  roleRequest?: string | null;
  roleRequestStatus?: string | null;
  /** agreed to promo pushes («Акции и новости») */
  pushPromo?: boolean;
  manager?: string | null;
};

/** «Уведомления»: order status, manager message, back in stock, bonuses, wholesale request, promo */
export type AppNotification = {
  id: number;
  kind: "order" | "chat" | "restock" | "bonus" | "role" | "promo";
  title: string;
  body: string;
  /** in-app route opened on tap, e.g. "/order/12" */
  link: string | null;
  read: boolean;
  createdAt: string;
};

/** Price type («роль») the customer can switch to — /api/mobile/role */
export type RoleOption = { value: string; label: string; state: "current" | "available" | "request" | "pending" };
export type RoleInfo = {
  priceType: string;
  priceTypeLabel: string;
  wholesaleAccess: string | null;
  roleRequest: string | null;
  roleRequestStatus: string | null;
  roleOptions: RoleOption[];
  switched?: boolean;
  requested?: boolean;
};

export type OrderItem = {
  id: number;
  productId: number;
  productName: string;
  barcode?: string | null;
  quantity: number;
  price: number;
  total: number;
  variantName?: string | null;
  variantImageUrl?: string | null;
  imagePath?: string | null;
  /** what the manager did to this line (order detail only) */
  staffChange?: LineChange | null;
};

/** A manager's change of an order line: added it, or changed quantity / price / variant (old values). */
export type LineChange = {
  kind: "added" | "changed";
  oldQuantity: number | null;
  oldPrice: number | null;
  oldVariant: string | null;
  at: string;
};

/** A line taken out of the order — by the manager ("staff") or by the customer. */
export type RemovedOrderItem = {
  productId: number | null;
  productName: string;
  variantName: string | null;
  quantity: number | null;
  price: number | null;
  imagePath: string | null;
  by: "staff" | "customer";
  at: string;
};

export type Order = {
  id: number;
  status: string;
  total: number;
  comment?: string | null;
  /** «pickup» — Заберу в магазине, «delivery» — to deliveryAddress (may be empty); null — old orders */
  deliveryType?: "pickup" | "delivery" | null;
  deliveryAddress?: string | null;
  createdAt: string;
  customerConfirmed?: boolean;
  /** MAXMA promo code used for the order and its discount (₽); total is already after it */
  promoCode?: string | null;
  discount?: number;
  /** MAXMA bonuses spent on the order (₽) and to be accrued when it is done */
  bonusesApplied?: number;
  bonusesCollected?: number;
  items: OrderItem[];
  /** order detail: the customer may still change it (quantities, remove, add) — until it is «Заказ оформлен» (payment) */
  editable?: boolean;
  /** why the customer can't change it now («Заказ собирается…») */
  editBlockedReason?: string | null;
  /** the manager changed the order and waits for «Подтвердить» — until then it can't be «Заказ оформлен» */
  needsConfirm?: boolean;
  removedItems?: RemovedOrderItem[];
};

export type OrdersPage = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  stats: { totalOrders: number; totalSum: number; topProduct: string | null; topProductQty: number };
  orders: Order[];
};

export type ChatMessage = { id: number; text: string; isFromManager: boolean; createdAt: string };

export const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает подтверждения",
  approved: "Подтверждён",
  assembly: "Сборка",
  consultation: "На проверке",
  payment: "Заказ оформлен",
  exported: "Выполнен",
  cancelled: "Отменён",
};

/** Same as the site's STATUS_COLORS (Tailwind *-100 bg, *-800 text, *-200 border). */
export const STATUS_COLORS: Record<string, { fg: string; bg: string; border: string }> = {
  pending: { fg: "#92400e", bg: "#fef3c7", border: "#fde68a" },
  approved: { fg: "#065f46", bg: "#d1fae5", border: "#a7f3d0" },
  assembly: { fg: "#1e40af", bg: "#dbeafe", border: "#bfdbfe" },
  consultation: { fg: "#9a3412", bg: "#ffedd5", border: "#fed7aa" },
  payment: { fg: "#065f46", bg: "#d1fae5", border: "#a7f3d0" },
  exported: { fg: "#475569", bg: "#f1f5f9", border: "#e2e8f0" },
  cancelled: { fg: "#b91c1c", bg: "#fee2e2", border: "#fecaca" },
};

/** Same as the site's STATUS_ICONS */
export const STATUS_ICONS: Record<string, string> = {
  pending: "⏳",
  approved: "✅",
  assembly: "📦",
  consultation: "💬",
  payment: "✅",
  exported: "🎉",
  cancelled: "❌",
};
