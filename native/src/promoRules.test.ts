import { describe, expect, it } from "vitest";
import { promoLeft, promoLive, saleFirst } from "./promoRules";
import type { SitePromo } from "./api";

const p: SitePromo = {
  name: "Светлая пятница",
  startsAt: "2026-11-13T00:00:00+03:00",
  endsAt: "2026-12-01T00:00:00+03:00",
  active: false,
  accent: "#e82c87",
  strip: { text: "x", link: null, countdown: true },
  banners: [],
  saleFirst: true,
};
const msk = (s: string) => Date.parse(`${s}+03:00`);

describe("promo", () => {
  it("runs from 13.11 00:00 to 30.11 23:59 Moscow", () => {
    expect(promoLive(p, msk("2026-11-12T23:59:59"))).toBe(false);
    expect(promoLive(p, msk("2026-11-13T00:00:00"))).toBe(true);
    expect(promoLive(p, msk("2026-11-30T23:59:59"))).toBe(true);
    expect(promoLive(p, msk("2026-12-01T00:00:00"))).toBe(false);
    expect(promoLive(null)).toBe(false);
  });
  it("puts «Со скидкой» first only when asked", () => {
    const l = [{ key: "new" }, { key: "sale" }, { key: "gift" }];
    expect(saleFirst(l, p).map((x) => x.key)).toEqual(["sale", "new", "gift"]);
    expect(saleFirst(l, { ...p, saleFirst: false })).toBe(l);
    expect(saleFirst(l, null)).toBe(l);
  });
  it("counts the time left", () => {
    expect(promoLeft(p, msk("2026-11-13T00:00:00"))).toBe("ещё 18 дн.");
    expect(promoLeft(p, msk("2026-11-30T20:00:00"))).toBe("ещё 4 ч");
    expect(promoLeft(p, msk("2026-12-01T00:00:01"))).toBe(null);
  });
});
