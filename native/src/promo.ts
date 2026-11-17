import { LEGACY_CAMPAIGN, type Campaign } from "./campaign";
import { setPricingCampaign } from "./campaignRuntime";
/**
 * The promotion's look (admin panel → Акция): its colour instead of the brand violet, a strip on top,
 * its banners first on the home page and «Со скидкой» first. It switches itself on and off by the dates
 * set there (the server's answer is cached, the clock here does the rest), so the app goes back to its
 * usual look at the end without anyone touching it.
 *
 * The colour needs the app to re-mount (see app/_layout.tsx). It is applied at start; when the promo
 * starts or ends while the app is open, the colour waits until the customer leaves the app and comes
 * back — a re-mount would wipe a half-filled form. The strip and the banners change at once.
 */
import { AppState } from "react-native";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, type SitePromo } from "@/api";
import { persistStorage } from "@/store/storage";
import { setAccent } from "@/theme";
import { promoLive } from "@/promoRules";
export { promoLeft, promoLive, saleFirst } from "@/promoRules";

type PromoState = {
  promo: SitePromo | null;
  campaign: Campaign;
  /** runs right now (by the dates) */
  live: boolean;
  /** changes when the colour changes — part of the app's re-mount key */
  accentKey: string;
};

export const usePromo = create<PromoState>()(
  persist(() => ({ promo: null, campaign: LEGACY_CAMPAIGN, live: false, accentKey: "base" }) as PromoState, {
    name: "kosmetichka-promo",
    version: 1,
    storage: persistStorage,
    partialize: (s) => ({ promo: s.promo, campaign: s.campaign }) as PromoState,
    onRehydrateStorage: () => (state) => {
      if (state) { setPricingCampaign(state.campaign ?? LEGACY_CAMPAIGN); refresh(state.promo, true); }
    },
  })
);

/** the promo now running, or null */
export const useLivePromo = () => usePromo((s) => (s.live ? s.promo : null));

const startedAt = Date.now();
let pendingColour = false;

function refresh(promo: SitePromo | null, colourNow = false) {
  setPricingCampaign(usePromo.getState().campaign ?? LEGACY_CAMPAIGN);
  const live = promoLive(promo);
  const want = live && promo ? promo.accent : null;
  // a re-mount right after start is harmless (nothing typed yet); later it waits for a return to the app
  const early = Date.now() - startedAt < 8000;
  let accentKey = usePromo.getState().accentKey;
  if (colourNow || early || AppState.currentState !== "active") {
    if (setAccent(want)) accentKey = want ?? "base";
    pendingColour = false;
  } else {
    pendingColour = (want ?? "base") !== accentKey;
  }
  usePromo.setState({ promo, live, accentKey });
}

let started = false;
let lastFetch = 0;
async function load() {
  lastFetch = Date.now();
  try {
    const r = await api.sitePromo();
    if (r.campaign) { setPricingCampaign(r.campaign); usePromo.setState({ campaign: r.campaign }); }
    refresh(r.promo);
  } catch {
    // offline: keep what was saved, the dates still switch it
  }
}

/** call once at app start */
export function startPromo() {
  if (started) return;
  started = true;
  load();
  setInterval(() => {
    if (Date.now() - lastFetch > 60_000) load();
    else refresh(usePromo.getState().promo);
  }, 30_000);
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
  AppState.addEventListener("change", (st) => {
    if (st !== "active") return;
    if (pendingColour) refresh(usePromo.getState().promo, true);
    if (Date.now() - lastFetch > 60_000) load();
  });
}
