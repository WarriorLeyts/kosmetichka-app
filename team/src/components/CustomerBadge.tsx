import { StyleSheet, Text, View } from "react-native";
import type { CustomerRow } from "../types";

export function CustomerBadge({ c: x }: { c: Pick<CustomerRow, "isActive" | "isApproved" | "requestStaleAt"> }) {
  const stale = x.isActive && !x.isApproved && !!x.requestStaleAt;
  const label = !x.isActive ? "Заблокирован" : x.isApproved ? "Подтверждён" : stale ? "Неактуально" : "Ожидает";
  const col = !x.isActive ? ["#FEE2E2", "#991B1B"] : x.isApproved ? ["#DCFCE7", "#166534"] : stale ? ["#E2E8F0", "#475569"] : ["#FEF3C7", "#92400E"];
  return (
    <View style={[styles.badge, { backgroundColor: col[0] }]}>
      <Text style={{ color: col[1], fontSize: 12.5, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
