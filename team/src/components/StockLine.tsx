import { Text, View } from "react-native";
import { useWarehouseStock } from "../warehouseStock";
import { WarehousePills } from "./WarehousePills";

export type WarehouseQty = { name: string; qty: number };

/**
 * «Остаток в магазине: 12 шт.» for staff: green, orange when less than needed, red when none.
 * byWarehouse — stock per 1C warehouse («Склад Ленина: 5 · Склад Мира: 2»), when 1C splits it.
 */
export function StockLine({ stock, need, big, byWarehouse: given, productId, pillsOnly }: { stock: number | null | undefined; need?: number; big?: boolean; byWarehouse?: WarehouseQty[] | null; productId?: number; pillsOnly?: boolean }) {
  // not sent with the line (e.g. a product just added from the catalog) → ask the staff endpoint
  const fetched = useWarehouseStock(given === undefined && (stock ?? 0) > 0 ? productId : null);
  const byWarehouse = given ?? fetched;
  if (stock === undefined) return null;
  const n = stock ?? 0;
  const short = need != null && n > 0 && n < need;
  const color = n <= 0 ? "#DC2626" : short ? "#EA580C" : "#16A34A";
  const total = (
    <Text style={{ color, fontWeight: "700", fontSize: big ? 16 : 13, marginTop: 4 }}>
      {n <= 0 ? "Нет в наличии" : `Остаток в магазине: ${n} шт.${short ? ` — меньше, чем нужно (${need})` : ""}`}
    </Text>
  );
  if (!byWarehouse?.length) return total;
  // pillsOnly: the warehouse pills already say how many — no «Остаток в магазине» line above them
  if (pillsOnly) return <WarehousePills list={byWarehouse} />;
  return (
    <View>
      {total}
      <WarehousePills list={byWarehouse} />
    </View>
  );
}
