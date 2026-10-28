/** Order statuses — the same labels, transitions and buttons as the site's admin (lib/orderStatus.ts). */
export const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидание",
  approved: "Подтверждён",
  assembly: "Сборка",
  consultation: "На проверке",
  payment: "Заказ оформлен",
  exported: "Выгружен в 1С",
  cancelled: "Отменён",
};

export const STATUS_ORDER = ["pending", "approved", "assembly", "consultation", "payment", "exported", "cancelled"];

/** buttons on the order card, as on the site */
export const STATUS_ACTIONS: Record<string, { label: string; to: string; kind: "primary" | "soft" | "danger" | "success" }[]> = {
  // «Собрать заказ»: to assembly and straight to the picker's screen (one button, as on the site)
  pending: [
    { label: "Собрать заказ", to: "assembly", kind: "primary" },
    { label: "Отменить заказ", to: "cancelled", kind: "danger" },
  ],
  approved: [
    { label: "Собрать заказ", to: "assembly", kind: "primary" },
    { label: "Отменить", to: "cancelled", kind: "danger" },
  ],
  // only here the manager changes the order; then the customer checks and confirms it
  assembly: [
    { label: "Продолжить сборку", to: "pick", kind: "soft" },
    { label: "Отправить клиенту на проверку", to: "consultation", kind: "primary" },
    { label: "Отменить", to: "cancelled", kind: "danger" },
  ],
  // «Заказ оформлен» appears once the customer confirmed (filtered on the order screen)
  consultation: [
    { label: "Вернуть на сборку", to: "assembly", kind: "soft" },
    { label: "Заказ оформлен", to: "payment", kind: "success" },
    { label: "Отменить", to: "cancelled", kind: "danger" },
  ],
  payment: [{ label: "Отменить", to: "cancelled", kind: "danger" }],
};

/** pill colours: [background light, text light, background dark, text dark] */
const COLORS: Record<string, [string, string, string, string]> = {
  pending: ["#FEF3C7", "#92400E", "rgba(251,191,36,0.18)", "#FCD34D"],
  approved: ["#DCFCE7", "#166534", "rgba(52,211,153,0.16)", "#6EE7B7"],
  assembly: ["#DBEAFE", "#1E40AF", "rgba(96,165,250,0.18)", "#93C5FD"],
  consultation: ["#FFEDD5", "#9A3412", "rgba(251,146,60,0.18)", "#FDBA74"],
  payment: ["#DCFCE7", "#166534", "rgba(52,211,153,0.16)", "#6EE7B7"],
  exported: ["#D1FAE5", "#065F46", "rgba(16,185,129,0.18)", "#6EE7B7"],
  cancelled: ["#FEE2E2", "#991B1B", "rgba(248,113,113,0.18)", "#FCA5A5"],
};

export function statusColors(status: string, dark: boolean) {
  const c = COLORS[status] ?? ["#F1F5F9", "#334155", "rgba(148,163,184,0.18)", "#CBD5E1"];
  return dark ? { bg: c[2], fg: c[3] } : { bg: c[0], fg: c[1] };
}

/** picker item check statuses */
export const CHECK_LABELS: Record<string, string> = {
  ok: "ОК",
  out_of_stock: "Нет в наличии",
  expired: "Просрочен",
  bad_condition: "Плохой вид",
  insufficient_qty: "Не хватает",
};
