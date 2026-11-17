import { useSyncExternalStore } from "react";
import { campaignRevision, getPricingCampaign, subscribeCampaign } from "./campaignRuntime";
/** Keep mounted price consumers current without resetting forms or cart selections. */
export function useCampaign() {
  useSyncExternalStore(subscribeCampaign, campaignRevision, campaignRevision);
  return getPricingCampaign();
}
