import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { api } from "./api";
import { useNotifications } from "./store/notifications";

/**
 * Push notifications. Android: real push via FCM (Expo push service) once the app has
 * google-services.json. iPhone: the app is installed without a paid Apple account, so no system
 * push — «Уведомления» (bell) works on both. Nothing here may break the app: every call is guarded.
 */

const TOKEN_KEY = "push-token";
const PROMO_ASKED_KEY = "push-promo-asked";

// banner + sound while the app is open; the bell count follows
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function channels() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Заказы и сообщения",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: "#8b3dff",
    vibrationPattern: [0, 200, 120, 200],
  });
  await Notifications.setNotificationChannelAsync("promo", {
    name: "Акции и новости",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#e82c87",
  });
}

/**
 * Called once the customer is signed in: asks for permission (Android 13+ shows the system
 * dialog) and sends this phone's token to the site. Silent when push isn't available.
 */
export async function registerPush(opts: { promoAsked?: (yes: boolean) => void } = {}) {
  if (Platform.OS !== "android") return;
  try {
    await channels();
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await api.pushTokenSave(token, Platform.OS);
    await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
    askPromoOnce(opts.promoAsked);
  } catch (e) {
    // no Firebase in this build / no Google services on the phone / offline — the bell still works
    console.log("[push] not available:", e instanceof Error ? e.message : e);
  }
}

/** One time after push is allowed: «присылать акции?» (promo needs consent — 38-ФЗ). */
async function askPromoOnce(done?: (yes: boolean) => void) {
  if ((await AsyncStorage.getItem(PROMO_ASKED_KEY).catch(() => null)) === "1") return;
  await AsyncStorage.setItem(PROMO_ASKED_KEY, "1").catch(() => {});
  Alert.alert(
    "Присылать акции и скидки?",
    "Уведомления о заказах, сообщениях менеджера и бонусах приходят всегда. Акции — только если хотите. Изменить можно в профиле.",
    [
      { text: "Не надо", style: "cancel", onPress: () => done?.(false) },
      {
        text: "Да, присылать",
        onPress: () => {
          api.setPushPromo(true).catch(() => {});
          done?.(true);
        },
      },
    ]
  );
}

/** On logout: this phone stops getting the account's pushes. */
export async function unregisterPush() {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) await api.pushTokenRemove(token);
    await AsyncStorage.multiRemove([TOKEN_KEY, PROMO_ASKED_KEY]);
  } catch {
    /* offline: the site drops the token when Expo reports it gone */
  }
}

/** Opens the screen a notification points to (order, product, profile…). */
export function openNotificationLink(link: unknown) {
  if (typeof link !== "string" || !link.startsWith("/")) {
    router.push("/notifications");
    return;
  }
  router.push(link as never);
}

let listening = false;

/** Tap on a push (also the one that launched the app) → its screen; a push while open → bell count. */
export function listenPush() {
  if (listening) return;
  listening = true;
  try {
    Notifications.addNotificationReceivedListener(() => {
      useNotifications.getState().refresh();
      useNotifications.getState().bump();
    });
    Notifications.addNotificationResponseReceivedListener((r) => {
      useNotifications.getState().refresh();
      openNotificationLink(r.notification.request.content.data?.link);
    });
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (!r) return;
        // handled once: otherwise every later launch would reopen the same screen
        Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
        setTimeout(() => openNotificationLink(r.notification.request.content.data?.link), 600);
      })
      .catch(() => {});
  } catch {
    /* module missing in an old build — nothing to listen to */
  }
}
