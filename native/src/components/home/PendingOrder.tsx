import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { orderStatus } from "@/unread";
import { onLiveHint } from "@/live";
import { VIOLET_PINK } from "@/components/TabBar";

/** Orders waiting for the manager's confirmation (status «pending»), newest first. */
export function usePendingOrders(enabled: boolean): number[] {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    if (!enabled) {
      setIds([]);
      return;
    }
    let alive = true;
    const load = (fresh = false) =>
      orderStatus(fresh)
        .then((s) => alive && setIds(s.statuses.filter((o) => o.status === "pending").map((o) => o.id).sort((a, b) => b - a)))
        .catch(() => {});
    load();
    const off = onLiveHint((h) => h.t === "order" && load(true));
    const t = setInterval(() => load(), 30_000);
    return () => {
      alive = false;
      off();
      clearInterval(t);
    };
  }, [enabled]);
  return ids;
}

const open = (id: number) => router.push(`/order/${id}`);

/** a = gradient card, b = slim strip, c = card floating above the tab bar */
export function PendingOrderNote({ ids, look, dark, bottom }: { ids: number[]; look: string; dark: boolean; bottom: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true })]));
    a.start();
    return () => a.stop();
  }, [pulse]);
  if (!ids.length) return null;
  const id = ids[0];
  const title = ids.length > 1 ? `${ids.length} заказа ожидают подтверждения` : `Заказ №${id} ожидает подтверждения`;
  const sub = "Менеджер проверит его и свяжется с вами";

  if (look === "a")
    return (
      <Pressable onPress={() => open(id)} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [{ marginTop: 14, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
        <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.cardA}>
          <View style={st.iconA}>
            <Ionicons name="time" size={26} color="#8b3dff" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.titleA}>{title}</Text>
            <Text style={st.subA}>{sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </LinearGradient>
      </Pressable>
    );
  if (look === "b")
    return (
      <Pressable
        onPress={() => open(id)}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={[st.strip, { backgroundColor: dark ? "rgba(232,44,135,0.18)" : "#FDE7F1", borderColor: dark ? "rgba(232,44,135,0.45)" : "#F9C6DD" }]}
      >
        <Animated.View style={[st.dot, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) }]} />
        <Text style={[st.stripText, { color: dark ? "#FFD3E6" : "#B0105C" }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={st.stripLink}>Открыть</Text>
        <Ionicons name="chevron-forward" size={16} color="#e82c87" />
      </Pressable>
    );
  return (
    <View pointerEvents="box-none" style={[st.floatWrap, { bottom }]}>
      <Pressable onPress={() => open(id)} accessibilityRole="button" accessibilityLabel={title} style={[st.float, { backgroundColor: dark ? "#2A1F38" : "#fff" }]}>
        <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.iconC}>
          <Ionicons name="hourglass-outline" size={20} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[st.titleC, { color: dark ? "#fff" : "#1d1530" }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={{ color: dark ? "#C3AECF" : "#7A6A9A", fontSize: 13 }} numberOfLines={1}>
            {sub}
          </Text>
        </View>
        <View style={st.btnC}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Открыть</Text>
        </View>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  cardA: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 22, padding: 14, boxShadow: "0 8px 22px rgba(139,61,255,0.32)" },
  iconA: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  titleA: { color: "#fff", fontSize: 17, fontWeight: "800" },
  subA: { color: "rgba(255,255,255,0.93)", fontSize: 14 },
  strip: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#e82c87" },
  stripText: { flex: 1, fontSize: 15, fontWeight: "700" },
  stripLink: { color: "#e82c87", fontSize: 14, fontWeight: "700" },
  floatWrap: { position: "absolute", left: 12, right: 12, alignItems: "center", zIndex: 20 },
  float: { width: "100%", maxWidth: 520, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 20, padding: 12, boxShadow: "0 10px 30px rgba(60,20,110,0.22)" },
  iconC: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  titleC: { fontSize: 15.5, fontWeight: "800" },
  btnC: { backgroundColor: "#8b3dff", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
