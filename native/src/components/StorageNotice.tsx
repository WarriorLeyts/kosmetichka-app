import { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { usePathname, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "@/api";
import { useIOS } from "@/ios";
import { useDesktop } from "@/useDesktop";
import { useStorageNotice } from "@/store/storageNotice";
import { useTabBarSpace } from "@/components/TabBar";
import { colors } from "@/theme";

/** One notice per browser / app installation. Never a modal or a marketing opt-in. */
export function StorageNotice() {
  const c = useIOS();
  const desktop = useDesktop();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { height } = useWindowDimensions();
  const segments = useSegments();
  const pathname = usePathname();
  const status = useStorageNotice((s) => s.status);
  const hydrate = useStorageNotice((s) => s.hydrate);
  const dismiss = useStorageNotice((s) => s.dismiss);
  const [editing, setEditing] = useState(false);

  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const update = () => {
        const el = document.activeElement as HTMLElement | null;
        setEditing(!!el && (el.matches("textarea,input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])") || el.isContentEditable));
      };
      const blur = () => { timer = setTimeout(update, 0); };
      document.addEventListener("focusin", update);
      document.addEventListener("focusout", blur);
      update();
      return () => { clearTimeout(timer); document.removeEventListener("focusin", update); document.removeEventListener("focusout", blur); };
    }
    const show = Keyboard.addListener("keyboardDidShow", () => setEditing(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setEditing(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  if (status !== "visible" || editing) return null;
  const web = Platform.OS === "web";
  const title = web ? "Cookie и настройки" : "Данные на устройстве";
  const text = web
    ? "Используем cookie и данные в браузере для входа в аккаунт, работы корзины и сохранения настроек."
    : "Сохраняем данные входа, корзину и настройки на устройстве для работы приложения.";
  const bottom = desktop ? 24 : segments[0] === "(tabs)" || pathname.startsWith("/order/") ? tabSpace : Math.max(insets.bottom, 10) + 12;
  const dark = c.blurTint === "dark";
  return (
    <View testID="storage-notice" style={[styles.wrap, desktop ? styles.desktop : styles.phone, { bottom, backgroundColor: c.cell, maxHeight: Math.max(80, height - bottom - insets.top - 16) }, dark && styles.dark]}>
      <ScrollView bounces={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Ionicons name="shield-checkmark-outline" size={21} color={dark ? "#D7B8FF" : colors.brand} />
          <Text accessibilityRole="header" style={[styles.title, { color: c.label }]}>{title}</Text>
        </View>
        <Text style={[styles.text, { color: c.secondary }]}>{text}</Text>
        <View style={styles.footer}>
          <Pressable onPress={() => { void WebBrowser.openBrowserAsync(`${BASE_URL}/privacy`).catch(() => {}); }} accessibilityRole="link" accessibilityLabel="Политика конфиденциальности" hitSlop={4} style={styles.policy}>
            <Text style={[styles.policyText, { color: dark ? "#D7B8FF" : colors.brand }]}>Политика конфиденциальности</Text>
          </Pressable>
          <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel="Понятно" style={({ pressed }) => [styles.button, { backgroundColor: colors.brand, opacity: pressed ? 0.75 : 1 }]}>
            <Text style={styles.buttonText}>Понятно</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", borderRadius: 20, boxShadow: "0 5px 28px rgba(66,26,98,0.18)", overflow: "hidden", zIndex: 40 },
  phone: { left: 12, right: 12 },
  desktop: { left: 24, width: 560 },
  dark: { boxShadow: "0 5px 28px rgba(0,0,0,0.35)" },
  body: { padding: 16, gap: 10 },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700", flex: 1 },
  text: { fontSize: 13, lineHeight: 19 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  policy: { flex: 1, minHeight: 44, justifyContent: "center" },
  policyText: { fontSize: 12, lineHeight: 17, textDecorationLine: "underline" },
  button: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
