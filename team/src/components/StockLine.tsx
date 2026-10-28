import { Text } from "react-native";

/** «Остаток в магазине: 12 шт.» for staff: green, orange when less than needed, red when none. */
export function StockLine({ stock, need, big }: { stock: number | null | undefined; need?: number; big?: boolean }) {
  if (stock === undefined) return null;
  const n = stock ?? 0;
  const short = need != null && n > 0 && n < need;
  const color = n <= 0 ? "#DC2626" : short ? "#EA580C" : "#16A34A";
  return (
    <Text style={{ color, fontWeight: "700", fontSize: big ? 16 : 13, marginTop: 4 }}>
      {n <= 0 ? "Нет в наличии" : `Остаток в магазине: ${n} шт.${short ? ` — меньше, чем нужно (${need})` : ""}`}
    </Text>
  );
}
