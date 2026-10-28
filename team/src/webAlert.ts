import { Alert, Platform, type AlertButton } from "react-native";

/**
 * In the browser react-native-web's Alert.alert does nothing, so confirmations («Отменить заказ?»,
 * «Очистить корзину?») would silently never run. Here they become the browser's own dialogs:
 * one button → a message; a cancel + an action → «OK / Отмена»; more → asked one action at a time.
 */
if (Platform.OS === "web" && typeof window !== "undefined") {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join("\n\n");
    const list = buttons ?? [];
    setTimeout(() => {
      if (list.length <= 1) {
        window.alert(text);
        list[0]?.onPress?.();
        return;
      }
      // without an explicit cancel the first button plays that role («Продолжить» / «В корзину»)
      const cancel = list.find((b) => b.style === "cancel") ?? list[0];
      for (const b of list.filter((x) => x !== cancel)) {
        if (window.confirm(`${text}\n\nOK — «${b.text}», Отмена — «${cancel.text}»`)) {
          b.onPress?.();
          return;
        }
      }
      cancel.onPress?.();
    }, 0);
  };
}
