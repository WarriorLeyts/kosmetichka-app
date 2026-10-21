import type { Ionicons } from "@expo/vector-icons";

type IconName = keyof typeof Ionicons.glyphMap;

/** Outline icon for a category tile, picked by keywords in its name. */
export function categoryIcon(name: string): IconName {
  const n = name.toLowerCase();
  if (n.includes("парфюм") || n.includes("аромат") || n.includes("туалетн")) return "sparkles-outline";
  if (n.includes("лиц") || n.includes("кож")) return "water-outline";
  if (n.includes("декоратив") || n.includes("макияж")) return "color-palette-outline";
  if (n.includes("волос")) return "cut-outline";
  if (n.includes("тел")) return "body-outline";
  if (n.includes("рук") || n.includes("ног") || n.includes("ногт")) return "hand-left-outline";
  if (n.includes("рта") || n.includes("зуб")) return "happy-outline";
  if (n.includes("подар") || n.includes("набор")) return "gift-outline";
  if (n.includes("депиляц") || n.includes("бритв")) return "flash-outline";
  if (n.includes("быт") || n.includes("хими")) return "flask-outline";
  if (n.includes("аксессуар")) return "diamond-outline";
  if (n.includes("дет")) return "balloon-outline";
  if (n.includes("муж")) return "man-outline";
  return "leaf-outline";
}
