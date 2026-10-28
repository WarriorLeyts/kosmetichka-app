import { Alert, Platform, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Row } from "./iosui/List";
import { useIOS } from "../ios";
import { enableWebPushFromTap, usePushState, type PushState } from "../webPush";

/** «Уведомления на этом устройстве» — admin website only (the native app has no web push). */
const VALUE: Record<PushState, string> = {
  checking: "…",
  unsupported: "недоступны",
  install: "выключены",
  off: "выключены",
  ask: "выключены",
  denied: "выключены",
  on: "включены",
};

const HOW: Partial<Record<PushState, string>> = {
  install: "На iPhone уведомления работают только в приложении с экрана «Домой»: в Safari нажмите «Поделиться» → «На экран „Домой“», откройте админку оттуда и войдите.",
  denied: "Уведомления для этого сайта запрещены в браузере. Разрешите их в настройках сайта (значок слева от адреса или настройки браузера) и обновите страницу.",
  unsupported: "Этот браузер не поддерживает уведомления. Откройте админку в Chrome, Edge, Firefox или Safari.",
  off: "Уведомления пока не настроены на сервере.",
};

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function explainOrEnable(state: PushState) {
  if (state === "ask" && enableWebPushFromTap()) return;
  Alert.alert("Как включить уведомления", HOW[state] ?? "Нажмите ещё раз и разрешите уведомления в окне браузера.");
}

export function PushStatusRow() {
  const state = usePushState((s) => s.state);
  if (Platform.OS !== "web") return null;
  const on = state === "on";
  return (
    <Row
      icon="notifications"
      iconBg={on ? "#34C759" : "#8E8E93"}
      title="Уведомления на этом устройстве"
      subtitle={on ? "Включены: новые заказы и сообщения клиентов" : state === "checking" ? "…" : `${cap(VALUE[state])} · как включить`}
      chevron={!on}
      onPress={on || state === "checking" ? undefined : () => explainOrEnable(state)}
    />
  );
}

/** one line in the desktop side menu */
export function PushStatusLine() {
  const c = useIOS();
  const state = usePushState((s) => s.state);
  if (Platform.OS !== "web" || state === "checking") return null;
  const on = state === "on";
  return (
    <Pressable
      disabled={on}
      onPress={() => explainOrEnable(state)}
      accessibilityRole="button"
      style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}
    >
      <Ionicons name={on ? "notifications" : "notifications-off-outline"} size={15} color={on ? "#34C759" : c.secondary} />
      <Text style={{ color: c.secondary, fontSize: 12.5, flexShrink: 1 }} numberOfLines={1}>
        Уведомления: {VALUE[state]}
        {on ? "" : " · как включить"}
      </Text>
    </Pressable>
  );
}
