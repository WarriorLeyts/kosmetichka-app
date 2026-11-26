import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAuth } from "../store/auth";
import { useWaitlistStore } from "../store/waitlist";
import { VIOLET_PINK } from "./TabBar";
import { tap } from "./ui";

export function RestockButton({ productId }: { productId: number }) {
  const customerId = useAuth(s => s.customer?.id);
  const waiting = useWaitlistStore(s => s.ids.includes(productId));
  const quantity = useWaitlistStore(s => s.quantities[productId]);
  const title = waiting ? quantity ? `В листе ожидания: ${quantity} шт.` : "Вы в листе ожидания" : "Сообщить о поступлении";
  return <Pressable accessibilityRole="button" accessibilityLabel={title}
    accessibilityHint="Указать нужное количество. Это не бронь: товар не резервируется."
    onPress={event => { event.stopPropagation(); tap(); router.push(customerId ? `/wait-request?id=${productId}` : "/login"); }}>
    <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
      <Ionicons name={waiting ? "notifications" : "notifications-outline"} size={16} color="#fff" />
      <Text style={styles.text} numberOfLines={2}>{title}</Text>
    </LinearGradient>
  </Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: 44, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 10 }, text: { color: "#fff", fontSize: 12, fontWeight: "600", textAlign: "center", flexShrink: 1 } });
