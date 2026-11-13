import { describe,expect,it } from "vitest";
import { cartProductSnapshot,mergeCartProductPrices } from "./cartProductSnapshot";
import { calculateCart,priceFor,bigWholesaleMinOrder,nextPriceTier } from "./pricing";
import type { Product } from "./types";
const during=Date.parse("2026-11-13T12:00:00+03:00");
const after=Date.parse("2026-12-01T00:00:00+03:00");
const opt={priceType:"wholesale"};
const vt:Product={id:111798,name:"VT Cosmetics",retailPrice:1699,discountPrice:1699,
  wholesalePrice:1168,bigWholesalePrice:1168,promoRetailPrice:1699,promoWholesalePrice:1168,promoBigWholesalePrice:1168,
  regularPrices:{retailPrice:2090,discountPrice:1880,wholesalePrice:1400,bigWholesalePrice:1260}};
describe("persisted campaign cart prices",()=>{
  it("preserves promotion metadata and applies the correct column at each order threshold",()=>{
    const item={...JSON.parse(JSON.stringify(cartProductSnapshot(vt))),quantity:1};
    expect(calculateCart([item],opt,during).total).toBe(1699);
    expect(priceFor(item,"wholesale",during)).toBe(1168);
    expect(calculateCart([{...item,quantity:5}],opt,during).total).toBe(5840);
    expect(priceFor(item,"discount",during)).toBe(1699);
    expect(nextPriceTier([item],opt,during)).toEqual({type:"wholesale",need:3832,save:531});
    expect(calculateCart([item],opt,after).total).toBe(1880);
  });
  it("uses retail promo for retail customers and ordinary discount for non-shock wholesale goods",()=>{
    expect(calculateCart([{...vt,quantity:1}],{priceType:"retail"},during).total).toBe(1699);
    expect(calculateCart([{...vt,promoRetailPrice:null,quantity:1}],opt,during).total).toBe(1880);
  });
  it("refreshes an old cart with promotion metadata, and honors an explicit withdrawal",()=>{
    const old={id:vt.id,name:vt.name,discountPrice:1699,wholesalePrice:1168};
    const fresh=mergeCartProductPrices(cartProductSnapshot(vt),old);
    expect(calculateCart([{...fresh,quantity:1}],opt,during).total).toBe(1699);
    const withdrawn=mergeCartProductPrices(cartProductSnapshot({...vt,promoRetailPrice:null}),fresh);
    expect(calculateCart([{...withdrawn,quantity:1}],opt,during).total).toBe(1880);
  });
  it("keeps hidden wholesale metadata on guest refresh without losing regular prices",()=>{
    const guest=cartProductSnapshot({id:vt.id,name:vt.name,retailPrice:1699,discountPrice:1699,promoRetailPrice:1699,
      regularPrices:{retailPrice:2090,discountPrice:1880}});
    const merged=mergeCartProductPrices(guest,vt);
    expect(merged.promoWholesalePrice).toBe(1168);
    expect(merged.regularPrices?.wholesalePrice).toBe(1400);
  });
  it("uses the campaign threshold and excludes shock goods from the additional discount",()=>{
    expect(bigWholesaleMinOrder(during)).toBe(25000);
    expect(bigWholesaleMinOrder(after)).toBe(50000);
    const r=calculateCart([{bigWholesalePrice:800,quantity:100},
      {bigWholesalePrice:220,promoBigWholesalePrice:200,quantity:100}],opt,during);
    expect(r).toMatchObject({tier:"big_wholesale",subtotal:100000,percent:3,eligibleSubtotal:80000,discount:2400,total:97600});
  });
});

describe("temporary big-wholesale boundary",()=>{
  it("switches at exactly 25000 and restores 50000 after the campaign",()=>{
    const cart=[{retailPrice:30000,discountPrice:29000,wholesalePrice:26000,bigWholesalePrice:25000,quantity:1}];
    expect(calculateCart(cart,opt,during).tier).toBe("big_wholesale");
    expect(calculateCart([{...cart[0],bigWholesalePrice:24999}],opt,during).tier).toBe("wholesale");
    expect(calculateCart(cart,opt,after).tier).toBe("wholesale");
    expect(calculateCart([{...cart[0],bigWholesalePrice:50000}],opt,after).tier).toBe("big_wholesale");
  });
});
