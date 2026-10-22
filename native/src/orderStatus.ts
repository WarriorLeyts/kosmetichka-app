import { Ionicons } from "@expo/vector-icons";
import { STATUS_COLORS, STATUS_LABELS } from "./types";

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Status icon + colours for the iOS order screens.
 * Icons follow the existing STATUS_ICONS meaning (⏳ ✅ 📦 💬 💳 🎉 ❌) as outline icons.
 * Waiting — pink, consultation — violet (brand); the rest keep the project's STATUS_COLORS.
 */
const ICONS: Record<string, IconName> = {
  pending: "time-outline",
  approved: "checkmark-circle-outline",
  assembly: "cube-outline",
  consultation: "chatbubble-ellipses-outline",
  payment: "card-outline",
  exported: "sparkles-outline",
  cancelled: "close-circle-outline",
};

export function statusLook(status: string, dark = false) {
  const label = STATUS_LABELS[status] ?? status;
  const icon = ICONS[status] ?? "receipt-outline";
  if (status === "pending") return { label, icon, fg: "#e82c87", bg: dark ? "rgba(232,44,135,0.18)" : "rgba(232,44,135,0.09)" };
  if (status === "consultation") return { label, icon, fg: "#8b3dff", bg: dark ? "rgba(139,61,255,0.22)" : "rgba(139,61,255,0.1)" };
  const c = STATUS_COLORS[status] ?? { fg: "#64748b", bg: "#f1f5f9" };
  return { label, icon, fg: dark ? "#E5E5EA" : c.fg, bg: dark ? "#2C2C2E" : c.bg };
}
