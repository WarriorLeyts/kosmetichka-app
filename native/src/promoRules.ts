/** Pure promo rules (src/promo.ts) — kept apart so they can be tested without React Native. */
import type { SitePromo } from "@/api";

export function promoLive(p: SitePromo | null, now = Date.now()): boolean {
  if (!p) return false;
  if (p.startsAt && now < Date.parse(p.startsAt)) return false;
  if (p.endsAt && now >= Date.parse(p.endsAt)) return false;
  return true;
}

/** «ещё 5 дн.» / «ещё 3 ч» till the end */
export function promoLeft(p: SitePromo, now = Date.now()): string | null {
  if (!p.endsAt) return null;
  const ms = Date.parse(p.endsAt) - now;
  if (ms <= 0) return null;
  const h = Math.ceil(ms / 3600_000);
  return h > 48 ? `ещё ${Math.ceil(ms / 86400_000)} дн.` : h > 1 ? `ещё ${h} ч` : "последний час";
}

/** the quick filters with «Со скидкой» first while the promo asks for it */
export function saleFirst<T extends { key: string }>(list: T[], promo: SitePromo | null): T[] {
  if (!promo?.saleFirst) return list;
  const i = list.findIndex((q) => q.key === "sale");
  return i > 0 ? [list[i], ...list.slice(0, i), ...list.slice(i + 1)] : list;
}
