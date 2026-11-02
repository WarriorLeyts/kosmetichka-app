import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { request } from "./api";

/**
 * Push notifications in the staff app on Android phones (FCM via the Expo push service): new order,
 * a customer's message, the customer confirmed / cancelled. The site sends them to admins and
 * managers (lib/staffNotify.ts). The browser version uses Web Push instead (src/webPush.ts).
 * Nothing here may break the app: every call is guarded.
 */

const TOKEN_KEY = "team-push-token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** After sign-in: permission (Android 13+ asks), the channel, this phone's token to the site. */
export async function registerPhonePush() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync("staff", {
      name: "Заказы и сообщения клиентов",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#8b3dff",
      vibrationPattern: [0, 200, 120, 200],
    });
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return; // the build has no Expo project yet — push can't work, the app still does
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await request("/api/team/push-token", { method: "POST", body: JSON.stringify({ token, platform: Platform.OS }) });
    await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
  } catch (e) {
    console.log("[push] not available:", e instanceof Error ? e.message : e);
  }
}

/** On sign-out: this phone stops getting the account's notifications. */
export async function unregisterPhonePush() {
  if (Platform.OS !== "android") return;
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) await request("/api/team/push-token", { method: "DELETE", body: JSON.stringify({ token }) });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    /* offline: the site drops the token once Expo reports it gone */
  }
}

function open(path: unknown) {
  if (typeof path === "string" && path.startsWith("/")) router.push(path as never);
}

let listening = false;
/** A tap on a notification (also the one that launched the app) opens its order. */
export function listenPhonePush() {
  if (Platform.OS !== "android" || listening) return;
  listening = true;
  try {
    Notifications.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data?.path));
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (!r) return;
        Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
        setTimeout(() => open(r.notification.request.content.data?.path), 600);
      })
      .catch(() => {});
  } catch {
    /* module missing in an old build */
  }
}
