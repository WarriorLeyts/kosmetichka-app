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
  manager?: string | null;
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
};

export type Order = {
  id: number;
  status: string;
  total: number;
  comment?: string | null;
  createdAt: string;
  customerConfirmed?: boolean;
  items: OrderItem[];
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
  consultation: "На консультации",
  payment: "К оплате",
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
  payment: "💳",
  exported: "🎉",
  cancelled: "❌",
};

/** Status accent colors for the dark/light «luxury» design (pill = tinted bg + border). */
export const STATUS_TONE: Record<string, { color: string; icon: "hourglass-outline" | "checkmark-circle-outline" | "cube-outline" | "chatbubbles-outline" | "card-outline" | "checkmark-done-outline" | "close-circle-outline" }> = {
  pending: { color: "#f5a524", icon: "hourglass-outline" },
  approved: { color: "#2fbf71", icon: "checkmark-circle-outline" },
  assembly: { color: "#5b8cff", icon: "cube-outline" },
  consultation: { color: "#ff7a45", icon: "chatbubbles-outline" },
  payment: { color: "#2fbf71", icon: "card-outline" },
  exported: { color: "#9aa0ad", icon: "checkmark-done-outline" },
  cancelled: { color: "#ff4d6d", icon: "close-circle-outline" },
};

/** "#rrggbb" + alpha → rgba() */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
