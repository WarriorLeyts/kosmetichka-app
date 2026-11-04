import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { orderStatus } from "@/unread";
import { onLiveHint } from "@/live";
import { VIOLET_PINK } from "@/components/TabBar";

/** Orders waiting for the manager's confirmation (status «pending»), newest first; follows live changes. */
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
    void load();
    const off = onLiveHint((h) => {
      if (h.t === "order") void load(true);
    });
    const t = setInterval(() => void load(), 30_000);
    return () => {
      alive = false;
      off();
      clearInterval(t);
    };
  }, [enabled]);
  return ids;
}

const plural = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "заказ ожидает" : "заказа ожидают");

/** Home screen: a bright card while orders wait for the manager's confirmation; opens the newest one. */
export function PendingOrderNote({ ids }: { ids: number[] }) {
  if (!ids.length) return null;
  const id = ids[0];
  const many = ids.length > 1;
  const title = many ? `${ids.length} ${plural(ids.length)} подтверждения` : `Заказ №${id} ожидает подтверждения`;
  const sub = many ? "Менеджер проверит их и свяжется с вами" : "Менеджер проверит его и свяжется с вами";
  return (
    <Pressable
      onPress={() => router.push(`/order/${id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      style={({ pressed }) => [st.wrap, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.card}>
        <View style={st.icon}>
          <Ionicons name="time" size={26} color="#8b3dff" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={st.title}>{title}</Text>
          <Text style={st.sub}>{sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </LinearGradient>
    </Pressable>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: 14, width: "100%", maxWidth: 720, alignSelf: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 22, padding: 14, boxShadow: "0 8px 22px rgba(139,61,255,0.32)" },
  icon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.93)", fontSize: 14 },
});
