import { novemberPromoActive, priceFor, resolveCustomerPriceType } from "./pricing";
import type { Customer, Product } from "./types";

export type RetailPromotion = { retail:number|null; card:number|null; price:number; retailSaving:number; cardSaving:number };
const positive = (value:unknown):number|null => {
  const n=Number(value), rounded=Math.round(n);
  return Number.isFinite(n) && rounded>0 ? rounded : null;
};

/** Retail promotions never borrow a wholesale tariff or invent an old price. */
export function retailPricePromotion(
  product:Product, customer:Pick<Customer,"priceType"|"hasCard">|null, now=Date.now()
):RetailPromotion|null {
  const role=resolveCustomerPriceType(customer);
  if(role==="wholesale"||role==="big_wholesale"||!novemberPromoActive(now))return null;
  const price=positive(product.promoRetailPrice);
  if(price===null)return null;
  const ordinary=product.regularPrices??product;
  const retail=positive(priceFor(ordinary,"retail",now));
  const card=positive(priceFor(ordinary,"discount",now));
  const retailSaving=retail===null?0:Math.max(0,retail-price);
  const cardSaving=card===null?0:Math.max(0,card-price);
  return retailSaving>0||cardSaving>0 ? {retail,card,price,retailSaving,cardSaving} : null;
}
