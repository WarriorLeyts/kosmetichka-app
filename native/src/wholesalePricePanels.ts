import { priceFor, resolveCustomerPriceType, type PriceType } from "./pricing";
import type { Customer, Product } from "./types";

export type WholesalePriceCell = {
  key: "discount" | "wholesale" | "big_wholesale";
  label: string;
  value: number | null;
  color: string;
};
export type WholesalePricePanels = { regular: WholesalePriceCell[]; promotion: WholesalePriceCell[] | null };

const START = Date.parse("2026-11-13T00:00:00+03:00");
const END = Date.parse("2026-12-01T00:00:00+03:00");
const COLUMNS = [
  { key: "discount", label: "Скидка", color: "#6B4E8A" },
  { key: "wholesale", label: "Опт", color: "#c71f75" },
  { key: "big_wholesale", label: "Кр. опт", color: "#8b3dff" },
] as const;

function positive(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Only actual 1C prices: regular snapshot above, matching promotional prices below. */
export function wholesalePricePanels(
  product: Product, customer: Pick<Customer, "priceType" | "hasCard"> | null, now = Date.now()
): WholesalePricePanels | null {
  const type = resolveCustomerPriceType(customer);
  if (type !== "wholesale" && type !== "big_wholesale") return null;
  const ordinary = product.regularPrices ?? product;
  const regular = COLUMNS.map((c) => ({ ...c, value: positive(priceFor(ordinary, c.key as PriceType)) }));
  if (now < START || now >= END) return { regular, promotion: null };
  const opt = positive(product.promoWholesalePrice);
  const big = positive(product.promoBigWholesalePrice);
  if (opt === null && big === null) return { regular, promotion: null };
  return { regular, promotion: [
    { ...COLUMNS[0], value: regular[0].value },
    { ...COLUMNS[1], label: "Акция опт", value: opt },
    { ...COLUMNS[2], label: "Акция крупный опт", value: big },
  ] };
}
