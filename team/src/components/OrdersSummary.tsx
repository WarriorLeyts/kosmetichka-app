import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { tap } from "@/components/ui";
import { useIOS } from "@/ios";
import { money } from "@/format";
import { VIOLET } from "@/components/kit";
import { Sheet } from "@/components/iosui/Sheet";
import type { OrdersPage } from "@/types";

const PINK = "#e82c87";
const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

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
  const [calendar, setCalendar] = useState(false);
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
        <Pressable
          onPress={() => {
            if (!today) return;
            tap();
            setCalendar(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Выбрать день"
          style={st.dayBox}
        >
          <Ionicons name="calendar-outline" size={15} color={VIOLET} />
          <Text style={[st.day, { color: c.label }]} numberOfLines={1}>
            {all ? "Выбрать день" : shown ? (atToday ? "Сегодня" : dayLabel(shown)) : "Сегодня"}
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
      {today ? (
        <Sheet open={calendar} onClose={() => setCalendar(false)} title="Выберите день">
          <Calendar
            value={all ? null : shown ?? null}
            today={today}
            onPick={(d) => {
              setCalendar(false);
              onChange(d >= today ? null : d);
            }}
          />
        </Sheet>
      ) : null}
      {!all && shown ? <Text style={[st.hint, { color: c.secondary }]}>рабочий день с 19:00 {ddmm(shiftDay(shown, -1))}</Text> : null}
    </View>
  );
}

const MONTHS_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const WEEK_HEAD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const pad = (n: number) => String(n).padStart(2, "0");

/** A month grid (Monday first); days after `today` can't be picked. «Сегодня» / «Вчера» on top. */
function Calendar({ value, today, onPick }: { value: string | null; today: string; onPick: (d: string) => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const start = value ?? today;
  const [ym, setYm] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 });
  const first = new Date(Date.UTC(ym.y, ym.m, 1, 12));
  const lead = (first.getUTCDay() + 6) % 7;
  const daysIn = new Date(Date.UTC(ym.y, ym.m + 1, 0, 12)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => `${ym.y}-${pad(ym.m + 1)}-${pad(i + 1)}`)];
  while (cells.length % 7) cells.push(null);
  const atLast = `${ym.y}-${pad(ym.m + 1)}` >= today.slice(0, 7);
  const move = (by: number) => {
    tap();
    const d = new Date(Date.UTC(ym.y, ym.m + by, 1, 12));
    setYm({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
  };
  const quick = [
    { label: "Сегодня", d: today },
    { label: "Вчера", d: shiftDay(today, -1) },
    { label: "Позавчера", d: shiftDay(today, -2) },
  ];
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 12, maxWidth: 420, width: "100%", alignSelf: "center" }}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {quick.map((q) => (
          <Pressable
            key={q.label}
            onPress={() => {
              tap();
              onPick(q.d);
            }}
            style={[st.quick, { borderColor: value === q.d ? VIOLET : dark ? "rgba(200,160,255,0.25)" : "#E9E4F5", backgroundColor: value === q.d ? VIOLET : "transparent" }]}
          >
            <Text style={{ color: value === q.d ? "#fff" : c.label, fontWeight: "600", fontSize: 15 }}>{q.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={st.monthRow}>
        <Pressable onPress={() => move(-1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Предыдущий месяц" style={[st.arrow, { backgroundColor: dark ? "rgba(139,61,255,0.25)" : "#F3EDFC" }]}>
          <Ionicons name="chevron-back" size={18} color={VIOLET} />
        </Pressable>
        <Text style={[st.month, { color: c.label }]}>
          {MONTHS_NOM[ym.m]} {ym.y}
        </Text>
        <Pressable
          onPress={() => !atLast && move(1)}
          disabled={atLast}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Следующий месяц"
          style={[st.arrow, { backgroundColor: dark ? "rgba(139,61,255,0.25)" : "#F3EDFC", opacity: atLast ? 0.35 : 1 }]}
        >
          <Ionicons name="chevron-forward" size={18} color={VIOLET} />
        </Pressable>
      </View>
      <View style={st.week}>
        {WEEK_HEAD.map((w, i) => (
          <Text key={w} style={[st.weekDay, { color: i > 4 ? PINK : c.secondary }]}>
            {w}
          </Text>
        ))}
      </View>
      <View style={st.days}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={st.cell} />;
          const future = d > today;
          const on = d === value;
          const isToday = d === today;
          return (
            <View key={i} style={st.cell}>
              <Pressable
                disabled={future}
                onPress={() => {
                  tap();
                  onPick(d);
                }}
                accessibilityRole="button"
                accessibilityLabel={dayLabel(d)}
                accessibilityState={{ selected: on, disabled: future }}
                style={[st.dayBtn, on && { backgroundColor: VIOLET }, !on && isToday && { borderWidth: 1.5, borderColor: VIOLET }]}
              >
                <Text style={{ fontSize: 16, fontWeight: on || isToday ? "700" : "500", color: on ? "#fff" : future ? c.secondary : isToday ? VIOLET : c.label, opacity: future ? 0.4 : 1 }}>
                  {Number(d.slice(8))}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
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
// «Оформлен» (payment) is not a tile: «Заказ собран» sends the order to 1С at once (owner, 2026-11-09)
const TILES = ["pending", "assembly", "consultation", "exported", "cancelled"];

/**
 * Summary tiles: «Все заказы» + one per stage, count and sum; a tap filters the list.
 * Phone: 3 in a row, «Все» across the top. Computer: 4 in a row, «Все» takes two. A short last row is stretched.
 */
export function StatusTiles({ counts, status, onChange, desktop }: { counts: OrdersPage["counts"] | undefined; status: string; onChange: (s: string) => void; desktop: boolean }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [w, setW] = useState(0);
  const cols = desktop ? 4 : 3;
  const gap = desktop ? 10 : 8;
  const cell = w ? (w - gap * (cols - 1)) / cols : 0;
  const allWidth = desktop ? cell * 2 + gap : w;
  // rows always end flush: the tiles of a short last row share its width
  const first = desktop ? cols - 2 : 0; // tiles beside «Все» in its row
  const tileWidth = (i: number) => {
    if (i < first) return cell;
    const j = i - first;
    const inRow = Math.min(cols, TILES.length - first - Math.floor(j / cols) * cols);
    return (w - gap * (inRow - 1)) / inRow;
  };
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
              <LinearGradient colors={[VIOLET, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.tile, small && st.tileSmall, st.allTile, { borderWidth: 0, padding: small ? 11 : 15 }]}>
                <AllContent counts={counts} small={small} on />
              </LinearGradient>
            ) : (
              <View style={[st.tile, small && st.tileSmall, st.allTile, tileBox(dark)]}>
                <AllContent counts={counts} small={small} />
              </View>
            )}
          </Pressable>
          {TILES.map((s, i) => {
            const x = by(s);
            const on = status === s;
            const confirmed = s === "consultation" && (counts?.confirmed ?? 0) > 0;
            return (
              <Pressable
                key={s}
                onPress={() => pick(s)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[st.tile, small && st.tileSmall, tileBox(dark), { width: tileWidth(i) }, on && { borderColor: VIOLET, borderWidth: 2, backgroundColor: dark ? "rgba(139,61,255,0.2)" : "#F6F0FF" }]}
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
  dayBox: { paddingHorizontal: 8, minWidth: 128, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  quick: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  month: { fontSize: 17, fontWeight: "700" },
  week: { flexDirection: "row", marginBottom: 4 },
  weekDay: { width: `${100 / 7}%`, textAlign: "center", fontSize: 13, fontWeight: "600" },
  days: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, height: 48, alignItems: "center", justifyContent: "center" },
  dayBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
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
