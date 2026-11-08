import { StyleSheet, Text, View } from "react-native";
import type { WarehouseQty } from "./StockLine";

/** Stock per 1С warehouse as pills: «0. Склад  46» — name and a bold number, readable at a glance. */
export function WarehousePills({ list, small }: { list: WarehouseQty[] | null | undefined; small?: boolean }) {
  if (!list?.length) return null;
  return (
    <View style={[styles.row, small && { marginTop: 5, gap: 4 }]}>
      {list.map((w) => (
        <View key={w.name} style={[styles.pill, small && styles.pillSmall]}>
          <Text style={[styles.name, small && styles.nameSmall]} numberOfLines={1}>
            {w.name}
          </Text>
          <Text style={[styles.qty, small && styles.qtySmall]}>{w.qty}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "100%", backgroundColor: "#EDE9FE", borderColor: "#C4B5FD", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillSmall: { gap: 4, paddingHorizontal: 7, paddingVertical: 2 },
  name: { color: "#4C1D95", fontSize: 13, fontWeight: "600", flexShrink: 1 },
  nameSmall: { fontSize: 11 },
  qty: { color: "#2E1065", fontSize: 14, fontWeight: "800" },
  qtySmall: { fontSize: 12 },
});
