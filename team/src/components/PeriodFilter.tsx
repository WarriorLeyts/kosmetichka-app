import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tap } from "@/components/ui";
import { useIOS } from "@/ios";
import { VIOLET } from "@/components/kit";
import { Sheet } from "@/components/iosui/Sheet";
import { shiftDay } from "@/components/OrdersSummary";

/** a sign-up period: whole Moscow days, both ends included; "" = open end */
export type Period = { from: string; to: string };
export const NO_PERIOD: Period = { from: "", to: "" };

const PINK = "#e82c87";
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MONTHS_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const WEEK_HEAD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const pad = (n: number) => String(n).padStart(2, "0");

/** today in Moscow, "YYYY-MM-DD" */
export const mskToday = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
const dm = (d: string) => `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const monthStart = (d: string) => `${d.slice(0, 7)}-01`;
const prevMonth = (d: string) => {
  const x = new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 2, 1, 12));
  return x.toISOString().slice(0, 10);
};
const monthEnd = (first: string) => {
  const x = new Date(Date.UTC(Number(first.slice(0, 4)), Number(first.slice(5, 7)), 0, 12));
  return x.toISOString().slice(0, 10);
};

/** «5 ноя», «1–7 ноя», «28 окт – 3 ноя» */
export function periodLabel(p: Period): string {
  if (!p.from && !p.to) return "Всё время";
  if (p.from && p.to && p.from === p.to) return dm(p.from);
  if (p.from && p.to && p.from.slice(0, 7) === p.to.slice(0, 7)) return `${Number(p.from.slice(8))}–${dm(p.to)}`;
  if (p.from && p.to) return `${dm(p.from)} – ${dm(p.to)}`;
  return p.from ? `с ${dm(p.from)}` : `по ${dm(p.to)}`;
}

function presets(today: string): { key: string; label: string; p: Period }[] {
  const pm = prevMonth(today);
  return [
    { key: "all", label: "Всё время", p: NO_PERIOD },
    { key: "today", label: "Сегодня", p: { from: today, to: today } },
    { key: "yesterday", label: "Вчера", p: { from: shiftDay(today, -1), to: shiftDay(today, -1) } },
    { key: "7", label: "7 дней", p: { from: shiftDay(today, -6), to: today } },
    { key: "30", label: "30 дней", p: { from: shiftDay(today, -29), to: today } },
    { key: "month", label: "Этот месяц", p: { from: monthStart(today), to: today } },
    { key: "prev", label: "Прошлый месяц", p: { from: pm, to: monthEnd(pm) } },
  ];
}
const same = (a: Period, b: Period) => a.from === b.from && a.to === b.to;

/**
 * Клиенты: who signed up when. Quick chips (всё время / сегодня / 7 дней / 30 дней) and «Период…» —
 * a calendar where two taps choose the first and the last day.
 */
export function PeriodFilter({ value, onChange, count }: { value: Period; onChange: (p: Period) => void; count: number | undefined }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [open, setOpen] = useState(false);
  const today = mskToday();
  const chips = presets(today).filter((x) => ["all", "today", "7", "30"].includes(x.key));
  const custom = !chips.some((x) => same(x.p, value));
  const chipBg = (on: boolean) => (on ? VIOLET : dark ? "rgba(255,255,255,0.07)" : "#FFFFFF");
  const chipBorder = (on: boolean) => (on ? VIOLET : dark ? "rgba(200,160,255,0.2)" : "#E9E4F5");
  const any = !!(value.from || value.to);
  return (
    <View style={{ marginBottom: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
        {chips.map((x) => {
          const on = same(x.p, value);
          return (
            <Pressable
              key={x.key}
              onPress={() => {
                tap();
                onChange(x.p);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[st.chip, { backgroundColor: chipBg(on), borderColor: chipBorder(on) }]}
            >
              <Text style={[st.chipText, { color: on ? "#fff" : c.label }]}>{x.label}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => {
            tap();
            setOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Выбрать период"
          style={[st.chip, st.chipIcon, { backgroundColor: chipBg(custom), borderColor: chipBorder(custom) }]}
        >
          <Ionicons name="calendar-outline" size={15} color={custom ? "#fff" : VIOLET} />
          <Text style={[st.chipText, { color: custom ? "#fff" : c.label }]}>{custom ? periodLabel(value) : "Период…"}</Text>
        </Pressable>
      </ScrollView>
      {any ? (
        <Text style={[st.result, { color: c.label }]}>
          Зарегистрировались{value.from === value.to ? "" : " за период"}: <Text style={{ color: VIOLET, fontWeight: "800" }}>{count ?? "…"}</Text>
          <Text style={{ color: c.secondary, fontWeight: "400" }}> · {periodLabel(value)}</Text>
        </Text>
      ) : null}
      <Sheet open={open} onClose={() => setOpen(false)} title="Период регистрации">
        <RangeCalendar
          value={value}
          today={today}
          onDone={(p) => {
            setOpen(false);
            onChange(p);
          }}
        />
      </Sheet>
    </View>
  );
}

/** Month grid; the first tap — the first day, the second — the last (in any order). Quick periods on top. */
function RangeCalendar({ value, today, onDone }: { value: Period; today: string; onDone: (p: Period) => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [sel, setSel] = useState<{ a: string | null; b: string | null }>({ a: value.from || null, b: value.to || null });
  const start = sel.a ?? today;
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
  const lo = sel.a && sel.b ? (sel.a < sel.b ? sel.a : sel.b) : sel.a;
  const hi = sel.a && sel.b ? (sel.a < sel.b ? sel.b : sel.a) : sel.a;
  const pick = (d: string) => {
    tap();
    setSel((s) => (!s.a || s.b ? { a: d, b: null } : { a: s.a, b: d }));
  };
  const soft = dark ? "rgba(139,61,255,0.25)" : "#EFE6FD";
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 12, maxWidth: 420, width: "100%", alignSelf: "center" }}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {presets(today)
          .filter((x) => x.key !== "all")
          .map((x) => (
            <Pressable
              key={x.key}
              onPress={() => {
                tap();
                onDone(x.p);
              }}
              style={[st.quick, { borderColor: dark ? "rgba(200,160,255,0.25)" : "#E9E4F5" }]}
            >
              <Text style={{ color: c.label, fontWeight: "600", fontSize: 15 }}>{x.label}</Text>
            </Pressable>
          ))}
      </View>
      <View style={st.monthRow}>
        <Pressable onPress={() => move(-1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Предыдущий месяц" style={[st.arrow, { backgroundColor: soft }]}>
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
          style={[st.arrow, { backgroundColor: soft, opacity: atLast ? 0.35 : 1 }]}
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
          const end = d === lo || d === hi;
          const inside = !!lo && !!hi && d > lo && d < hi;
          return (
            <View key={i} style={[st.cell, inside && { backgroundColor: soft }]}>
              <Pressable
                disabled={future}
                onPress={() => pick(d)}
                accessibilityRole="button"
                accessibilityLabel={dm(d)}
                accessibilityState={{ selected: end || inside, disabled: future }}
                style={[st.dayBtn, end && { backgroundColor: VIOLET }, !end && d === today && { borderWidth: 1.5, borderColor: VIOLET }]}
              >
                <Text style={{ fontSize: 16, fontWeight: end ? "700" : "500", color: end ? "#fff" : future ? c.secondary : c.label, opacity: future ? 0.4 : 1 }}>
                  {Number(d.slice(8))}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <Text style={{ color: c.secondary, fontSize: 13, textAlign: "center", marginTop: 10 }}>
        {!lo ? "Нажмите первый день периода" : !sel.b ? "Теперь последний день (или «Готово» — один день)" : periodLabel({ from: lo, to: hi! })}
      </Text>
      <Pressable
        disabled={!lo}
        onPress={() => {
          tap();
          onDone({ from: lo!, to: hi! });
        }}
        accessibilityRole="button"
        style={[st.done, { opacity: lo ? 1 : 0.4 }]}
      >
        <Text style={st.doneText}>Готово</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  chips: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  chipIcon: { flexDirection: "row", gap: 6 },
  chipText: { fontSize: 15, fontWeight: "600" },
  result: { fontSize: 15, fontWeight: "600", marginTop: 10, marginLeft: 4 },
  quick: { paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: "center" },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  month: { fontSize: 17, fontWeight: "700" },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  week: { flexDirection: "row", marginBottom: 4 },
  weekDay: { flex: 1, textAlign: "center", fontSize: 13, fontWeight: "600" },
  days: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayBtn: { width: "86%", height: "86%", borderRadius: 999, alignItems: "center", justifyContent: "center" },
  done: { marginTop: 14, height: 48, borderRadius: 24, backgroundColor: VIOLET, alignItems: "center", justifyContent: "center" },
  doneText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
