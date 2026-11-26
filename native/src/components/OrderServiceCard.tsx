import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIOS } from "../ios";

import type { OrderService } from "../types";

export function OrderServiceCard({ service, onChat, actionLabel = "Написать менеджеру" }: { service: OrderService; onChat: () => void; actionLabel?: string }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const checking = service.phase === "checking", assembling = service.phase === "assembly";
  return <View style={{ backgroundColor: c.cell, borderRadius: 22, padding: 18, marginVertical: 12, gap: 12 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ padding: 9, borderRadius: 13, backgroundColor: dark ? "#193E30" : "#DCFCE7" }}><Ionicons name={assembling ? "cube-outline" : checking ? "person-circle-outline" : "checkmark-done-outline"} size={23} color={dark ? "#86EFAC" : "#15803D"} /></View>
      <Text style={{ fontSize: 19, fontWeight: "700", color: c.label, flex: 1 }}>{service.title}</Text>
    </View>
    <Text style={{ fontSize: 15, lineHeight: 22, color: c.secondary }}>{service.description}</Text>
    {service.timingText ? <View style={{ backgroundColor: dark ? "#392049" : "#F5EDFF", padding: 12, borderRadius: 13, flexDirection: "row", gap: 8, alignItems: "center" }}>
      <Ionicons name={service.overdue ? "alert-circle-outline" : "time-outline"} color={dark ? "#D7B8FF" : "#7C3AED"} size={18} />
      <Text style={{ color: dark ? "#D7B8FF" : "#6D28D9", fontSize: 14, fontWeight: "600", flex: 1 }}>{service.timingText}</Text>
    </View> : null}
    <Pressable accessibilityRole="button" accessibilityLabel="Перейти в чат заказа" onPress={onChat} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, minHeight: 44 }}>
      <Ionicons name="chatbubble-ellipses-outline" size={19} color="#e82c87" /><Text style={{ fontWeight: "600", fontSize: 15, color: "#e82c87" }}>{actionLabel}</Text>
    </Pressable>
  </View>;
}
