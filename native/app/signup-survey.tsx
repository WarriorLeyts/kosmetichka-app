import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { api } from "@/api";
import { tap } from "@/components/ui";
import { IOSField } from "@/components/iosui/Field";
import { GradientButton } from "@/components/iosui/Buttons";
import { AuthBackdrop } from "@/components/iosui/AuthBackdrop";
import { useIOS } from "@/ios";
import { colors } from "@/theme";


/** «Как вы узнали о нас?» — «Другое» opens a field for the customer's own answer */
const SOURCES: { value: string; label: string }[] = [
  { value: "Instagram", label: "📸 Instagram" },
  { value: "WhatsApp", label: "💬 WhatsApp" },
  { value: "Друзья, знакомые", label: "👭 Друзья" },
  { value: "Увидел(а) магазин", label: "🏬 Магазин" },
  { value: "2ГИС / Яндекс", label: "🗺 2ГИС / Яндекс" },
  { value: "Другое", label: "Другое" },
];

/**
 * Right after signing up (owner's choice «Б», 2026-11-10): two questions on a screen of their own, so the
 * registration form doesn't grow. «Пропустить» is fine — the app doesn't ask again. Staff see the answers
 * on the customer's card in Team.
 */
export default function SignupSurvey() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const [source, setSource] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [before, setBefore] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = async (answers: { source?: string; orderedBefore?: boolean }) => {
    if (busy) return;
    setBusy(true);
    await api.signupSurvey(answers).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace("/catalog");
  };

  const done = () =>
    finish({
      ...(source ? { source: source === "Другое" && other.trim() ? `Другое: ${other.trim()}` : source } : {}),
      ...(before !== null ? { orderedBefore: before } : {}),
    });

  const chip = (on: boolean, label: string, onPress: () => void, key?: string) => (
    <Pressable
      key={key ?? label}
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      style={[styles.chip, { borderColor: on ? colors.brand : dark ? "#43295A" : "#E4E2EC", backgroundColor: on ? colors.brand : c.cell }]}
    >
      <Text style={{ color: on ? "#fff" : c.label, fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AuthBackdrop />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <Text style={[styles.h1, { color: c.label }]} accessibilityRole="header">
            Ещё 2 вопроса
          </Text>
          <Text style={{ color: c.secondary, fontSize: 15, marginBottom: 20 }}>Это поможет нам стать лучше. Можно пропустить.</Text>

          <Text style={[styles.q, { color: c.label }]}>Как вы узнали о нас?</Text>
          <View style={styles.grid} accessibilityRole="radiogroup">
            {SOURCES.map((s) => (
              <View key={s.value} style={styles.cell}>
                {chip(source === s.value, s.label, () => setSource(s.value), s.value)}
              </View>
            ))}
          </View>
          {source === "Другое" ? (
            <View style={{ marginTop: 10 }}>
              <IOSField label="Откуда?" value={other} onChangeText={setOther} maxLength={100} placeholder="Например, реклама в Telegram" />
            </View>
          ) : null}

          <Text style={[styles.q, { color: c.label, marginTop: 22 }]}>Вы уже заказывали у нас?</Text>
          <View style={styles.row} accessibilityRole="radiogroup">
            <View style={{ flex: 1 }}>{chip(before === true, "Да", () => setBefore(true))}</View>
            <View style={{ flex: 1 }}>{chip(before === false, "Нет, впервые", () => setBefore(false))}</View>
          </View>

          <View style={{ marginTop: 28 }}>
            <GradientButton title="Готово" onPress={done} loading={busy} disabled={!source && before === null} />
          </View>
          <Pressable onPress={() => finish({})} accessibilityRole="button" style={styles.skip} disabled={busy}>
            <Text style={{ color: c.secondary, fontSize: 15, fontWeight: "600" }}>Пропустить</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, maxWidth: 520, width: "100%", alignSelf: "center" },
  h1: { fontSize: 28, fontWeight: "800", marginTop: 4, marginBottom: 6 },
  q: { fontSize: 17, fontWeight: "700", marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  cell: { width: "50%", padding: 4 },
  row: { flexDirection: "row", gap: 8 },
  chip: { minHeight: 46, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  skip: { alignSelf: "center", padding: 14, marginTop: 4 },
});
