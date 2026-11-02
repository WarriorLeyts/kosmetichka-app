import { useEffect, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

/** + statusChanged: orders whose stage changed since the customer last saw it (this device) */
type Status = Awaited<ReturnType<typeof api.orderStatus>> & { statusChanged?: number[] };

let cache: { at: number; data: Status } | null = null;
let inFlight: Promise<Status> | null = null;
/** bumped on logout: an answer for the previous account is not cached */
let gen = 0;

/**
 * /api/orders/status shared by all screens (headers on every tab, orders list):
 * one request per 30 s instead of one per screen focus.
 */
export function orderStatus(force = false): Promise<Status> {
  if (!force && cache && Date.now() - cache.at < 30_000) return withoutSeen(cache.data);
  if (inFlight) return inFlight.then(withoutSeen);
  const my = gen;
  const p: Promise<Status> = api
    .orderStatus()
    .then((data) => {
      // the server may omit lists — screens read .managerMessages / .statuses directly
      const safe = { ...data, managerMessages: data?.managerMessages ?? [], statuses: data?.statuses ?? [] } as Status;
      if (my === gen) cache = { at: Date.now(), data: safe };
      return safe;
    })
    .finally(() => {
      if (inFlight === p) inFlight = null;
    });
  inFlight = p;
  return p.then(withoutSeen);
}

/**
 * Manager messages the customer has already read on this device: order id → time of the newest
 * message seen. The site only says «the last manager message of order N was at T» — without this
 * the dot on the order and the bell stayed on forever.
 */
const SEEN_KEY = "kosmetichka-chat-seen";
let seen: Record<string, number> | null = null;

async function loadSeen(): Promise<Record<string, number>> {
  if (seen) return seen;
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) || "{}");
    seen = raw && typeof raw === "object" ? raw : {};
  } catch {
    seen = {};
  }
  return seen!;
}

/**
 * Order stage the customer has already seen on this device: order id → status. The first answer
 * (and every order met for the first time, e.g. one he just placed) is taken as seen; a later
 * different status lights the order up until it is opened.
 */
const STATUS_KEY = "kosmetichka-status-seen";
let statusSeen: Record<string, string> | null = null;

async function loadStatusSeen(): Promise<Record<string, string>> {
  if (statusSeen) return statusSeen;
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(STATUS_KEY)) || "null");
    statusSeen = raw && typeof raw === "object" ? raw : {};
  } catch {
    statusSeen = {};
  }
  return statusSeen!;
}

function saveStatusSeen() {
  const s = statusSeen;
  if (!s) return;
  const keys = Object.keys(s);
  if (keys.length > 300) for (const k of keys.sort((a, b) => Number(a) - Number(b)).slice(0, keys.length - 300)) delete s[k];
  AsyncStorage.setItem(STATUS_KEY, JSON.stringify(s)).catch(() => {});
}

async function withoutSeen(data: Status): Promise<Status> {
  const s = await loadSeen();
  const managerMessages = data.managerMessages.filter((m) => !(s[m.orderId] >= Date.parse(m.latestAt)));
  const st = await loadStatusSeen();
  let added = false;
  const statusChanged: number[] = [];
  for (const o of data.statuses) {
    const was = st[o.id];
    if (was === undefined) {
      st[o.id] = o.status;
      added = true;
    } else if (was !== o.status) statusChanged.push(o.id);
  }
  if (added) saveStatusSeen();
  const out = { ...data, managerMessages, statusChanged };
  publish(out);
  return out;
}

/** The order screen showed order `orderId` at stage `status`. */
export async function markStatusSeen(orderId: number, status: string | undefined | null) {
  if (!status) return;
  const st = await loadStatusSeen();
  if (st[orderId] === status) return;
  st[orderId] = status;
  saveStatusSeen();
  if (cache) void withoutSeen(cache.data);
}

/** orders with something new for the customer: a manager message not read, or a changed stage */
export function updatedOrders(s: Pick<Status, "managerMessages" | "statusChanged">): Set<number> {
  return new Set([...s.managerMessages.map((m) => m.orderId), ...(s.statusChanged ?? [])]);
}

// the «Заказы» tab badge follows every fresh answer and every «seen» mark
let last: Status | null = null;
const listeners = new Set<(s: Status | null) => void>();
function publish(s: Status | null) {
  last = s;
  listeners.forEach((l) => l(s));
}

/** Number of orders with news (manager message / new stage); refreshed every 30 s while the app is open. */
export function useOrderUpdates(enabled: boolean): number {
  const [s, setS] = useState<Status | null>(enabled ? last : null);
  useEffect(() => {
    if (!enabled) {
      setS(null);
      return;
    }
    listeners.add(setS);
    const tick = () => {
      if (AppState.currentState === "active") orderStatus().catch(() => {});
    };
    tick();
    const t = setInterval(tick, 30_000);
    const sub = AppState.addEventListener("change", (a) => a === "active" && tick());
    return () => {
      listeners.delete(setS);
      clearInterval(t);
      sub.remove();
    };
  }, [enabled]);
  return s ? updatedOrders(s).size : 0;
}

/** The chat of order `orderId` was shown with messages up to `latestAt` (ISO). */
export async function markChatSeen(orderId: number, latestAt: string) {
  const t = Date.parse(latestAt);
  if (!Number.isFinite(t)) return;
  const s = await loadSeen();
  if (s[orderId] >= t) return;
  s[orderId] = t;
  if (cache) void withoutSeen(cache.data);
  const keys = Object.keys(s);
  if (keys.length > 300) for (const k of keys.sort((a, b) => s[a] - s[b]).slice(0, keys.length - 300)) delete s[k];
  AsyncStorage.setItem(SEEN_KEY, JSON.stringify(s)).catch(() => {});
}

export function clearOrderStatus() {
  cache = null;
  inFlight = null;
  gen++;
  publish(null);
}
