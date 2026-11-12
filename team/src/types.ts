/** Data shapes of the site's staff API (kosmetichka-b2b app/api/team/README.md). */
export type CustomerShort = { name: string | null; companyName: string | null; phone: string | null; manager?: string | null; priceType?: string; oneCId?: string | null };

/** the order card line about the customer's 1С manager: «Менеджер: Имя» or, for a wholesaler without one, «Менеджер не назначен» */
export function managerLine(c: CustomerShort): { text: string; warn: boolean } | null {
  if (c.manager) return { text: `Менеджер: ${c.manager}`, warn: false };
  if (c.priceType === "wholesale" || c.priceType === "big_wholesale") return { text: "Менеджер не назначен", warn: true };
  return null;
}
export type Paging = { page: number; pageSize: number; totalCount: number; totalPages: number };
export type StatusCount = { status: string; label: string; count: number };

export type Dashboard = {
  today: { ordersCount: number; revenue: number; byStatus: Record<string, number> };
  active: { total: number; byStatus: StatusCount[] };
  weekRevenue: number;
  customers: { totalApproved: number; newToday: number };
  recentOrders: { id: number; status: string; statusLabel: string; total: number; createdAt: string; itemsCount: number; customer: CustomerShort; clientName: string }[];
};

export type OrderListItem = {
  id: number; status: string; statusLabel: string; total: number; createdAt: string;
  pickerId: number | null; customer: CustomerShort; itemsCount: number; checkedCount: number; hasIssues: boolean;
  /** staff changed the order, the customer hasn't confirmed yet */
  awaitingConfirmation?: boolean;
  /** the customer confirmed the checked order («На проверке») */
  customerConfirmed?: boolean;
} & ChatMarks;
/** newest customer / staff message in the order's customer chat («Новое сообщение» marks) */
export type ChatMarks = { lastCustomerMessageId?: number | null; lastCustomerMessageAt?: string | null; lastStaffMessageId?: number | null };
export type OrdersPage = Paging & {
  orders: OrderListItem[];
  filters: { date: string; businessToday: string; customer: string; status: string };
  todayCounts: { total: number; byStatus: StatusCount[] };
  /** the chosen day (or all dates) and search: count and sum per stage; `confirmed` — «На проверке» the customer confirmed */
  counts?: { total: number; sum: number; confirmed: number; byStatus: { status: string; label: string; count: number; sum: number }[] };
};

export type ItemCheck = {
  status: string; statuses: string[]; hasIssues: boolean; note: string | null; availableQty: number | null;
  picker: { name: string } | null; updatedAt: string;
};
export type OrderItem = {
  id: number; productId: number; productName: string; barcode: string | null; quantity: number; price: number; total: number;
  variantName: string | null; variantImageUrl: string | null; imagePath: string | null; imageUrl: string | null;
  /** current stock in the shop */
  stock?: number | null;
  /** stock per 1C warehouse (staff only; empty when 1C doesn't split it) */
  stockByWarehouse?: { name: string; qty: number }[];
  check: ItemCheck | null; photos: { id: number; url: string; createdAt: string }[];
  /** what the customer / staff did to this line (null — nothing) */
  customerChange?: LineChange | null;
  staffChange?: LineChange | null;
};
/** A change of an order line: added, or quantity / price / variant changed (old values). */
export type LineChange = { kind: "added" | "changed"; actorName: string | null; oldQuantity: number | null; oldPrice: number | null; oldVariant: string | null; at: string };
/** A line taken out of the order — by the customer or by staff. */
export type RemovedItem = {
  productId: number | null; productName: string; variantName: string | null; barcode: string | null;
  quantity: number | null; price: number | null; imagePath: string | null; by: "staff" | "customer"; actorName: string | null; at: string;
};
export type StaffMsg = { id: number; text: string; isFromPicker: boolean; userId: number | null; userName: string | null; userRole?: string | null; createdAt: string };
export type OrderDetail = {
  order: {
    id: number; status: string; statusLabel: string; total: number; comment: string | null; deliveryType?: "pickup" | "delivery" | null; deliveryAddress?: string | null; customerConfirmed: boolean;
    /** «Заказ покупателя» in 1С, or why it couldn't go there yet */
    oneCNumber?: string | null; oneCError?: string | null;
    /** staff changed the items, waiting for the customer's «Подтвердить» since (ISO) — «Заказ оформлен» is blocked */
    awaitingConfirmationSince?: string | null;
    lastCustomerMessageId?: number | null; lastCustomerMessageAt?: string | null; lastStaffMessageId?: number | null;
    /** MAXMA promo code and its discount (₽); total is after the discount */
    promoCode?: string | null; discount?: number;
    bonusesApplied?: number; bonusesCollected?: number;
    /** something for this order didn't reach MAXMA for over an hour (it keeps retrying) */
    maxmaStuck?: boolean; maxmaError?: string;
    changesSnapshot: null | {
      added: { productName: string; quantity: number; price: number; variantName: string | null }[];
      removed: { productName: string; quantity: number; price: number; variantName: string | null }[];
      changed: { productName: string; oldQty: number; newQty: number; price: number; variantName: string | null }[];
    };
    oneCExportedAt: string | null; bitrixDealId: number | null; createdAt: string; updatedAt: string;
    customerId: number;
    customer: { id: number; companyName: string | null; name: string | null; phone: string | null; email: string | null; city: string | null; address?: string | null; inn: string | null; manager: string | null; oneCId?: string | null; priceType: string; priceTier?: string };
    pickerId: number | null; picker: { id: number; name: string } | null;
    items: OrderItem[];
    removedItems?: RemovedItem[];
    messages: StaffMsg[];
    statusLogs: { id: number; fromStatus: string | null; toStatus: string; userId: number | null; userName: string | null; createdAt: string }[];
  };
  pickers: { id: number; name: string }[];
  allowedTransitions: string[];
  actions: { label: string; to: string }[];
  canEditItems: boolean;
  statusLabels: Record<string, string>;
};
export type CustomerMsg = { id: number; text: string; isFromPicker: boolean; userName: string | null; createdAt: string };

export type CustomerRow = {
  id: number; name: string | null; companyName: string | null; phone: string | null; email: string | null; inn: string | null; city: string | null;
  priceType: string; priceTypeLabel: string; isActive: boolean; isApproved: boolean; manager: string | null; displayName: string; createdAt: string;
  /** linked to a 1С counterparty — sent to admins only */
  inOneC?: boolean;
  /** customer's request for a wholesale price type */
  roleRequest?: string | null; roleRequestStatus?: string | null;
  /** a sign-up set aside as «Неактуальные» (ISO) */
  requestStaleAt?: string | null;
};
export type CustomersPage = Paging & {
  customers: CustomerRow[];
  filters: { q: string; status: string };
  /** tiles: each status within the chosen type, each type within the chosen status (+ search) */
  counts?: {
    all: number;
    newWeek: number;
    byStatus: Record<string, number>;
    types: Record<string, number>;
    /** admins only: wholesale customers — all / with their 1С manager / without */
    managers?: { all: number; linked: number; nomanager: number };
  };
};
export type CustomerDetail = {
  customer: CustomerRow & {
    address: string | null; oneCId: string | null; role: string; ordersCount: number; updatedAt: string;
    wholesaleAccess?: string | null; showRetailPrice?: boolean; referralSource?: string | null; orderedBefore?: boolean | null; roleRequestLabel?: string | null; roleRequestedAt?: string | null;
    /** wholesale proof: where he resells + photos / videos (1-hour links) */
    shopType?: string | null; shopTypeLabel?: string | null; shopLink?: string | null;
    proofs?: { id: number; kind: "img" | "video"; size: number; createdAt: string; url: string }[];
  };
};

export type Stats = {
  period: "all" | "365d" | "90d" | "30d";
  today: { ordersCount: number; revenue: number; ordersWithIssues: number };
  weekOrdersCount: number; avgOrderValue: number; nonCancelledOrdersCount: number;
  week: { date: string; count: number; total: number }[];
  statusDistribution: { status: string; label: string; count: number; percent: number }[];
  topCustomers: { customerId: number; displayName: string; priceTypeLabel: string | null; ordersCount: number; totalSpent: number; avgOrder: number }[];
  topProducts: { productName: string; qty: number; revenue: number }[];
  checks: { total: number; byStatus: { status: string; label: string; count: number; percent: number }[] };
};

export type StaffUser = { id: number; name: string; login: string; role: string; roleLabel: string; oneCGroup?: string | null; createdAt: string; isSelf: boolean };
export type StaffUserDetail = {
  user: StaffUser & { updatedAt: string; assignedOrdersCount: number; canDelete: boolean };
  roleOptions: { value: "admin" | "manager" | "picker"; label: string }[];
  /** 1С groups a manager account can get */
  groups?: string[];
};

export type PickerOrderRow = {
  id: number; status: string; comment: string | null; createdAt: string; pickerId: number | null; picker: { id: number; name: string } | null;
  isMine: boolean; isAssignedToOther: boolean; customer: CustomerShort; clientName: string;
  itemsCount: number; checkedCount: number; allChecked: boolean; hasIssues: boolean;
  progress: "not_started" | "in_progress" | "all_ok" | "has_issues";
  itemsPreview: { id: number; productName: string; variantName: string | null; quantity: number }[];
};
export type PickerOrder = {
  currentUserId: number;
  order: {
    id: number; status: string; comment: string | null; total: number; createdAt: string; pickerId: number | null; picker: { id: number; name: string } | null;
    customer: CustomerShort;
    /** the customer's price type (what «Добавить товар» shows first) */
    priceType?: string | null;
    /** wholesale: 1С gets two documents — names of the shop and the warehouse; null for retail */
    warehouses?: { shop: string; stock: string } | null;
    items: {
      id: number; productId: number; productName: string; barcode: string | null; quantity: number; price: number; total: number;
      /** all barcodes of the product in 1С — the scanner matches any */
      barcodes?: string[];
      variantName: string | null; variantImageUrl: string | null; imageUrl: string | null;
      stock?: number | null;
      stockByWarehouse?: { name: string; qty: number }[];
      /** wholesale: pieces from the shop / the warehouse (the picker's choice, or the 12-piece rule's `suggested`) */
      warehouseSplit?: { shop: number; stock: number; suggested: boolean; shopQty: number; stockQty: number } | null;
      check: null | { status: string; statuses: string[]; availableQty: number | null; note: string | null; pickerId: number | null; checkedAt: string };
      photos: { id: number; url: string; createdAt: string }[];
      customerChange?: LineChange | null;
      staffChange?: LineChange | null;
    }[];
    removedItems?: RemovedItem[];
  };
};

export const clientName = (c: CustomerShort | null | undefined) => c?.companyName || c?.name || c?.phone || "—";
