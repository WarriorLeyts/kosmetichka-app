import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { tap } from "@/components/ui";
import { useIOS } from "@/ios";
import { money } from "@/format";
import { VIOLET } from "@/components/kit";
import type { OrdersPage } from "@/types";

const PINK = "#e82c87";
const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** "YYYY-MM-DD" ± days (noon UTC, so no time-zone shifts) */
export function shiftDay(day: string, by: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}
const dayLabel = (day: string) => {
  const d = new Date(`${day}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
const ddmm = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;

/**
 * ‹ Ср, 4 ноября › · Все даты. `day`: "YYYY-MM-DD", "" — all dates, null — the current working day.
 * A working day runs from 19:00 of the day before (as on the site).
 */
export function DayNav({ day, today, onChange }: { day: string | null; today: string | undefined; onChange: (d: string | null) => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const all = day === "";
  const shown = day || today;
  const atToday = !all && (day === null || day === today);
  const box = { backgroundColor: dark ? "#2B193D" : "#FFFFFF", borderColor: dark ? "rgba(200,160,255,0.2)" : "#E9E4F5" };
  const arrowBg = dark ? "rgba(139,61,255,0.25)" : "#F3EDFC";
  const go = (by: number) => {
    if (!today) return;
    tap();
    const next = shiftDay(all ? today : shown!, all ? 0 : by);
    onChange(next >= today ? null : next);
  };
  return (
    <View style={st.navRow}>
      <View style={[st.nav, box, all && { opacity: 0.75 }]}>
        <Pressable onPress={() => go(-1)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Предыдущий день" style={[st.arrow, { backgroundColor: arrowBg }]}>
          <Ionicons name="chevron-back" size={18} color={VIOLET} />
        </Pressable>
        <Pressable onPress={() => all && go(0)} accessibilityRole="button" style={st.dayBox}>
          <Text style={[st.day, { color: c.label }]} numberOfLines={1}>
            {all ? "Выбрать день" : shown ? (atToday ? `Сегодня, ${dayLabel(shown).split(", ")[1]}` : dayLabel(shown)) : "Сегодня"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => !atToday && go(1)}
          disabled={atToday}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Следующий день"
          style={[st.arrow, { backgroundColor: arrowBg, opacity: atToday ? 0.35 : 1 }]}
        >
          <Ionicons name="chevron-forward" size={18} color={VIOLET} />
        </Pressable>
      </View>
      <Pressable
        onPress={() => {
          tap();
          onChange(all ? null : "");
        }}
        accessibilityRole="button"
        style={[st.allBtn, box, all && { backgroundColor: VIOLET, borderColor: VIOLET }]}
      >
        <Text style={[st.allText, { color: all ? "#fff" : c.label }]}>Все даты</Text>
      </Pressable>
      {!all && shown ? <Text style={[st.hint, { color: c.secondary }]}>рабочий день с 19:00 {ddmm(shiftDay(shown, -1))}</Text> : null}
    </View>
  );
}

const DOT: Record<string, string> = {
  pending: "#F59E0B",
  assembly: "#3B82F6",
  consultation: "#F97316",
  payment: "#22C55E",
  exported: "#10B981",
  cancelled: "#EF4444",
};
const SHORT: Record<string, string> = { payment: "Оформлен", exported: "В 1С" };
const TILES = ["pending", "assembly", "consultation", "payment", "exported", "cancelled"];

/**
 * Summary tiles: «Все заказы» + one per stage, count and sum; a tap filters the list.
 * Phone: 3 in a row, «Все» across the top. Computer: 4 in a row, «Все» takes two.
 */
export function StatusTiles({ counts, status, onChange, desktop }: { counts: OrdersPage["counts"] | undefined; status: string; onChange: (s: string) => void; desktop: boolean }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [w, setW] = useState(0);
  const cols = desktop ? 4 : 3;
  const gap = desktop ? 10 : 8;
  const cell = w ? (w - gap * (cols - 1)) / cols : 0;
  const allWidth = desktop ? cell * 2 + gap : w;
  const by = (s: string) => counts?.byStatus.find((x) => x.status === s);
  const pick = (s: string) => {
    tap();
    onChange(s === status ? "" : s);
  };
  const small = !desktop;

  return (
    <View style={[st.grid, { gap }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? (
        <>
          <Pressable onPress={() => pick("")} accessibilityRole="button" accessibilityState={{ selected: status === "" }} style={{ width: allWidth }}>
            {status === "" ? (
              <LinearGradient colors={[VIOLET, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.tile, small && st.tileSmall, st.allTile, { borderColor: "transparent" }]}>
                <AllContent counts={counts} small={small} on />
              </LinearGradient>
            ) : (
              <View style={[st.tile, small && st.tileSmall, st.allTile, tileBox(dark)]}>
                <AllContent counts={counts} small={small} />
              </View>
            )}
          </Pressable>
          {TILES.map((s) => {
            const x = by(s);
            const on = status === s;
            const confirmed = s === "consultation" && (counts?.confirmed ?? 0) > 0;
            return (
              <Pressable
                key={s}
                onPress={() => pick(s)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[st.tile, small && st.tileSmall, tileBox(dark), { width: cell }, on && { borderColor: VIOLET, borderWidth: 2, backgroundColor: dark ? "rgba(139,61,255,0.2)" : "#F6F0FF" }]}
              >
                <View style={st.labelRow}>
                  <View style={[st.dot, { backgroundColor: DOT[s] }]} />
                  <Text style={[st.label, small && st.labelSmall, { color: on ? VIOLET : c.label }]} numberOfLines={1}>
                    {(small && s === "consultation" ? "Проверка" : SHORT[s]) ?? x?.label ?? s}
                  </Text>
                </View>
                <Text style={[st.count, small && st.countSmall, { color: c.label }]}>{counts ? x?.count ?? 0 : "–"}</Text>
                <Text style={[st.sub, small && st.subSmall, { color: confirmed ? "#16A34A" : c.secondary }, confirmed && { fontWeight: "700" }]} numberOfLines={1}>
                  {confirmed ? `${counts!.confirmed} подтвердил` : counts ? money(x?.sum ?? 0) : " "}
                </Text>
              </Pressable>
            );
          })}
        </>
      ) : null}
    </View>
  );
}

function AllContent({ counts, small, on }: { counts: OrdersPage["counts"] | undefined; small: boolean; on?: boolean }) {
  const c = useIOS();
  const fg = on ? "#fff" : c.label;
  return (
    <>
      <Text style={[st.label, small && st.labelSmall, { color: fg }]}>Все заказы</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Text style={[st.count, small && st.countSmall, { color: fg }]}>{counts ? counts.total : "–"}</Text>
        <Text style={[st.sub, small && st.subSmall, { color: on ? "rgba(255,255,255,0.88)" : c.secondary }]}>{counts ? money(counts.sum) : ""}</Text>
      </View>
    </>
  );
}

const tileBox = (dark: boolean) => ({ backgroundColor: dark ? "#2B193D" : "#FFFFFF", borderColor: dark ? "rgba(200,160,255,0.2)" : "#ECE6F4" });

const st = StyleSheet.create({
  navRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  nav: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 24, padding: 5, gap: 4 },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dayBox: { paddingHorizontal: 8, minWidth: 128, alignItems: "center" },
  day: { fontSize: 16, fontWeight: "700" },
  allBtn: { borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, height: 46, justifyContent: "center" },
  allText: { fontSize: 15.5, fontWeight: "600" },
  hint: { fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  tile: { borderWidth: 1, borderRadius: 18, padding: 14, overflow: "hidden" },
  tileSmall: { borderRadius: 16, padding: 10 },
  allTile: { gap: 2 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  label: { fontSize: 14.5, fontWeight: "600", flexShrink: 1 },
  labelSmall: { fontSize: 12.5 },
  count: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  countSmall: { fontSize: 22, marginTop: 2 },
  sub: { fontSize: 13 },
  subSmall: { fontSize: 11.5 },
});
