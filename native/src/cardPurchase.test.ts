import { describe, expect, it } from "vitest";
import { cardPricingCustomer } from "./cardPurchase";
import { calculateCart } from "./pricing";
import { cartProductSnapshot } from "./cartProductSnapshot";
const customer = { priceType: "retail", hasCard: false };
const goods = { id: 1, name: "Товар", retailPrice: 1200, discountPrice: 1000, quantity: 2 };
const card = { id: 2, name: "Карта Косметичка", retailPrice: 990, discountPrice: 990, quantity: 1, cardRegistration: { fullName: "Иванова Анна", birthDate: "01.01.1990" } };
describe("card purchase cart", () => {
  it("adds and removes the cart entitlement without changing the real customer", () => {
    const items = [goods, card];
    expect(calculateCart([goods], cardPricingCustomer([goods], customer)).total).toBe(2400);
    expect(calculateCart(items, cardPricingCustomer(items, customer)).total).toBe(2990);
    expect(calculateCart([goods], cardPricingCustomer([goods], customer)).total).toBe(2400);
    expect(customer.hasCard).toBe(false);
  });
  it("supports buying just the card and keeps registration through the cart snapshot", () => {
    const saved = { ...cartProductSnapshot(card), quantity: 1 };
    expect(saved.cardRegistration).toEqual(card.cardRegistration);
    expect(calculateCart([saved], cardPricingCustomer([saved], customer)).total).toBe(990);
  });
  it("removing the purchase preserves an already active discount card", () => {
    const existing = { ...customer, hasCard: true };
    expect(calculateCart([goods], cardPricingCustomer([goods], existing)).total).toBe(2000);
  });
});
