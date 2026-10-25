import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIOS } from "../ios";
import { statusColors, STATUS_LABELS } from "../orderStatus";
import { tap } from "./ui";

export const VIOLET = "#8b3dff";
export const PINK = "#e82c87";

/** white rounded panel (dark: plum card) */
export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const base = [styles.card, { backgroundColor: c.cell }, !dark && styles.shadow, style as ViewStyle];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [...base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
    >
      {children}
    </Pressable>
  );
}

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const c = useIOS();
  const s = statusColors(status, c.blurTint === "dark");
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.pillText, { color: s.fg }]}>{label ?? STATUS_LABELS[status] ?? status}</Text>
    </View>
  );
}

/** horizontal filter chips */
export function Chips<T extends string>({ items, value, onChange }: { items: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }} style={{ marginBottom: 12, marginHorizontal: -16 }}>
      <View style={{ width: 8 }} />
      {items.map((it) => {
        const on = it.value === value;
        return (
          <Pressable
            key={it.value}
            onPress={() => {
              tap();
              onChange(it.value);
            }}
            style={[styles.chip, { backgroundColor: on ? VIOLET : dark ? "#2B193D" : "#FFFFFF", borderColor: on ? VIOLET : dark ? "rgba(200,160,255,0.2)" : "#E9E4F5" }]}
          >
            <Text style={[styles.chipText, { color: on ? "#fff" : c.label }]}>
              {it.label}
              {it.count != null ? <Text style={{ opacity: 0.7 }}>{`  ${it.count}`}</Text> : null}
            </Text>
          </Pressable>
        );
      })}
      <View style={{ width: 8 }} />
    </ScrollView>
  );
}

export function Loading() {
  return <ActivityIndicator style={{ marginVertical: 40 }} color={VIOLET} size="large" />;
}

export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  const c = useIOS();
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={42} color={c.secondary} />
      <Text style={[styles.centerText, { color: c.secondary }]}>{text}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8}>
          <Text style={{ color: VIOLET, fontWeight: "600", fontSize: 16, marginTop: 8 }}>Повторить</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Empty({ icon = "file-tray-outline", text }: { icon?: keyof typeof Ionicons.glyphMap; text: string }) {
  const c = useIOS();
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={42} color={c.secondary} />
      <Text style={[styles.centerText, { color: c.secondary }]}>{text}</Text>
    </View>
  );
}

/** label · value row inside a card */
export function KV({ k, v, onPress }: { k: string; v?: string | number | null; onPress?: () => void }) {
  const c = useIOS();
  if (v == null || v === "") return null;
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.kv}>
      <Text style={[styles.k, { color: c.secondary }]}>{k}</Text>
      <Text style={[styles.v, { color: onPress ? VIOLET : c.label }]} selectable>
        {String(v)}
      </Text>
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const c = useIOS();
  return <Text style={[styles.section, { color: c.label }]}>{children}</Text>;
}

/** small coloured action button */
export function ActionButton({ label, kind = "primary", onPress, loading, icon }: { label: string; kind?: "primary" | "soft" | "danger" | "success"; onPress: () => void; loading?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const look = {
    primary: { bg: VIOLET, fg: "#fff" },
    success: { bg: "#16A34A", fg: "#fff" },
    soft: { bg: dark ? "rgba(139,61,255,0.22)" : "#F3ECFE", fg: dark ? "#D7B8FF" : "#6D28D9" },
    danger: { bg: dark ? "rgba(248,113,113,0.18)" : "#FEE2E2", fg: dark ? "#FCA5A5" : "#B91C1C" },
  }[kind];
  return (
    <Pressable
      onPress={() => {
        if (loading) return;
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.action, { backgroundColor: look.bg, opacity: pressed ? 0.85 : 1 }]}
    >
      {loading ? <ActivityIndicator color={look.fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={look.fg} /> : null}
          <Text style={[styles.actionText, { color: look.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, marginBottom: 12 },
  shadow: { boxShadow: "0 6px 22px rgba(80,40,140,0.07)" },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  pillText: { fontSize: 12.5, fontWeight: "700" },
  chip: { height: 36, borderRadius: 18, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: "600" },
  center: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  centerText: { fontSize: 16, textAlign: "center", marginTop: 10, lineHeight: 22 },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 6 },
  k: { fontSize: 15, flexShrink: 0 },
  v: { fontSize: 15, fontWeight: "500", textAlign: "right", flexShrink: 1 },
  section: { fontSize: 20, fontWeight: "700", marginTop: 8, marginBottom: 10 },
  action: { minHeight: 46, borderRadius: 23, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, flexGrow: 1 },
  actionText: { fontSize: 15, fontWeight: "700" },
});


/** search field like the catalog's */
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  return (
    <View style={[searchStyles.box, { backgroundColor: dark ? "rgba(255,255,255,0.08)" : "rgba(250,247,255,0.9)", borderColor: dark ? "rgba(200,160,255,0.3)" : "rgba(121,37,214,0.2)" }]}>
      <Ionicons name="search-outline" size={19} color={dark ? "#FAF7FD" : "#7925D6"} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.secondary}
        style={[searchStyles.input, { color: c.label }]}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {value ? (
        <Pressable onPress={() => onChange("")} hitSlop={8} accessibilityLabel="Очистить">
          <Ionicons name="close-circle" size={18} color={c.secondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const searchStyles = StyleSheet.create({
  box: { height: 48, borderRadius: 24, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  input: { flex: 1, fontSize: 16, height: 46 },
});
