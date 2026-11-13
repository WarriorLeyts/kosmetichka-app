import { describe, expect, it } from "vitest";
import { wholesalePricePanels } from "./wholesalePricePanels";
import type { Product } from "./types";

const during = Date.parse("2026-11-15T12:00:00+03:00");
const product: Product = {
  id: 1, name: "Test", retailPrice: 399, discountPrice: 399, wholesalePrice: 168, bigWholesalePrice: 160,
  promoWholesalePrice: 168, promoBigWholesalePrice: 160,
  regularPrices: { retailPrice: 490, discountPrice: 440, wholesalePrice: 190, bigWholesalePrice: 180 },
};
const opt = { priceType: "wholesale" };

describe("wholesale old and promotional price pills", () => {
  it("uses ordinary 1C prices above and matching promotion prices below", () => {
    const p = wholesalePricePanels(product, opt, during)!;
    expect(p.regular.map(r => r.label)).toEqual(["Скидка", "Опт", "Кр. опт"]);
    expect(p.regular.map(r => r.value)).toEqual([440, 190, 180]);
    expect(p.promotion?.map(r => r.label)).toEqual(["Скидка", "Акция опт", "Акция крупный опт"]);
    expect(p.promotion?.map(r => r.value)).toEqual([440, 168, 160]);
  });
  it("shows the same three columns for customers assigned big wholesale", () => {
    const p = wholesalePricePanels(product, { priceType: "big_wholesale" }, during)!;
    expect(p.regular).toHaveLength(3);
    expect(p.promotion).toHaveLength(3);
    expect(p.promotion?.map(r => r.key)).toEqual(p.regular.map(r => r.key));
  });
  it("does not change retail or guest price panels", () => {
    for (const customer of [null, { priceType: "retail" }, { priceType: "retail", hasCard: true }, { priceType: "discount" }]) {
      expect(wholesalePricePanels(product, customer, during)).toBeNull();
    }
  });
  it("does not invent an action price when only one promotional tariff exists", () => {
    const p = wholesalePricePanels({ ...product, promoBigWholesalePrice: null }, opt, during)!;
    expect(p.promotion?.map(r => r.value)).toEqual([440, 168, null]);
  });
  it("keeps just the ordinary pill when promotional prices are missing, zero or invalid", () => {
    for (const value of [undefined, null, 0, -1, NaN, Infinity]) {
      expect(wholesalePricePanels({ ...product, promoWholesalePrice: value, promoBigWholesalePrice: value }, opt, during)?.promotion).toBeNull();
    }
  });
  it("does not show the promotional pill outside the promotion dates", () => {
    expect(wholesalePricePanels(product, opt, Date.parse("2026-11-12T23:59:59.999+03:00"))?.promotion).toBeNull();
    expect(wholesalePricePanels(product, opt, Date.parse("2026-12-01T00:00:00+03:00"))?.promotion).toBeNull();
  });
  it("preserves the ordinary fallback chain for products with no wholesale price", () => {
    const p = wholesalePricePanels({ id: 2, name: "Legacy", retailPrice: 490 }, opt, during)!;
    expect(p.regular.map(r => r.value)).toEqual([490, 490, 490]);
    expect(p.promotion).toBeNull();
  });
});
