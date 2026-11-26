import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useIOS } from "../ios";
import { tap } from "./ui";
import { Sheet } from "./iosui/Sheet";
import { shiftDay } from "./OrdersSummary";
import { mskToday, NO_PERIOD, periodLabel, RangeCalendar, type Period } from "./PeriodFilter";
const VIOLET = "#8b3dff";
const fullDate = (d: string) => `${d.slice(8)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
const shortDate = (d: string) => `${d.slice(8)}.${d.slice(5, 7)}`;

/** One calendar chooses a day or a two-ended period; all dates resets both. */
export function OrderDateFilter({ day, period, today: serverToday, onChange }: {
  day: string | null; period: Period | null; today?: string;
  onChange: (day: string | null, period: Period | null) => void;
}) {
  const c = useIOS();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const dark = c.blurTint === "dark";
  const today = serverToday || mskToday();
  const all = day === "" && !period;
  const selectedDay = day || today;
  const [open, setOpen] = useState(false);
  const shown = period ? periodLabel(period) : all ? "Выбрать даты" : selectedDay === today ? "Сегодня" : periodLabel({ from: selectedDay, to: selectedDay });
  const end = period?.to || selectedDay;
  const nextDisabled = all || end >= today;
  const move = (by: number) => {
    tap();
    if (period) {
      const span = Math.round((new Date(`${period.to}T12:00:00Z`).getTime() - new Date(`${period.from}T12:00:00Z`).getTime()) / 86_400_000) + 1;
      let from = shiftDay(period.from, by * span), to = shiftDay(period.to, by * span);
      if (to > today) { to = today; from = shiftDay(today, 1 - span); }
      onChange("", { from, to });
    } else {
      const date = all ? today : shiftDay(selectedDay, by);
      onChange(date >= today ? null : date, null);
    }
  };
  const soft = dark ? "#38214F" : "#F3EDFC";
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={styles.row}>
        <View style={[styles.nav, { backgroundColor: c.cell, borderColor: dark ? "transparent" : "#E9E4F5" }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={period ? "Предыдущий период" : "Предыдущий день"} onPress={() => move(-1)} style={[styles.arrow, { backgroundColor: soft }]}><Ionicons name="chevron-back" size={18} color={VIOLET} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Выбрать интервал дат" onPress={() => { tap(); setOpen(true); }} style={styles.choose}>
            <Ionicons name="calendar-outline" size={17} color={VIOLET} />
            <Text numberOfLines={2} style={[styles.label, { color: c.label }]}>{shown}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={period ? "Следующий период" : "Следующий день"} accessibilityState={{ disabled: nextDisabled }} disabled={nextDisabled} onPress={() => move(1)} style={[styles.arrow, { backgroundColor: soft, opacity: nextDisabled ? 0.35 : 1 }]}><Ionicons name="chevron-forward" size={18} color={VIOLET} /></Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Все даты" accessibilityState={{ selected: all }} onPress={() => { tap(); onChange("", null); }} style={[styles.all, { backgroundColor: all ? VIOLET : c.cell, borderColor: VIOLET }]}><Text style={{ color: all ? "#fff" : c.label, fontSize: 14, fontWeight: "600" }}>Все даты</Text></Pressable>
      </View>
      {!all ? <Text style={[styles.hint, { color: c.secondary }]}>
        {period ? `${fullDate(period.from)} — ${fullDate(period.to)} · рабочие дни` : "Рабочий день"}
        {` · с 19:00 ${shortDate(shiftDay(period?.from || selectedDay, -1))} до 19:00 ${shortDate(period?.to || selectedDay)} МСК`}
      </Text> : null}
      <Sheet open={open} onClose={() => setOpen(false)} title="Выберите даты заказов">
        <ScrollView style={{ maxHeight: Math.max(180, height - insets.top - insets.bottom - 140) }} contentContainerStyle={{ paddingBottom: 8 }}>
          <Text style={{ color: c.secondary, textAlign: "center", paddingHorizontal: 16, marginBottom: 12 }}>Выберите начало и конец периода. Для одного дня нажмите дату и «Готово». Рабочий день: 19:00 — 19:00 МСК.</Text>
          {open ? <RangeCalendar key={`${period?.from || day || "all"}:${period?.to || ""}`} value={period || (all ? NO_PERIOD : { from: selectedDay, to: selectedDay })} today={today} onDone={(value) => {
            setOpen(false);
            if (value.from === value.to) onChange(value.from === today ? null : value.from, null);
            else onChange("", value);
          }} /> : null}
        </ScrollView>
      </Sheet>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  nav: { flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 28, padding: 4, minHeight: 52 },
  arrow: { width: 44, height: 44, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  choose: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 4 },
  label: { fontSize: 14, fontWeight: "600", textAlign: "center", flexShrink: 1 },
  all: { minHeight: 52, paddingHorizontal: 14, borderRadius: 26, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  hint: { fontSize: 12, marginTop: 6, marginHorizontal: 4 },
});
