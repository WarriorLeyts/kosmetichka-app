import { Platform } from "react-native";
import { router } from "expo-router";
import { create } from "zustand";
import { get, post } from "./api";
import { isIOS, isStandalone, onUserGesture, readLocal, writeLocal } from "./webGesture";

/**
 * Web Push for staff on the admin website (browser only; the native app is unchanged).
 * Turned on by itself: the first tap after sign-in asks the browser's permission and subscribes
 * (browsers require a gesture). Already allowed → re-subscribes silently. Denied → never asks again.
 * Sign-out → the subscription is removed. Service worker: public/sw.js at <base>/sw.js, scope <base>/.
 */

export type PushState =
  | "checking"
  | "unsupported" // no Web Push in this browser
  | "install" // iPhone Safari: only from the home-screen app
  | "off" // not on the server (no VAPID keys)
  | "ask" // will ask on the next tap
  | "denied"
  | "on";

export const usePushState = create<{ state: PushState }>(() => ({ state: "checking" }));
const setState = (state: PushState) => usePushState.setState({ state });

/** the build's base URL ("/admin" in production, "/team-web" in a preview, "" in dev) */
export const BASE_PATH = (process.env.EXPO_BASE_URL || "").replace(/\/$/, "");

const web = Platform.OS === "web" && typeof window !== "undefined";
const supported = () => web && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const ASKED_KEY = "team-push-asked";
const ASK_AGAIN_MS = 3 * 24 * 3600e3; // the prompt was closed without an answer → ask again after 3 days

let reg: ServiceWorkerRegistration | null = null;
let key: Uint8Array | null = null;
let offGesture: (() => void) | null = null;
let running = false;

function b64uToBytes(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

async function register(): Promise<ServiceWorkerRegistration | null> {
  if (reg) return reg;
  try {
    reg = await navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` });
    // a notification tap while the app is open: navigate inside the app
    navigator.serviceWorker.addEventListener("message", (e) => {
      const d = e.data as { t?: string; path?: string } | null;
      if (d?.t === "open" && typeof d.path === "string" && d.path.startsWith("/")) router.push(d.path as never);
    });
    return reg;
  } catch {
    return null;
  }
}

async function sendToServer(sub: PushSubscription) {
  await post("/api/team/web-push/subscribe", sub.toJSON());
}

async function subscribe(): Promise<boolean> {
  if (!reg || !key) return false;
  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key as BufferSource });
    await sendToServer(sub);
    setState("on");
    return true;
  } catch {
    setState(Notification.permission === "denied" ? "denied" : "ask");
    return false;
  }
}

/** asks inside the current tap (must be called from a click handler) */
function askNow(): boolean {
  if (!reg || !key) return false;
  writeLocal(ASKED_KEY, String(Date.now()));
  // subscribe() itself shows the permission prompt; requestPermission first keeps Safari happy
  Notification.requestPermission()
    .then((p) => {
      if (p === "granted") void subscribe();
      else setState(p === "denied" ? "denied" : "ask");
    })
    .catch(() => {});
  return true;
}

/** Signed in on the web: prepare, re-subscribe if allowed, else ask on the first tap. */
export async function startWebPush() {
  if (!web || running) return;
  running = true;
  if (!supported()) {
    setState(isIOS() && !isStandalone() ? "install" : "unsupported");
    return;
  }
  if (Notification.permission === "denied") {
    setState("denied");
    // still register: notification taps of an earlier subscription land in the app
    void register();
    return;
  }
  const [r, k] = await Promise.all([register(), get<{ enabled: boolean; publicKey?: string }>("/api/team/web-push/key").catch(() => null)]);
  if (!running) return;
  if (!r || !k?.enabled || !k.publicKey) {
    setState(r ? "off" : "unsupported");
    return;
  }
  key = b64uToBytes(k.publicKey);
  if (Notification.permission === "granted") {
    await subscribe();
    return;
  }
  setState("ask");
  const asked = Number(readLocal(ASKED_KEY) || 0);
  if (Date.now() - asked < ASK_AGAIN_MS) return;
  offGesture?.();
  offGesture = onUserGesture(0, () => {
    if (!running || Notification.permission !== "default") {
      offGesture?.();
      return false;
    }
    const used = askNow();
    if (used) {
      offGesture?.();
      offGesture = null;
    }
    return used;
  });
}

/** «Уведомления» row: turn on from a tap (gesture), or false when the browser can't. */
export function enableWebPushFromTap(): boolean {
  if (!supported() || Notification.permission === "denied") return false;
  if (Notification.permission === "granted") {
    void subscribe();
    return true;
  }
  return askNow();
}

/** Sign-out: this browser stops getting the account's notifications. */
export async function stopWebPush() {
  running = false;
  offGesture?.();
  offGesture = null;
  if (!supported()) return;
  try {
    const r = reg ?? (await navigator.serviceWorker.getRegistration(`${BASE_PATH}/`));
    const sub = await r?.pushManager.getSubscription();
    if (sub) {
      await post("/api/team/web-push/unsubscribe", { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe().catch(() => false);
    }
  } catch {
    /* ignore */
  }
  setState("checking");
}
