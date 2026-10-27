import { Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/kit";
import { imageUrl } from "@/api";
import { date, money, time } from "@/format";
import { useIOS } from "@/ios";
import type { LineChange, RemovedItem } from "@/types";

/** Under an order line: «🛒 Клиент изменил · было 2 шт.» / «🛒 Добавил клиент» (orange) or what staff did (blue, with the name). */
export function ChangePill({ ch, who }: { ch: LineChange; who: "customer" | "staff" }) {
  const was: string[] = [];
  if (ch.oldQuantity != null) was.push(`${ch.oldQuantity} шт.`);
  if (ch.oldPrice != null) was.push(money(ch.oldPrice));
  if (ch.oldVariant) was.push(ch.oldVariant);
  const cust = who === "customer";
  const name = cust ? "Клиент" : ch.actorName ?? "Менеджер";
  const text =
    ch.kind === "added"
      ? `${cust ? "🛒 " : ""}Добавил ${cust ? "клиент" : name}`
      : `${cust ? "🛒 " : ""}${name} изменил${was.length ? ` · было ${was.join(", ")}` : ""}`;
  return (
    <View style={{ alignSelf: "flex-start", marginTop: 6, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: cust ? "rgba(234,88,12,0.13)" : "rgba(37,99,235,0.1)" }}>
      <Text style={{ color: cust ? "#C2410C" : "#2563EB", fontSize: 12.5, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

/** «Удалено из заказа»: lines taken out, who did it and when. */
export function RemovedItems({ items }: { items: RemovedItem[] }) {
  const c = useIOS();
  return (
    <Card>
      <Text style={{ color: "#DC2626", fontWeight: "700", fontSize: 15 }}>Удалено из заказа ({items.length})</Text>
      {items.map((r, i) => {
        const img = imageUrl(r.imagePath, 160);
        return (
          <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "center", marginTop: i ? 10 : 8 }}>
            <View style={{ width: 46, height: 46, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden", opacity: 0.5 }}>
              {img ? <Image source={{ uri: img }} style={{ width: "90%", height: "90%" }} contentFit="contain" /> : <Ionicons name="image-outline" size={18} color="#C7C7CC" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.secondary, textDecorationLine: "line-through" }} numberOfLines={2}>
                {r.productName}
                {r.variantName ? ` · ${r.variantName}` : ""}
              </Text>
              <Text style={{ color: c.secondary, fontSize: 12.5 }}>
                {r.quantity != null ? `${r.quantity} × ${money(r.price ?? 0)} · ` : ""}
                {r.by === "customer" ? "🛒 удалил клиент" : `удалил ${r.actorName ?? "менеджер"}`} · {date(r.at)} {time(r.at)}
              </Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}
