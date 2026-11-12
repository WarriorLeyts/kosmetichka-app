import { describe, expect, it } from "vitest";
import { cartPriceTier, nextPriceTier, priceFor, resolveCustomerPriceType } from "./pricing";

// The site prices the order with the same rules (lib/pricing.ts, lib/orderPricing.ts) — keep them identical
const p = (o: Partial<Record<"retailPrice" | "discountPrice" | "wholesalePrice" | "bigWholesalePrice", number>>, quantity = 1) => ({ ...o, quantity });

describe("the customer's price type", () => {
  it("guest, retail with / without a card, wholesale, big wholesale", () => {
    expect(resolveCustomerPriceType(null)).toBe("guest");
    expect(resolveCustomerPriceType({ priceType: "retail" })).toBe("retail");
    expect(resolveCustomerPriceType({ priceType: "retail", hasCard: true })).toBe("discount");
    expect(resolveCustomerPriceType({ priceType: "wholesale" })).toBe("wholesale");
    expect(resolveCustomerPriceType({ priceType: "big_wholesale" })).toBe("big_wholesale");
  });
});

describe("a missing price falls back like the server", () => {
  const x = p({ retailPrice: 1000, discountPrice: 900, wholesalePrice: 700 });
  it("big wholesale → wholesale → retail", () => {
    expect(priceFor(x, "big_wholesale")).toBe(700);
    expect(priceFor(p({ retailPrice: 1000 }), "big_wholesale")).toBe(1000);
  });
  it("discount / guest → retail; zero counts as missing; whole roubles", () => {
    expect(priceFor(p({ retailPrice: 1000, discountPrice: 0 }), "guest")).toBe(1000);
    expect(priceFor(p({ retailPrice: 999.6 }), "retail")).toBe(1000);
    expect(priceFor(p({}), "wholesale")).toBe(0);
  });
});

describe("«Опт»: the price by the order sum", () => {
  const opt = { priceType: "wholesale" };
  const item = (q: number) => p({ retailPrice: 1000, discountPrice: 900, wholesalePrice: 700, bigWholesalePrice: 600 }, q);
  it("under 5 000 ₽ in wholesale prices — the discount price", () => {
    expect(cartPriceTier([item(7)], opt)).toBe("discount"); // 4 900
  });
  it("from 5 000 ₽ — wholesale, from 50 000 ₽ in big-wholesale prices — big wholesale", () => {
    expect(cartPriceTier([item(8)], opt)).toBe("wholesale"); // 5 600
    expect(cartPriceTier([item(84)], opt)).toBe("big_wholesale"); // 50 400
  });
  it("the hint: how much to add and how much it saves", () => {
    expect(nextPriceTier([item(7)], opt)).toEqual({ type: "wholesale", need: 100, save: 1400 });
    expect(nextPriceTier([item(84)], opt)).toBeNull();
    expect(nextPriceTier([item(7)], { priceType: "retail" })).toBeNull();
  });
  it("other customers keep their own type at any sum", () => {
    expect(cartPriceTier([item(100)], { priceType: "retail" })).toBe("retail");
  });
});
