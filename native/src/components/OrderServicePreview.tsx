import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIOS } from "../ios";

export type ServiceCarePreview = { phase: "queued" | "checking" | "assembly"; managerName: string | null; expectedAt: string };

/** Only mounted by the isolated website preview build, with a fictional order. */
export function OrderServicePreview({ care, onChat }: { care: ServiceCarePreview; onChat: () => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const checking = care.phase === "checking", assembling = care.phase === "assembly";
  const expected = new Date(care.expectedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });
  return <View style={{ backgroundColor: c.cell, borderRadius: 22, padding: 18, marginVertical: 12, gap: 12 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ padding: 9, borderRadius: 13, backgroundColor: dark ? "#193E30" : "#DCFCE7" }}><Ionicons name={assembling ? "cube-outline" : checking ? "person-circle-outline" : "checkmark-done-outline"} size={23} color={dark ? "#86EFAC" : "#15803D"} /></View>
      <Text style={{ fontSize: 19, fontWeight: "700", color: c.label, flex: 1 }}>{assembling ? "Собираем ваш заказ" : checking ? "Ваш заказ уже в работе" : "Мы получили ваш заказ"}</Text>
    </View>
    <Text style={{ fontSize: 15, lineHeight: 22, color: c.secondary }}>{assembling ? "Передали товары на сборку. Напишем здесь, когда заказ будет готов к получению или отправке." : checking ? `Менеджер ${care.managerName || "магазина"} проверяет наличие и сумму. Если понадобится замена, сначала согласуем её с вами.` : "Заказ в очереди на проверку. Менеджер проверит наличие и напишет вам в чате. Повторно оформлять заказ не нужно."}</Text>
    {!assembling ? <View style={{ backgroundColor: dark ? "#392049" : "#F5EDFF", padding: 12, borderRadius: 13, flexDirection: "row", gap: 8, alignItems: "center" }}>
      <Ionicons name="time-outline" color={dark ? "#D7B8FF" : "#7C3AED"} size={18} />
      <Text style={{ color: dark ? "#D7B8FF" : "#6D28D9", fontSize: 14, fontWeight: "600", flex: 1 }}>Проверим заказ до {expected} · в течение часа</Text>
    </View> : null}
    <Pressable accessibilityRole="button" accessibilityLabel="Перейти в чат заказа" onPress={onChat} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, minHeight: 44 }}>
      <Ionicons name="chatbubble-ellipses-outline" size={19} color="#e82c87" /><Text style={{ fontWeight: "600", fontSize: 15, color: "#e82c87" }}>Написать менеджеру</Text>
    </Pressable>
  </View>;
}
