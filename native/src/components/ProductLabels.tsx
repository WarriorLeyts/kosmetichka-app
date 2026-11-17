import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Label = { text: string; icon: keyof typeof Ionicons.glyphMap; color: string; background: string; border: string };
const LABELS: Record<string, Label> = {
  new: { text: "Новинка", icon: "sparkles-outline", color: "#7130bb", background: "#f0e7ff", border: "#d9c5f6" },
  back: { text: "Снова в наличии", icon: "refresh-outline", color: "#13743d", background: "#e4f7eb", border: "#b9e4c9" },
  promotion: { text: "Акция", icon: "pricetag-outline", color: "#b61b66", background: "#ffebf4", border: "#f4bfd8" },
  hit: { text: "Хит", icon: "flame-outline", color: "#b61b66", background: "#ffebf4", border: "#f4bfd8" },
};

/** Soft status pills on a photo; promotions may accompany one arrival status. */
export function ProductLabels({ labels, big = false, inline = false, promotion = false, reserveFavorite = true }: {
  labels?: string[] | null; big?: boolean; inline?: boolean; promotion?: boolean; reserveFavorite?: boolean;
}) {
  const list = [...new Set([...(promotion ? ["promotion"] : []), ...(labels ?? [])])]
    .filter((key) => LABELS[key] && !(key === "back" && labels?.includes("new")));
  if (!list.length) return null;
  return (
    <View style={[styles.wrap, { right: reserveFavorite ? 40 : 8 }, big && { top: 12, left: 12 }, inline && { position: "relative", top: 0, left: 0, right: undefined, marginTop: 10 }]} pointerEvents="none">
      {list.map((key) => {
        const label = LABELS[key];
        return (
          <View key={key} style={[styles.pill, { backgroundColor: label.background, borderColor: label.border }, big && { paddingHorizontal: 10, paddingVertical: 5 }]}>
            <Ionicons name={label.icon} size={big ? 14 : 12} color={label.color} accessible={false} />
            <Text style={[styles.text, { color: label.color }, big && { fontSize: 13 }]}>{label.text}</Text>
          </View>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 8, left: 8, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, maxWidth: "100%" },
  text: { fontSize: 11, fontWeight: "600", flexShrink: 1 },
});
