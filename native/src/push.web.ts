import { armAutoWebPush, disableWebPush, disarmAutoWebPush, listenWebPush, refreshWebPush } from "./webPush";
import { useNotifications } from "./store/notifications";

/**
 * Website version of src/push.ts: browser Web Push (src/webPush.ts). The browser asks only from a
 * tap, so registerPush refreshes an already allowed subscription and, if not decided yet, asks on
 * the customer's first tap anywhere (or the «Включить» button on the «Уведомления» card).
 */
export async function registerPush(_opts: { promoAsked?: (yes: boolean) => void } = {}) {
  await refreshWebPush().catch(() => {});
  await armAutoWebPush().catch(() => {});
}

/** On logout: this browser stops getting the account's notifications (re-subscribed silently on the next sign-in). */
export async function unregisterPush() {
  disarmAutoWebPush();
  await disableWebPush(false).catch(() => {});
}

export function openNotificationLink(link: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { router } = require("expo-router") as typeof import("expo-router");
  if (typeof link !== "string" || !link.startsWith("/")) {
    router.push("/notifications");
    return;
  }
  router.push(link as never);
}

/** A push while the site is open → bell count; a tap on a notification with the site open → its screen. */
export function listenPush() {
  try {
    listenWebPush({
      push: () => {
        useNotifications.getState().refresh();
        useNotifications.getState().bump();
      },
      open: (link) => {
        useNotifications.getState().refresh();
        openNotificationLink(link);
      },
    });
  } catch {
    /* no service worker support */
  }
}
