import { useEffect, useSyncExternalStore } from "react";
import { get } from "./api";
import type { WarehouseQty } from "./components/StockLine";

/**
 * Stock per 1С warehouse for product lists (catalog cards): the customer catalog API never has it, so the
 * cards ask the staff endpoint /api/team/warehouse-stock. Ids asked within one tick go in one request;
 * answers are kept 5 minutes.
 */
const TTL = 5 * 60_000;
const cache = new Map<number, { at: number; list: WarehouseQty[] }>();
const queued = new Set<number>();
const inFlight = new Set<number>();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let version = 0;

function emit() {
  version++;
  listeners.forEach((l) => l());
}

async function flush() {
  timer = null;
  const ids = [...queued];
  queued.clear();
  for (let i = 0; i < ids.length; i += 200) {
    const part = ids.slice(i, i + 200);
    part.forEach((id) => inFlight.add(id));
    try {
      const r = await get<{ stock: Record<string, WarehouseQty[]> }>(`/api/team/warehouse-stock?ids=${part.join(",")}`);
      const now = Date.now();
      for (const id of part) cache.set(id, { at: now, list: r.stock?.[String(id)] ?? [] });
    } catch {
      // no split this time — the card shows the total only
    } finally {
      part.forEach((id) => inFlight.delete(id));
    }
  }
  emit();
}

function want(id: number) {
  const hit = cache.get(id);
  if ((hit && Date.now() - hit.at < TTL) || inFlight.has(id) || queued.has(id)) return;
  queued.add(id);
  if (!timer) timer = setTimeout(flush, 30);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** [{ name, qty }] for a product, or undefined while unknown. */
export function useWarehouseStock(id: number | null | undefined): WarehouseQty[] | undefined {
  useSyncExternalStore(subscribe, () => version, () => version);
  useEffect(() => {
    if (id) want(id);
  }, [id]);
  return id ? cache.get(id)?.list : undefined;
}
