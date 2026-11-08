import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { tap } from "@/components/ui";
import { useIOS } from "@/ios";
import { VIOLET } from "@/components/kit";
import type { CustomersPage } from "@/types";

const PINK = "#e82c87";

/** status tiles: label, dot, line under the number; `urgent` — a decision is waiting (coloured border) */
const TILES: { value: string; label: string; dot: string; sub: (n: number) => string; urgent?: boolean }[] = [
  // every request: sign-ups and опт / крупный опт requests of existing customers
  { value: "pending", label: "Ожидают", dot: "#F59E0B", sub: (n) => (n ? "нужно проверить" : "заявок нет"), urgent: true },
  { value: "approved", label: "Подтверждённые", dot: "#22C55E", sub: () => "работают с нами" },
  { value: "blocked", label: "Заблокированные", dot: "#EF4444", sub: () => "не могут войти" },
  { value: "stale", label: "Неактуальные", dot: "#94A3B8", sub: () => "передумали" },
];

const TYPES = [
  { value: "", label: "Все типы", key: "all" },
  { value: "retail", label: "Розница", key: "retail" },
  { value: "wholesale", label: "Опт", key: "wholesale" },
  { value: "big_wholesale", label: "Крупный опт", key: "big_wholesale" },
] as const;

/**
 * Клиенты: «Все клиенты» across the whole width, then a tile per status (count) 2 in a row, then the
 * price type switch (count).
 */
export function CustomerTiles({
  counts,
  status,
  setStatus,
  type,
  setType,
  desktop,
  showTypes = true,
}: {
  counts: CustomersPage["counts"] | undefined;
  status: string;
  setStatus: (s: string) => void;
  type: string;
  setType: (t: string) => void;
  desktop: boolean;
  /** the price-type switch (hidden for the retail account: all its customers are retail) */
  showTypes?: boolean;
}) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [w, setW] = useState(0);
  const cols = 2;
  const gap = desktop ? 10 : 8;
  const cell = w ? (w - gap * (cols - 1)) / cols : 0;
  const small = !desktop;
  const box = { backgroundColor: dark ? "#2B193D" : "#FFFFFF", borderColor: dark ? "rgba(200,160,255,0.2)" : "#ECE6F4" };
  const pick = (s: string) => {
    tap();
    setStatus(s === status ? "" : s);
  };
  const n = (v: number | undefined) => (counts ? String(v ?? 0) : "–");

  return (
    <View>
      <View style={[st.grid, { gap }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w ? (
          <>
            <Pressable onPress={() => pick("")} accessibilityRole="button" accessibilityState={{ selected: status === "" }} style={{ width: w }}>
              {status === "" ? (
                <LinearGradient colors={[VIOLET, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.tile, small && st.tileSmall, st.gradTile, { padding: small ? 12 : 15 }]}>
                  <Text style={[st.label, small && st.labelSmall, { color: "#fff" }]}>Все клиенты</Text>
                  <Text style={[st.count, small && st.countSmall, { color: "#fff" }]}>{n(counts?.all)}</Text>
                  <Text style={[st.sub, small && st.subSmall, { color: "rgba(255,255,255,0.88)" }]} numberOfLines={1}>
                    {counts ? `+${counts.newWeek} за неделю` : " "}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={[st.tile, small && st.tileSmall, box]}>
                  <Text style={[st.label, small && st.labelSmall, { color: c.label }]}>Все клиенты</Text>
                  <Text style={[st.count, small && st.countSmall, { color: c.label }]}>{n(counts?.all)}</Text>
                  <Text style={[st.sub, small && st.subSmall, { color: c.secondary }]} numberOfLines={1}>
                    {counts ? `+${counts.newWeek} за неделю` : " "}
                  </Text>
                </View>
              )}
            </Pressable>
            {TILES.map((t) => {
              const on = status === t.value;
              const value = counts?.byStatus[t.value] ?? 0;
              const hot = t.urgent && value > 0;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => pick(t.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[
                    st.tile,
                    small && st.tileSmall,
                    box,
                    { width: cell },
                    on && { borderColor: VIOLET, borderWidth: 2, backgroundColor: dark ? "rgba(139,61,255,0.2)" : "#F6F0FF" },
                  ]}
                >
                  <View style={st.labelRow}>
                    <View style={[st.dot, { backgroundColor: t.dot }]} />
                    <Text style={[st.label, small && st.labelSmall, { color: on ? VIOLET : c.label }]} numberOfLines={1}>
                      {t.label}
                    </Text>
                  </View>
                  <Text style={[st.count, small && st.countSmall, { color: c.label }]}>{n(value)}</Text>
                  <Text
                    style={[st.sub, small && st.subSmall, { color: hot && t.value !== "pending" ? (dark ? "#D8B4FE" : "#7E22CE") : c.secondary }, hot && { fontWeight: "700" }]}
                    numberOfLines={1}
                  >
                    {counts ? t.sub(value) : " "}
                  </Text>
                </Pressable>
              );
            })}
          </>
        ) : null}
      </View>

      {showTypes ? (
      <View style={[st.seg, { backgroundColor: dark ? "rgba(255,255,255,0.06)" : "#FFFFFF", borderColor: dark ? "rgba(200,160,255,0.2)" : "#ECE6F4" }]}>
        {TYPES.map((t) => {
          const on = type === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => {
                tap();
                setType(t.value);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[st.segItem, on && { backgroundColor: VIOLET }]}
            >
              {small ? (
                <>
                  <Text style={[st.segText, { fontSize: 13.5, color: on ? "#fff" : c.label }]} numberOfLines={1}>
                    {t.value === "" ? "Все" : t.value === "big_wholesale" ? "Кр. опт" : t.label}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: on ? "rgba(255,255,255,0.85)" : c.secondary }}>{counts ? counts.types[t.key] ?? 0 : " "}</Text>
                </>
              ) : (
                <Text style={[st.segText, { color: on ? "#fff" : c.label }]} numberOfLines={1}>
                  {t.label}
                  {counts ? <Text style={{ opacity: 0.7 }}>{`  ${counts.types[t.key] ?? 0}`}</Text> : null}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  tile: { borderWidth: 1, borderRadius: 18, padding: 14, overflow: "hidden" },
  tileSmall: { borderRadius: 16, padding: 11 },
  /** no border on the gradient: a transparent one showed the gradient repeated as thin lines at the edges */
  gradTile: { borderWidth: 0, margin: 0 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  label: { fontSize: 14.5, fontWeight: "600", flexShrink: 1 },
  labelSmall: { fontSize: 13 },
  count: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  countSmall: { fontSize: 22, marginTop: 2 },
  sub: { fontSize: 13 },
  subSmall: { fontSize: 11.5 },
  seg: { flexDirection: "row", borderWidth: 1, borderRadius: 16, padding: 4, gap: 4, marginBottom: 10 },
  segItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 9, paddingHorizontal: 4, borderRadius: 12 },
  segText: { fontSize: 15, fontWeight: "600" },
});
