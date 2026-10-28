import { useEffect, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Sheet } from "@/components/iosui/Sheet";
import { iosText, useIOS } from "@/ios";
import { tap } from "@/components/ui";
import { onNextTap } from "@/webTap";
import { isIOSDevice, standalone } from "@/webPush";

/**
 * Website on a phone: offer to install the site to the home screen.
 * Android / Chrome / Edge: the browser's own install dialog on the first tap (again in 7 days if
 * dismissed). iPhone / iPad: it can't be done for the customer, so a sheet shows the two steps
 * (again in 3 days if closed). Never when already installed, never on a computer.
 */

const VIOLET = "#8b3dff";
const ANDROID_KEY = "install-dismissed-at";
const IOS_KEY = "install-ios-closed-at";
const DAY = 24 * 3600 * 1000;
const isWeb = Platform.OS === "web" && typeof window !== "undefined" && typeof navigator !== "undefined";

function recently(key: string, ms: number): boolean {
  try {
    const t = Number(window.localStorage.getItem(key) || 0);
    return !!t && Date.now() - t < ms;
  } catch {
    return false;
  }
}

function remember(key: string) {
  try {
    window.localStorage.setItem(key, String(Date.now()));
  } catch {
    /* private mode */
  }
}

// ── Android / Chrome: keep the browser's install event for the first tap ──
type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

function touchDevice(): boolean {
  return /Android/i.test(navigator.userAgent) || (typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches);
}

if (isWeb && !isIOSDevice()) {
  let disarm: (() => void) | null = null;
  window.addEventListener("beforeinstallprompt", (ev) => {
    if (!touchDevice() || standalone() || recently(ANDROID_KEY, 7 * DAY)) return;
    ev.preventDefault();
    const e = ev as InstallEvent;
    disarm?.();
    disarm = onNextTap(() => {
      disarm = null;
      if (standalone()) return false;
      e.prompt()
        .then(() => e.userChoice)
        .then((c) => {
          if (c.outcome !== "accepted") remember(ANDROID_KEY);
        })
        .catch(() => {});
      return true;
    }, true);
  });
  window.addEventListener("appinstalled", () => {
    disarm?.();
    disarm = null;
  });
}

// ── iPhone / iPad ──
type IOSBrowser = "safari" | "chrome" | null;

function iosBrowser(): IOSBrowser {
  const ua = navigator.userAgent;
  if (/CriOS\//.test(ua)) {
    // Chrome on iOS adds to the home screen from its share menu since iOS 16.4
    const m = /OS (\d+)_(\d+)/.exec(ua);
    const v = m ? Number(m[1]) + Number(m[2]) / 100 : 0;
    return v >= 16.04 ? "chrome" : null;
  }
  // other browsers and in-app web views (Instagram, Telegram…) can't install
  if (!/Safari\//.test(ua) || /FxiOS|EdgiOS|OPiOS|OPT\/|YaBrowser|GSA\/|DuckDuckGo|Instagram|FBAN|FBAV|Telegram|VKClient|Line\//.test(ua)) return null;
  return "safari";
}

function shareWhere(b: IOSBrowser): string {
  if (b === "chrome") return "в строке адреса";
  return /iPad/.test(navigator.userAgent) || !/iPhone|iPod/.test(navigator.userAgent) ? "вверху экрана" : "внизу экрана";
}

export function InstallPrompt() {
  const c = useIOS();
  const [open, setOpen] = useState(false);
  const [browser] = useState<IOSBrowser>(() => (isWeb && isIOSDevice() && !standalone() ? iosBrowser() : null));

  useEffect(() => {
    if (!browser || recently(IOS_KEY, 3 * DAY)) return;
    // after the launch animation
    const t = setTimeout(() => setOpen(true), 2500);
    return () => clearTimeout(t);
  }, [browser]);

  if (!browser) return null;
  const close = () => {
    tap();
    remember(IOS_KEY);
    setOpen(false);
  };
  const dark = c.blurTint === "dark";
  const iconBg = dark ? "rgba(255,255,255,0.08)" : "rgba(139,61,255,0.08)";

  return (
    <Sheet open={open} onClose={close}>
      <View style={styles.body}>
        <View style={styles.head}>
          <Image source={{ uri: "/assets/pwa/icon-180.png" }} style={styles.appIcon} accessibilityIgnoresInvertColors />
          <View style={{ flex: 1 }}>
            <Text style={[iosText.headline, { color: c.label }]}>Установите приложение «Косметичка»</Text>
            <Text style={[iosText.footnote, { color: c.secondary, marginTop: 2 }]}>Откроется с экрана «Домой» — как обычное приложение, с уведомлениями о заказах</Text>
          </View>
        </View>

        <View style={[styles.steps, { backgroundColor: c.cell }]}>
          <View style={styles.step}>
            <Text style={[styles.num, { color: VIOLET }]}>1</Text>
            <View style={[styles.stepIcon, { backgroundColor: iconBg }]}>
              <Ionicons name="share-outline" size={22} color={VIOLET} />
            </View>
            <Text style={[iosText.subhead, styles.stepText, { color: c.label }]}>
              Нажмите «Поделиться» {shareWhere(browser)}
              {browser === "safari" ? <Text style={{ color: c.secondary }}>{"\n"}Не видно — сначала «•••»</Text> : null}
            </Text>
          </View>
          <View style={[styles.sep, { backgroundColor: c.separator }]} />
          <View style={styles.step}>
            <Text style={[styles.num, { color: VIOLET }]}>2</Text>
            <View style={[styles.stepIcon, { backgroundColor: iconBg }]}>
              <MaterialCommunityIcons name="plus-box-outline" size={22} color={VIOLET} />
            </View>
            <Text style={[iosText.subhead, styles.stepText, { color: c.label }]}>Выберите «На экран „Домой“»</Text>
          </View>
        </View>

        <Pressable onPress={close} accessibilityRole="button" style={({ pressed }) => [styles.btn, { backgroundColor: c.cell }, pressed && { opacity: 0.7 }]}>
          <Text style={[styles.btnText, { color: VIOLET }]}>Не сейчас</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 14 },
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 },
  appIcon: { width: 52, height: 52, borderRadius: 12 },
  steps: { borderRadius: 14, paddingHorizontal: 14 },
  step: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58, paddingVertical: 8 },
  num: { width: 14, fontSize: 17, fontWeight: "700", textAlign: "center" },
  stepIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepText: { flex: 1 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  btn: { height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, fontWeight: "600" },
});
