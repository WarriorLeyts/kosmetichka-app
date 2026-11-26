import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIOS } from "@/ios";
import { VIOLET } from "./kit";

const OPTIONS = [
  { value: "", label: "Все" },
  { value: "retail", label: "Розничные" },
  { value: "wholesale", label: "Оптовые" },
  { value: "big_wholesale", label: "Крупнооптовые" },
] as const;
export type OrderCustomerType = (typeof OPTIONS)[number]["value"];

/** Anchored menu in a Modal: the order list must not clip the dropdown. */
export function OrderTypeFilter({ value, onChange }: { value: OrderCustomerType; onChange: (v: OrderCustomerType) => void }) {
  const c = useIOS();
  const anchor = useRef<View>(null);
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const { width, height } = useWindowDimensions();
  useEffect(() => setPosition(null), [width, height]);
  const close = () => setPosition(null);
  const open = () => anchor.current?.measureInWindow((x, y, w, h) => {
    setPosition({ left: Math.max(8, Math.min(x, width - w - 8)), top: Math.max(8, Math.min(y + h + 6, height - 216)), width: Math.min(w, width - 16) });
  });
  return (
    <View style={styles.wrap}>
      <View ref={anchor} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Тип клиента: ${OPTIONS.find((o) => o.value === value)?.label}`}
          accessibilityState={{ expanded: !!position }}
          onPress={open}
          style={[styles.button, { backgroundColor: c.cell, borderColor: c.blurTint === "dark" ? "transparent" : "#E9E4F5" }]}
        >
          <Text style={[styles.label, { color: c.label }]} numberOfLines={1}>
            <Text style={{ color: c.secondary }}>Тип клиента: </Text>{OPTIONS.find((o) => o.value === value)?.label}
          </Text>
          <Ionicons name="chevron-down" size={18} color={VIOLET} />
        </Pressable>
      </View>
      <Modal visible={!!position} transparent animationType="none" onRequestClose={close}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Закрыть список типов клиентов" />
        {position ? (
          <View accessibilityViewIsModal style={[styles.menu, position, { backgroundColor: c.cell, borderColor: c.blurTint === "dark" ? "transparent" : c.separator }]}>
            {OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: o.value === value }}
                onPress={() => { close(); onChange(o.value); }}
                style={({ pressed }) => [styles.option, (pressed || o.value === value) && { backgroundColor: c.blurTint === "dark" ? "#432460" : "#F3EBFF" }]}
              >
                <Text style={[styles.label, { color: o.value === value ? VIOLET : c.label, fontWeight: o.value === value ? "600" : "400" }]} numberOfLines={1}>{o.label}</Text>
                {o.value === value ? <Ionicons name="checkmark" size={20} color={VIOLET} /> : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  button: { minHeight: 44, paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  label: { fontSize: 15, flexShrink: 1 },
  menu: { position: "absolute", borderWidth: 1, borderRadius: 14, padding: 6, boxShadow: "0 8px 24px rgba(61,19,92,0.15)" },
  option: { minHeight: 48, paddingHorizontal: 12, borderRadius: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
});
