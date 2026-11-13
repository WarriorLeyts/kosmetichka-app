import { describe, expect, it } from "vitest";
import { retailPricePromotion } from "./retailPricePromotion";
import type { Product } from "./types";
const during=Date.parse("2026-11-13T12:00:00+03:00");
const p:Product={id:1,name:"Jomtam",retailPrice:99,discountPrice:99,promoRetailPrice:99,
  regularPrices:{retailPrice:160,discountPrice:115}};
describe("retail promotion comparison",()=>{
  it("shows Jomtam's real old prices and two accurate savings",()=>{
    for(const customer of [null,{priceType:"retail"},{priceType:"retail",hasCard:true},{priceType:"discount"}])
      expect(retailPricePromotion(p,customer,during)).toEqual({retail:160,card:115,price:99,retailSaving:61,cardSaving:16});
  });
  it("never shows wholesale promotions to retail or retail panels to wholesalers",()=>{
    for(const priceType of ["wholesale","big_wholesale"])expect(retailPricePromotion(p,{priceType},during)).toBeNull();
    expect(retailPricePromotion({...p,promoRetailPrice:null,promoWholesalePrice:79},null,during)).toBeNull();
  });
  it("ignores invalid, equal, increased, and expired retail promotions",()=>{
    for(const value of [undefined,null,0,-1,NaN,Infinity,160,200])
      expect(retailPricePromotion({...p,promoRetailPrice:value},null,during)).toBeNull();
    expect(retailPricePromotion(p,null,Date.parse("2026-11-12T23:59:59.999+03:00"))).toBeNull();
    expect(retailPricePromotion(p,null,Date.parse("2026-12-01T00:00:00+03:00"))).toBeNull();
  });
  it("never claims card savings if the card price is already cheaper",()=>{
    expect(retailPricePromotion({...p,regularPrices:{retailPrice:160,discountPrice:90}},null,during)).toMatchObject({retailSaving:61,cardSaving:0});
  });
  it("does not invent missing old prices",()=>{
    expect(retailPricePromotion({...p,regularPrices:{retailPrice:null,discountPrice:115}},null,during)).toMatchObject({retail:null,card:115,retailSaving:0,cardSaving:16});
    expect(retailPricePromotion({...p,regularPrices:{}},null,during)).toBeNull();
  });
});
