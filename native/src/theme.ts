export const colors = {
  pink: "#e82c87",
  pinkLight: "#ff6aaa",
  violet: "#8b3dff",
  blue: "#0036b8",
  bg: "#f6f7fb",
  card: "#ffffff",
  text: "#1f2937",
  muted: "#6b7280",
  faint: "#9ca3af",
  border: "#e8eaf0",
  soft: "#f1f3f9",
  success: "#059669",
  successBg: "#ecfdf5",
  warning: "#b45309",
  warningBg: "#fffbeb",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
};

export const gradient = [colors.pink, colors.violet, colors.blue] as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 };

export const shadow = {
  shadowColor: "#1f2937",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};
