import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

type Status = Awaited<ReturnType<typeof api.orderStatus>>;

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

async function withoutSeen(data: Status): Promise<Status> {
  const s = await loadSeen();
  const managerMessages = data.managerMessages.filter((m) => !(s[m.orderId] >= Date.parse(m.latestAt)));
  return managerMessages.length === data.managerMessages.length ? data : { ...data, managerMessages };
}

/** The chat of order `orderId` was shown with messages up to `latestAt` (ISO). */
export async function markChatSeen(orderId: number, latestAt: string) {
  const t = Date.parse(latestAt);
  if (!Number.isFinite(t)) return;
  const s = await loadSeen();
  if (s[orderId] >= t) return;
  s[orderId] = t;
  const keys = Object.keys(s);
  if (keys.length > 300) for (const k of keys.sort((a, b) => s[a] - s[b]).slice(0, keys.length - 300)) delete s[k];
  AsyncStorage.setItem(SEEN_KEY, JSON.stringify(s)).catch(() => {});
}

export function clearOrderStatus() {
  cache = null;
  inFlight = null;
  gen++;
}
