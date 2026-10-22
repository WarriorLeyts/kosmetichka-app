import { api } from "./api";

type Status = Awaited<ReturnType<typeof api.orderStatus>>;

let cache: { at: number; data: Status } | null = null;
let inFlight: Promise<Status> | null = null;

/**
 * /api/orders/status shared by all screens (headers on every tab, orders list):
 * one request per 30 s instead of one per screen focus.
 */
export function orderStatus(force = false): Promise<Status> {
  if (!force && cache && Date.now() - cache.at < 30_000) return Promise.resolve(cache.data);
  if (inFlight) return inFlight;
  inFlight = api
    .orderStatus()
    .then((data) => {
      cache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function clearOrderStatus() {
  cache = null;
}
