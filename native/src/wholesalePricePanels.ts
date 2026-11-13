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
  const retail = positive(product.promoRetailPrice);
  const opt = positive(product.promoWholesalePrice);
  const big = positive(product.promoBigWholesalePrice);
  if (retail === null && opt === null && big === null) return { regular, promotion: null };
  return { regular, promotion: [
    { ...COLUMNS[0], value: retail ?? regular[0].value },
    { ...COLUMNS[1], label: "Акция опт", value: opt },
    { ...COLUMNS[2], label: "Акция крупный опт", value: big },
  ] };
}

export type WholesaleComparisonCell = WholesalePriceCell & { oldValue: number | null; saving: number };
/** Compare each tariff with its own ordinary price; never invent savings. */
export function wholesalePriceComparison(
  product: Product, customer: Pick<Customer, "priceType" | "hasCard"> | null, now = Date.now()
): { cells: WholesaleComparisonCell[]; onSale: boolean } | null {
  const panels = wholesalePricePanels(product, customer, now);
  if (!panels) return null;
  const cells = panels.regular.map((regular, i) => {
    const value = panels.promotion?.[i]?.value ?? regular.value;
    const saving = regular.value !== null && value !== null ? Math.max(0, regular.value - value) : 0;
    return { ...regular, value, saving, oldValue: saving > 0 ? regular.value : null };
  });
  return { cells, onSale: cells.some(cell => cell.saving > 0) };
}
