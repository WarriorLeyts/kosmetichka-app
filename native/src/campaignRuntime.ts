import { LEGACY_CAMPAIGN, campaignActive, type Campaign } from "./campaign";
let campaign = LEGACY_CAMPAIGN;
let revision = 0;
let live = campaignActive(campaign);
const listeners = new Set<() => void>();
export const getPricingCampaign = () => campaign;
export const campaignRevision = () => revision;
export function subscribeCampaign(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function setPricingCampaign(next: Campaign) {
  const changed = JSON.stringify(next) !== JSON.stringify(campaign) || live !== campaignActive(next);
  campaign = next; live = campaignActive(next);
  if (changed) { revision++; listeners.forEach(fn => fn()); }
}
