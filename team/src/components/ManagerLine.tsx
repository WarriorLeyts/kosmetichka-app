import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useIOS } from "@/ios";

/**
 * The customer's 1С manager — the same line on customer and order cards:
 * violet «👤 Имя [1С]», or orange «⚠ Менеджер не назначен · нет в 1С».
 * `inOneC` undefined = not known (no «нет в 1С» then).
 */
export function ManagerLine({ manager, inOneC }: { manager?: string | null; inOneC?: boolean }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const warn = dark ? "#FDBA74" : "#C2410C";
  const violet = dark ? "#D8B4FE" : "#6B2BD9";
  if (manager)
    return (
      <View style={styles.mgr}>
        <Ionicons name="person" size={14} color={violet} />
        <Text style={[styles.mgrText, { color: violet }]} numberOfLines={1}>
          {manager}
        </Text>
        {inOneC !== false ? (
          <View style={[styles.oneC, { backgroundColor: dark ? "rgba(139,61,255,0.25)" : "#EFE6FD" }]}>
            <Text style={[styles.oneCText, { color: violet }]}>1С</Text>
          </View>
        ) : null}
      </View>
    );
  return (
    <View style={styles.mgr}>
      <Ionicons name="warning" size={14} color={warn} />
      <Text style={[styles.mgrText, { color: warn }]} numberOfLines={1}>
        Менеджер не назначен{inOneC === false ? " · нет в 1С" : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mgr: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  mgrText: { fontSize: 14, fontWeight: "600", flexShrink: 1 },
  oneC: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  oneCText: { fontSize: 11, fontWeight: "800" },
});
