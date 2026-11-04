import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { orderStatus } from "@/unread";
import { onLiveHint } from "@/live";
import { VIOLET_PINK } from "@/components/TabBar";

/** Orders still in work (not «Выполнен» / «Отменён»), newest first, with their stage; follows live changes. */
type Active = { id: number; status: string; needsConfirm?: boolean };

/** …the ones waiting for the customer's confirmation go first — he has to act on them. */
export function useActiveOrders(enabled: boolean): Active[] {
  const [rows, setRows] = useState<Active[]>([]);
  useEffect(() => {
    if (!enabled) {
      setRows([]);
      return;
    }
    let alive = true;
    const load = (fresh = false) =>
      orderStatus(fresh)
        .then((s) => alive && setRows(s.statuses.filter((o) => STEP_INDEX[o.status] !== undefined && o.status !== "exported").sort((a, b) => Number(!!b.needsConfirm) - Number(!!a.needsConfirm) || b.id - a.id)))
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
  return rows;
}

/** the order's way, as the customer sees it */
const STEPS = [
  { status: "pending", label: "Ожидает" },
  { status: "approved", label: "Принят" },
  { status: "assembly", label: "Сборка" },
  { status: "consultation", label: "Проверка" },
  { status: "payment", label: "Оформлен" },
  { status: "exported", label: "Выполнен" },
];
const STEP_INDEX: Record<string, number> = Object.fromEntries(STEPS.map((x, i) => [x.status, i]));

const TITLES: Record<string, string> = {
  pending: "ожидает подтверждения",
  approved: "подтверждён",
  assembly: "собирается",
  consultation: "на проверке",
  payment: "оформлен",
};
const NOTES: Record<string, string> = {
  pending: "Менеджер проверит его и свяжется с вами",
  approved: "Скоро начнём сборку",
  assembly: "Собираем ваш заказ",
  consultation: "Менеджер согласует заказ с вами",
  payment: "Менеджер свяжется по оплате и доставке",
};

/**
 * Home screen: the newest order in work — one line saying its stage («ожидает подтверждения»,
 * «собирается», «на проверке», «оформлен»). Opens the order. Gone when nothing is in work.
 */
export function PendingOrderNote({ orders }: { orders: Active[] }) {
  if (!orders.length) return null;
  const { id, status, needsConfirm } = orders[0];
  const more = orders.length - 1;
  // the manager collected the order and waits for the customer: say what to do
  const title = needsConfirm ? `Заказ №${id} собран — подтвердите` : `Заказ №${id} ${TITLES[status] ?? ""}`.trim();
  const note = needsConfirm ? "Проверьте состав и нажмите «Подтвердить заказ»" : NOTES[status] ?? "";
  const sub = more > 0 ? `${note} · ещё ${more} в работе` : note;
  return (
    <Pressable
      onPress={() => router.push(`/order/${id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      style={({ pressed }) => [st.wrap, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.card}>
        <View style={st.head}>
          <View style={st.icon}>
            <Ionicons name={needsConfirm ? "hand-left" : status === "pending" ? "time" : status === "assembly" ? "cube" : status === "consultation" ? "chatbubble-ellipses" : "checkmark-circle"} size={24} color="#8b3dff" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.title}>{title}</Text>
            {sub ? <Text style={st.sub}>{sub}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: 14, width: "100%", maxWidth: 720, alignSelf: "center" },
  card: { borderRadius: 22, padding: 14, gap: 14, boxShadow: "0 8px 22px rgba(139,61,255,0.32)" },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  steps: { flexDirection: "row" },
  step: { flex: 1, alignItems: "center", gap: 5 },
  lineRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  line: { flex: 1, height: 2.5, backgroundColor: "#fff" },
  dot: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  dotDone: { backgroundColor: "#fff" },
  dotNow: { backgroundColor: "rgba(255,255,255,0.35)", borderWidth: 2, borderColor: "#fff" },
  dotNext: { borderWidth: 2, borderColor: "rgba(255,255,255,0.45)" },
  nowCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  stepText: { color: "#fff", fontSize: 10.5 },
  icon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.93)", fontSize: 14 },
});
