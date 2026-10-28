import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { imageUrl } from "../api";

type Line = { name?: unknown; imagePath?: unknown; kind?: unknown; text?: unknown };
const KIND: Record<string, { fg: string; bg: string }> = {
  added: { fg: "#15803D", bg: "#DCFCE7" },
  removed: { fg: "#B91C1C", bg: "#FEE2E2" },
  changed: { fg: "#C2410C", bg: "#FFEDD5" },
};

/** Chat card «Менеджер / Клиент изменил заказ»: photo, name and what changed for every line. */
export function OrderChangeCard({ data, color }: { data: { title?: unknown; by?: unknown; lines?: unknown }; color: string }) {
  const lines = (Array.isArray(data.lines) ? (data.lines as Line[]) : []).slice(0, 30);
  return (
    <View style={{ width: 250, maxWidth: "100%" }}>
      <Text style={{ color, fontWeight: "700", fontSize: 14, marginBottom: 6 }}>
        {data.by === "customer" ? "🛒 " : "✏️ "}
        {String(data.title ?? "Заказ изменён")}
      </Text>
      {lines.map((l, i) => {
        const kind = String(l.kind ?? "changed");
        const k = KIND[kind] ?? KIND.changed;
        const img = typeof l.imagePath === "string" ? imageUrl(l.imagePath, 160) : null;
        return (
          <View key={i} style={[styles.row, i > 0 && { marginTop: 6 }]}>
            <View style={[styles.photo, kind === "removed" && { opacity: 0.45 }]}>
              {img ? <Image source={{ uri: img }} style={{ width: "90%", height: "90%" }} contentFit="contain" /> : <Ionicons name="image-outline" size={18} color="#C7C7CC" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color, fontSize: 13, lineHeight: 17, textDecorationLine: kind === "removed" ? "line-through" : "none" }} numberOfLines={2}>
                {String(l.name ?? "")}
              </Text>
              <View style={[styles.tag, { backgroundColor: k.bg }]}>
                <Text style={{ color: k.fg, fontSize: 12, fontWeight: "700" }}>{String(l.text ?? "")}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  photo: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  tag: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
});
