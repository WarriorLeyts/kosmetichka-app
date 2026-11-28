import { expect, it } from "vitest";
import { calculateCart, hasPendingFranchisePrices, priceFor, cartPriceTier } from "./pricing";
import { mergeCartProductPrices } from "./cartProductSnapshot";

it("keeps franchise prices independent of order thresholds and retail shock prices", () => {
  const p = { id: 1, name: "Товар", quantity: 1000, franchisePrice: 250, retailPrice: 700, discountPrice: 600, wholesalePrice: 500, bigWholesalePrice: 400, promoRetailPrice: 10 };
  expect(priceFor(p, "franchise")).toBe(250);
  expect(cartPriceTier([p], { priceType: "franchise" })).toBe("franchise");
  expect(calculateCart([p], { priceType: "franchise" }).total).toBe(250000);
  expect(hasPendingFranchisePrices([{ ...p, franchisePrice: null }], { priceType: "franchise" })).toBe(true);
  expect(priceFor({ ...p, franchisePrice: null }, "franchise")).toBe(0);
});

it("does not retain an old franchise price after a fresh response withdraws it", () => {
  const p = mergeCartProductPrices({ id: 1, name: "Товар", franchisePrice: null, regularPrices: { franchisePrice: null } }, { id: 1, name: "Товар", franchisePrice: 100, regularPrices: { franchisePrice: 100 } });
  expect(priceFor(p, "franchise")).toBe(0);
});
