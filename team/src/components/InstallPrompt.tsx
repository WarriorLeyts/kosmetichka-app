import { useEffect, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Sheet } from "./iosui/Sheet";
import { useIOS } from "../ios";
import { useDesktop } from "../useDesktop";
import { BASE_PATH } from "../webPush";
import { isIOS, isStandalone, onUserGesture, readLocal, writeLocal } from "../webGesture";

/**
 * «Установите приложение» on phones (web only, not on a computer, not when already installed):
 * Android / Chrome — the browser's own install prompt on a tap (again after 7 days if dismissed);
 * iPhone Safari — a small sheet «Поделиться → На экран „Домой“» (again after 3 days after «Не сейчас»).
 */
const ANDROID_KEY = "team-install-dismissed";
const IOS_KEY = "team-install-ios-dismissed";
const DAY = 24 * 3600e3;

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const recently = (key: string, days: number) => Date.now() - Number(readLocal(key) || 0) < days * DAY;

/** Safari itself (Chrome / Firefox / in-app browsers on iOS can't add to the home screen the same way) */
const iosSafari = () => typeof navigator !== "undefined" && isIOS() && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|Instagram|FBAN|FBAV|Telegram/.test(navigator.userAgent);

export function InstallPrompt() {
  const desktop = useDesktop();
  const [iosSheet, setIosSheet] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || desktop || isStandalone()) return;

    if (iosSafari()) {
      if (recently(IOS_KEY, 3)) return;
      const t = setTimeout(() => setIosSheet(true), 2500);
      return () => clearTimeout(t);
    }

    // Android / Chrome: keep the browser's event, show its prompt on a tap (after the notifications prompt)
    let deferred: InstallEvent | null = null;
    let off: (() => void) | null = null;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as InstallEvent;
      if (recently(ANDROID_KEY, 7) || off) return;
      off = onUserGesture(10, () => {
        if (!deferred) return false;
        const ev = deferred;
        deferred = null;
        off?.();
        off = null;
        ev.prompt()
          .then(() => ev.userChoice)
          .then((c) => {
            if (c.outcome === "dismissed") writeLocal(ANDROID_KEY, String(Date.now()));
          })
          .catch(() => {});
        return true;
      });
    };
    const onInstalled = () => {
      deferred = null;
      off?.();
      off = null;
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      off?.();
    };
  }, [desktop]);

  if (Platform.OS !== "web") return null;
  const later = () => {
    writeLocal(IOS_KEY, String(Date.now()));
    setIosSheet(false);
  };
  return <IOSInstallSheet open={iosSheet} onClose={later} />;
}

export function IOSInstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useIOS();
  return (
    <Sheet open={open} onClose={onClose}>
      <View style={styles.head}>
        <Image source={{ uri: `${BASE_PATH}/assets/pwa/icon-180.png` }} style={styles.appIcon} accessibilityIgnoresInvertColors />
        <Text style={[styles.title, { color: c.label }]}>Установите «Косметичка Team»</Text>
        <Text style={[styles.sub, { color: c.secondary }]}>Откроется как приложение — без панелей браузера и с уведомлениями о заказах.</Text>
      </View>
      <View style={[styles.steps, { backgroundColor: c.cell }]}>
        <Step n={1} text="Нажмите «Поделиться»" icon="share-outline" />
        <View style={[styles.sep, { backgroundColor: c.separator }]} />
        <Step n={2} text="«На экран „Домой“»" icon="add-circle-outline" />
      </View>
      <Pressable onPress={onClose} accessibilityRole="button" style={styles.later}>
        <Text style={styles.laterText}>Не сейчас</Text>
      </Pressable>
    </Sheet>
  );
}

function Step({ n, text, icon }: { n: number; text: string; icon: keyof typeof Ionicons.glyphMap }) {
  const c = useIOS();
  return (
    <View style={styles.step}>
      <Text style={[styles.n, { color: c.secondary }]}>{n}</Text>
      <Text style={[styles.stepText, { color: c.label }]}>{text}</Text>
      <Ionicons name={icon} size={22} color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: "center", paddingHorizontal: 24, marginBottom: 16 },
  appIcon: { width: 52, height: 52, borderRadius: 13, backgroundColor: "#170D25", marginBottom: 10 },
  title: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  sub: { fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 19 },
  steps: { marginHorizontal: 16, borderRadius: 12, overflow: "hidden" },
  step: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 50 },
  n: { width: 16, fontSize: 15, fontWeight: "600" },
  stepText: { flex: 1, fontSize: 16 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 44 },
  later: { alignSelf: "center", paddingVertical: 14, paddingHorizontal: 24, marginTop: 4 },
  laterText: { color: "#8b3dff", fontSize: 16, fontWeight: "600" },
});
