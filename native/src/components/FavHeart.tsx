import { Ionicons } from "@expo/vector-icons";
import { useIOS } from "../ios";
import { BRAND_VIOLET } from "./Wordmark";

/** The favourites heart — the same thin violet heart as in the home header, everywhere. */
export function FavHeart({ size = 24, active, color }: { size?: number; active?: boolean; color?: string }) {
  const c = useIOS();
  const tint = color ?? (c.blurTint === "dark" ? "#E7D9FF" : BRAND_VIOLET);
  return <Ionicons name={active ? "heart" : "heart-outline"} size={size} color={tint} />;
}
