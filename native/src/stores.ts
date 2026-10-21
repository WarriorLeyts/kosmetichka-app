/**
 * Shops for the «Наши магазины» screen. Fill in real data — the screen shows
 * an empty state until at least one shop is listed.
 */
export type Shop = {
  name: string;
  address: string;
  hours?: string;
  phone?: string;
  /** link to the shop on Yandex Maps / 2GIS (opens in the browser) */
  mapUrl?: string;
  /** photo URL (optional) */
  photo?: string;
};

export const SHOPS: Shop[] = [];
