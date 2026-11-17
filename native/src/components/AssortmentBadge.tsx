import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { plural } from "../format";
import type { Product } from "../types";

export function AssortmentBadge({ product }: { product: Product }) {
  if (!product.assortmentEnabled) return null;
  const count = product.variants?.length ?? 0;
  return <View style={{ alignSelf: "stretch", backgroundColor: "#F2E5FF", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7, marginBottom: 7, flexDirection: "row", alignItems: "center", gap: 5 }}>
    <Ionicons name="layers-outline" size={15} color="#7131B6" />
    <Text style={{ flex: 1, color: "#7131B6", fontSize: 12, fontWeight: "700" }}>
      {count ? `Ассортимент · ${count} ${plural(count, "вид", "вида", "видов")}` : "Ассортимент · выбор видов"}
    </Text>
  </View>;
}
