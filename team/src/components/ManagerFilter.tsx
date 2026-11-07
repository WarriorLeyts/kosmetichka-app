import { Pressable, StyleSheet, Text, View } from "react-native";
import { tap } from "@/components/ui";
import { useIOS } from "@/ios";
import { VIOLET } from "@/components/kit";

const OPTIONS = [
  { value: "", key: "all", label: "Все опт" },
  { value: "linked", key: "linked", label: "С менеджером" },
  { value: "nomanager", key: "nomanager", label: "Без менеджера" },
] as const;

/** Admin: wholesale customers by their 1С manager — all / with one / nobody looks after them yet. */
export function ManagerFilter({ value, onChange, counts }: { value: string; onChange: (v: string) => void; counts: { all: number; linked: number; nomanager: number } | undefined }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const warn = dark ? "#FDBA74" : "#C2410C";
  return (
    <View style={[st.seg, { backgroundColor: dark ? "rgba(255,255,255,0.06)" : "#FFFFFF", borderColor: dark ? "rgba(200,160,255,0.2)" : "#ECE6F4" }]}>
      {OPTIONS.map((o) => {
        const on = value === o.value;
        const n = counts?.[o.key];
        const alert = o.key === "nomanager" && !!n && !on;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[st.item, o.key !== "all" && { flexGrow: 1.35 }, on && { backgroundColor: VIOLET }]}
          >
            <Text style={[st.text, { color: on ? "#fff" : alert ? warn : c.label }]} numberOfLines={1}>
              {o.label}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: on ? "rgba(255,255,255,0.85)" : alert ? warn : c.secondary }}>{n ?? " "}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  seg: { flexDirection: "row", borderWidth: 1, borderRadius: 16, padding: 4, gap: 4, marginBottom: 10 },
  item: { flexGrow: 1, flexBasis: 0, alignItems: "center", justifyContent: "center", paddingVertical: 8, paddingHorizontal: 4, borderRadius: 12 },
  text: { fontSize: 13.5, fontWeight: "600" },
});
