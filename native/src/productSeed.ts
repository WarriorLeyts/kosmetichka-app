import type { Product } from "./types";

/**
 * The list item a product screen was opened from: the screen shows its name, photo and
 * prices at once while the full product (description, all photos) loads.
 */
const seeds = new Map<number, Product>();

export function seedProduct(p: Product) {
  seeds.set(p.id, p);
  if (seeds.size > 200) seeds.delete(seeds.keys().next().value as number);
}

export function takeSeed(id: unknown): Product | null {
  const n = Number(id);
  return Number.isFinite(n) ? seeds.get(n) ?? null : null;
}
