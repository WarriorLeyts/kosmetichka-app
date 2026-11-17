import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAuth } from "../store/auth";
import { useWaitlistStore } from "../store/waitlist";
import { VIOLET_PINK } from "./TabBar";
import { tap } from "./ui";

/** Same waitlist as the detail screen, directly in catalog / home / favorites cards. */
export function RestockButton({ productId }: { productId: number }) {
  const customerId = useAuth((s) => s.customer?.id);
  const waiting = useWaitlistStore((s) => s.ids.includes(productId));
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const title = waiting ? "Вы в листе ожидания" : "Сообщить о поступлении";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title}
      accessibilityHint={waiting ? "Отменить уведомление о поступлении" : "Подписаться на уведомление о поступлении товара"}
      accessibilityState={{ busy, selected: waiting, disabled: busy }} disabled={busy}
      onPress={async (event) => {
        event.stopPropagation();
        tap();
        if (!customerId) { router.push("/login"); return; }
        if (locked.current) return;
        locked.current = true;
        setBusy(true);
        try {
          const added = await useWaitlistStore.getState().toggle(productId);
          if (useAuth.getState().customer?.id !== customerId) return;
          if (added) Alert.alert("Готово", "Сообщим, когда товар появится в наличии.");
        } catch (e) {
          Alert.alert("Не удалось сохранить подписку", e instanceof Error ? e.message : "Проверьте интернет и попробуйте ещё раз.");
        } finally { locked.current = false; setBusy(false); }
      }}
      style={({ pressed }) => ({ opacity: busy || pressed ? 0.8 : 1 })}>
      <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
        {busy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name={waiting ? "notifications" : "notifications-outline"} size={16} color="#fff" />}
        <Text style={styles.text} numberOfLines={2}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: { minHeight: 44, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 10 },
  text: { color: "#fff", fontSize: 12, fontWeight: "600", textAlign: "center", flexShrink: 1 },
});
