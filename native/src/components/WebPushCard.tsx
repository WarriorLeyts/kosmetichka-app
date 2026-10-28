import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { iosText, useIOS } from "@/ios";
import { tap } from "@/components/ui";
import { disableWebPush, enableWebPush, isIOSDevice, useWebPush, type WebPushState } from "@/webPush";

const VIOLET = "#8b3dff";

const IOS_HOME = "Чтобы получать уведомления на iPhone, добавьте сайт на экран «Домой»: Поделиться → На экран «Домой», и откройте его оттуда";

function deniedText(): string {
  return isIOSDevice()
    ? "Уведомления запрещены. Разрешите их: Настройки iPhone → Уведомления → Косметичка → Допуск уведомлений."
    : "Уведомления запрещены в браузере. Нажмите на значок слева от адреса сайта → Уведомления → Разрешить и обновите страницу.";
}

function hint(s: WebPushState): string {
  switch (s) {
    case "on":
      return "Включены: статусы заказов и ответы менеджера приходят, даже когда сайт закрыт.";
    case "ios-home":
      return IOS_HOME;
    case "denied":
      return deniedText();
    case "unsupported":
      return "Этот браузер не поддерживает уведомления. Откройте сайт в Chrome, Edge, Firefox или Safari.";
    default:
      return "Статусы заказов и ответы менеджера будут приходить, даже когда сайт закрыт.";
  }
}

function useToggle() {
  const state = useWebPush();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = (on: boolean) => {
    tap();
    setError("");
    setBusy(true);
    // enable() must start inside the tap handler (iOS requires a user gesture for the prompt)
    const p = on ? enableWebPush() : disableWebPush();
    p.catch((e) => setError(e instanceof Error ? e.message : "Не получилось")).finally(() => setBusy(false));
  };
  return { state, busy, error, run };
}

/** «Уведомления» screen (website only): turn browser notifications on/off for this device. */
export function WebPushCard() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const { state, busy, error, run } = useToggle();
  if (Platform.OS !== "web" || state === "loading" || state === "server-off") return null;
  const canToggle = state === "default" || state === "off" || state === "on";
  const warn = state === "denied";
  return (
    <View style={[styles.card, { backgroundColor: c.cell }, !dark && styles.shadow]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: dark ? "rgba(255,255,255,0.08)" : "rgba(139,61,255,0.08)" }]}>
          <Ionicons name={state === "on" ? "notifications" : "notifications-outline"} size={22} color={VIOLET} />
        </View>
        <Text style={[styles.title, { color: c.label }]}>Уведомления на этом устройстве</Text>
        {busy ? (
          <ActivityIndicator color={VIOLET} />
        ) : state === "on" ? (
          <Switch
            value={state === "on"}
            onValueChange={run}
            trackColor={{ true: VIOLET, false: undefined }}
            accessibilityLabel="Уведомления на этом устройстве"
          />
        ) : null}
      </View>
      <Text style={[styles.text, { color: warn ? "#FF3B30" : c.secondary }]}>{hint(state)}</Text>
      {canToggle && state !== "on" && !busy ? (
        <Pressable onPress={() => run(true)} accessibilityRole="button" style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.btnText}>Включить</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={[styles.text, { color: "#FF3B30" }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", maxWidth: 640, alignSelf: "center", borderRadius: 20, padding: 14, gap: 10 },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.06)" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: "600" },
  text: { ...iosText.footnote, lineHeight: 19 },
  btn: { height: 44, borderRadius: 22, backgroundColor: VIOLET, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
