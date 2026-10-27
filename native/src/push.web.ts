/**
 * Website version of src/push.ts: no system push in the browser — «Уведомления» (bell) work
 * through the site API like everywhere else. Same exports so screens don't care.
 */
export async function registerPush(_opts: { promoAsked?: (yes: boolean) => void } = {}) {}
export async function unregisterPush() {}
export function openNotificationLink(link: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { router } = require("expo-router") as typeof import("expo-router");
  if (typeof link !== "string" || !link.startsWith("/")) {
    router.push("/notifications");
    return;
  }
  router.push(link as never);
}
export function listenPush() {}
