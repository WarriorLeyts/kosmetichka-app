/**
 * Loyalty card data. For now — fixed test data (the owner's card);
 * later it comes from MAXMA by the customer's phone number.
 */
export type LoyaltyCard = {
  level: string; // «VIP»
  name: string; // «ЛАЛА»
  cashback: string; // «5%»
  bonuses: number;
  barcode: string; // EAN-13
};

export const TEST_CARD: LoyaltyCard = {
  level: "VIP",
  name: "ЛАЛА",
  cashback: "5%",
  bonuses: 1000,
  barcode: "9900164815148",
};
