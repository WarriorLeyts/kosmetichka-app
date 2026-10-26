/** Data shapes of the site's staff API (kosmetichka-b2b app/api/team/README.md). */
export type CustomerShort = { name: string | null; companyName: string | null; phone: string | null };
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
};
export type OrdersPage = Paging & {
  orders: OrderListItem[];
  filters: { date: string; businessToday: string; customer: string; status: string };
  todayCounts: { total: number; byStatus: StatusCount[] };
};

export type ItemCheck = {
  status: string; statuses: string[]; hasIssues: boolean; note: string | null; availableQty: number | null;
  picker: { name: string } | null; updatedAt: string;
};
export type OrderItem = {
  id: number; productId: number; productName: string; barcode: string | null; quantity: number; price: number; total: number;
  variantName: string | null; variantImageUrl: string | null; imagePath: string | null; imageUrl: string | null;
  check: ItemCheck | null; photos: { id: number; url: string; createdAt: string }[];
};
export type StaffMsg = { id: number; text: string; isFromPicker: boolean; userId: number | null; userName: string | null; userRole?: string | null; createdAt: string };
export type OrderDetail = {
  order: {
    id: number; status: string; statusLabel: string; total: number; comment: string | null; customerConfirmed: boolean;
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
    customer: { id: number; companyName: string | null; name: string | null; phone: string | null; email: string | null; city: string | null; inn: string | null; manager: string | null; priceType: string };
    pickerId: number | null; picker: { id: number; name: string } | null;
    items: OrderItem[];
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
  /** customer's request for a wholesale price type */
  roleRequest?: string | null; roleRequestStatus?: string | null;
};
export type CustomersPage = Paging & { customers: CustomerRow[]; filters: { q: string; status: string } };
export type CustomerDetail = {
  customer: CustomerRow & {
    address: string | null; oneCId: string | null; role: string; ordersCount: number; updatedAt: string;
    wholesaleAccess?: string | null; roleRequestLabel?: string | null; roleRequestedAt?: string | null;
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

export type StaffUser = { id: number; name: string; login: string; role: string; roleLabel: string; createdAt: string; isSelf: boolean };
export type StaffUserDetail = {
  user: StaffUser & { updatedAt: string; assignedOrdersCount: number; canDelete: boolean };
  roleOptions: { value: "admin" | "manager" | "picker"; label: string }[];
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
    items: {
      id: number; productId: number; productName: string; barcode: string | null; quantity: number; price: number; total: number;
      variantName: string | null; variantImageUrl: string | null; imageUrl: string | null;
      check: null | { status: string; statuses: string[]; availableQty: number | null; note: string | null; pickerId: number | null; checkedAt: string };
      photos: { id: number; url: string; createdAt: string }[];
    }[];
  };
};

export const clientName = (c: CustomerShort | null | undefined) => c?.companyName || c?.name || c?.phone || "—";
