import type { Product } from "./types";
export const CARD_PRICE = 990;
/** A cart-only entitlement. Never persist it in the customer's account. */
export function cardPricingCustomer<T extends { priceType?: string | null; hasCard?: boolean }>(items: Product[], customer: T | null): T | null {
  return !!customer && ["retail", "discount"].includes(customer.priceType ?? "") && !customer.hasCard && items.some((i) => i.cardRegistration)
    ? { ...customer, hasCard: true } : customer;
}
