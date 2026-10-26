/**
 * Loyalty card shown in «Профиль». It comes from MAXMA through the site
 * (GET /api/mobile/loyalty, found by the customer's phone number);
 * customers without a card in MAXMA see nothing.
 */
export type LoyaltyCard = {
  level: string | null; // MAXMA level name, e.g. «VIP»
  name: string; // customer's name on the card
  cashback: string | null; // «5%» — by level, configured on the site
  bonuses: number;
  pendingBonuses: number;
  barcode: string; // card number (EAN-13 or any other format)
};
