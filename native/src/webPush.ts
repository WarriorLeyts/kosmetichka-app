import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { api } from "./api";
import { onNextTap } from "./webTap";

/**
 * Website only: browser Web Push (Chrome / Android / desktop; iPhone 16.4+ only from the home
 * screen). The service worker is /sw.js (public/sw.js). enable() must run from a tap — iOS
 * refuses the permission prompt otherwise. Never throws to the UI except from enable().
 */

export type WebPushState =
  | "loading"
  | "unsupported" // no service worker / PushManager in this browser
  | "ios-home" // iPhone/iPad Safari tab: only a home-screen web app gets push
  | "server-off" // the site has no VAPID keys
  | "default" // not asked yet
  | "off" // allowed, but not subscribed on this device (turned off here)
  | "on"
  | "denied";

const OFF_KEY = "webpush-off";
const AUTO_KEY = "webpush-auto-asked"; // when the automatic prompt last ran (dismissed → again in a week)
const AUTO_AGAIN_MS = 7 * 24 * 3600 * 1000;
const isWeb = Platform.OS === "web" && typeof window !== "undefined" && typeof navigator !== "undefined";

const store = {
  get(k: string) {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v === null) window.localStorage.removeItem(k);
      else window.localStorage.setItem(k, v);
    } catch {
      /* private mode */
    }
  },
};

export function isIOSDevice(): boolean {
  if (!isWeb) return false;
  const n = navigator as Navigator & { maxTouchPoints?: number };
  return /iP(hone|ad|od)/.test(n.userAgent) || (n.platform === "MacIntel" && (n.maxTouchPoints ?? 0) > 1);
}

/** Opened from the home screen (installed web app). */
export function standalone(): boolean {
  const n = navigator as Navigator & { standalone?: boolean };
  return n.standalone === true || (typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches);
}

function supported(): boolean {
  return isWeb && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function keyBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (b64url + "===".slice((b64url.length + 3) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

let regPromise: Promise<ServiceWorkerRegistration> | null = null;
function registration(): Promise<ServiceWorkerRegistration> {
  if (!regPromise) {
    regPromise = navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(() => navigator.serviceWorker.ready);
    regPromise.catch(() => {
      regPromise = null;
    });
  }
  return regPromise;
}

// ── shared state for every card / banner on screen ──
let current: WebPushState = "loading";
const listeners = new Set<(s: WebPushState) => void>();
function publish(s: WebPushState) {
  current = s;
  listeners.forEach((f) => f(s));
}

let serverKey: string | null | undefined; // undefined = not fetched yet, null = server off
async function getServerKey(): Promise<string | null> {
  if (serverKey !== undefined) return serverKey;
  const r = await api.webPushKey();
  serverKey = r.enabled && r.publicKey ? r.publicKey : null;
  return serverKey;
}

/** Works out the state of this device (no prompts). */
export async function checkWebPush(): Promise<WebPushState> {
  let s: WebPushState;
  try {
    if (isIOSDevice() && !standalone()) s = "ios-home";
    else if (!supported()) s = "unsupported";
    else if (Notification.permission === "denied") s = "denied";
    else if (Notification.permission === "default") s = "default";
    else {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      s = sub ? "on" : "off";
    }
    if (s === "default" || s === "off") {
      const key = await getServerKey().catch(() => undefined);
      if (key === null) s = "server-off";
    }
  } catch {
    s = "unsupported";
  }
  publish(s);
  return s;
}

/** Subscribes with the server key (re-subscribes if the key changed) and saves it on the site. */
async function subscribe(): Promise<void> {
  const key = await getServerKey();
  if (!key) throw new Error("Уведомления на сайте пока недоступны");
  const appKey = keyBytes(key);
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub.options.applicationServerKey, appKey)) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
  await api.webPushSubscribe(sub.toJSON());
}

/** Must be called from a tap. Throws a Russian message on failure. */
export async function enableWebPush(): Promise<WebPushState> {
  if (!supported()) return checkWebPush();
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") return checkWebPush();
  store.set(OFF_KEY, null);
  try {
    await subscribe();
  } catch (e) {
    await checkWebPush();
    throw new Error(e instanceof Error && /[а-я]/i.test(e.message) ? e.message : "Не удалось включить уведомления. Попробуйте ещё раз.");
  }
  return checkWebPush();
}

/** Stops push on this device. `remember` keeps it off after the next sign-in. */
export async function disableWebPush(remember = true): Promise<void> {
  if (remember) store.set(OFF_KEY, "1");
  if (!supported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await api.webPushUnsubscribe(sub.endpoint).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
  } catch {
    /* nothing to undo */
  }
  if (remember) await checkWebPush();
}

/** After sign-in: if the browser already allows notifications, silently (re)subscribe. */
export async function refreshWebPush(): Promise<void> {
  if (!supported() || Notification.permission !== "granted" || store.get(OFF_KEY) === "1") {
    await checkWebPush();
    return;
  }
  try {
    await subscribe();
  } catch (e) {
    console.log("[web-push] refresh failed:", e instanceof Error ? e.message : e);
  }
  await checkWebPush();
}

let disarm: (() => void) | null = null;

/**
 * Signed-in customer who hasn't decided yet: the first tap anywhere on the page runs enableWebPush()
 * (the browser asks, then we subscribe). Not after «запретить», not if turned off on this device,
 * not in an iPhone Safari tab (only the home-screen web app gets push).
 */
export async function armAutoWebPush(): Promise<void> {
  if (disarm || !supported() || (isIOSDevice() && !standalone())) return;
  if (Notification.permission !== "default" || store.get(OFF_KEY) === "1") return;
  const asked = Number(store.get(AUTO_KEY) || 0);
  if (asked && Date.now() - asked < AUTO_AGAIN_MS) return;
  const key = await getServerKey().catch(() => null);
  if (!key || disarm) return;
  disarm = onNextTap(() => {
    disarm = null;
    if (Notification.permission !== "default" || store.get(OFF_KEY) === "1") return false;
    store.set(AUTO_KEY, String(Date.now()));
    // still inside the tap: requestPermission() is called before the first await
    enableWebPush().catch((e) => console.log("[web-push] auto enable failed:", e instanceof Error ? e.message : e));
    return true;
  });
}

/** Signed out: no automatic prompt. */
export function disarmAutoWebPush(): void {
  disarm?.();
  disarm = null;
}

/** Registers the service worker early and forwards its messages (push arrived / notification tapped). */
export function listenWebPush(on: { push: () => void; open: (link: string) => void }): void {
  if (!supported()) return;
  registration().catch(() => {});
  navigator.serviceWorker.addEventListener("message", (e: MessageEvent) => {
    const d = e.data as { type?: string; link?: string } | null;
    if (d?.type === "push") on.push();
    else if (d?.type === "open" && typeof d.link === "string") on.open(d.link);
  });
}

/** Current state for the UI; checks once on mount. */
export function useWebPush(): WebPushState {
  const [s, setS] = useState<WebPushState>(current);
  useEffect(() => {
    if (!isWeb) return;
    listeners.add(setS);
    checkWebPush();
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}
