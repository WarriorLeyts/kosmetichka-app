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
  if (!force && cache && Date.now() - cache.at < 30_000) return Promise.resolve(cache.data);
  if (inFlight) return inFlight;
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
  return p;
}

export function clearOrderStatus() {
  cache = null;
  inFlight = null;
  gen++;
}
