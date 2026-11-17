import { afterEach, expect, it } from "vitest";
import { LEGACY_CAMPAIGN } from "./campaign";
import {setPricingCampaign, subscribeCampaign} from "./campaignRuntime";
import {calculateCart, priceFor} from "./pricing";
import {retailPricePromotion} from "./retailPricePromotion";
import {wholesalePricePanels} from "./wholesalePricePanels";
afterEach(()=>setPricingCampaign(LEGACY_CAMPAIGN));
it("updates an already-open app from server settings, including panels, expiry and off switch",()=>{
 let notifications=0;const unsubscribe=subscribeCampaign(()=>notifications++);
 const campaign={...LEGACY_CAMPAIGN, startsAt:"2026-12-10T00:00:00+03:00",endsAt:"2026-12-13T00:00:00+03:00",discountSteps:[{from:1000,percent:8}]};
 setPricingCampaign(campaign);const now=Date.parse("2026-12-11T00:00:00+03:00");
 const product={id:1,name:"Товар",retailPrice:2000,discountPrice:1800,wholesalePrice:1500,bigWholesalePrice:1300,promoRetailPrice:1000,quantity:1} as any;
 expect(priceFor(product,"retail",now)).toBe(1000);expect(retailPricePromotion(product,null,now)?.price).toBe(1000);
 expect(wholesalePricePanels(product,{priceType:"wholesale"},now)?.promotion).not.toBeNull();
 expect(calculateCart([product],{priceType:"big_wholesale"},now).discount).toBe(104);
 setPricingCampaign({...campaign,enabled:false});expect(priceFor(product,"retail",now)).toBe(2000);expect(retailPricePromotion(product,null,now)).toBeNull();expect(wholesalePricePanels(product,{priceType:"wholesale"},now)?.promotion).toBeNull();
 setPricingCampaign(campaign);expect(priceFor(product,"retail",Date.parse(campaign.endsAt))).toBe(2000);expect(notifications).toBeGreaterThanOrEqual(3);unsubscribe();
});
