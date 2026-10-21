// Same palette as the website (app/globals.css :root)
export const colors = {
  pink: "#e82c87",
  pinkLight: "#ff6aaa",
  pinkSoft: "#fff0f7",
  violet: "#7c3aed",
  violetSoft: "#f3f0ff",
  blue: "#0036b8",
  bg: "#f8f9fc",
  card: "#ffffff",
  text: "#1f2937",
  muted: "#6b7280",
  faint: "#94a3b8",
  slate: "#64748b",
  border: "#e5e7eb",
  soft: "#f4f6fb",
  success: "#16a34a",
  successBg: "#e8fff0",
  warning: "#b45309",
  warningBg: "#fff7e6",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
};

/** var(--gradient): linear-gradient(135deg, #e82c87 0%, #8b3dff 50%, #0036b8 100%) */
export const gradient = ["#e82c87", "#8b3dff", "#0036b8"] as const;
export const gradientStart = { x: 0, y: 0 };
export const gradientEnd = { x: 1, y: 1 };

export const radius = { sm: 12, md: 16, lg: 18, xl: 24, hero: 32 };

/** .product-card / .sidebar-card shadow */
export const shadow = {
  shadowColor: "#111827",
  shadowOpacity: 0.05,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
};

/** .cart-button pink glow */
export const pinkShadow = {
  shadowColor: "#e82c87",
  shadowOpacity: 0.18,
  shadowRadius: 11,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
};
