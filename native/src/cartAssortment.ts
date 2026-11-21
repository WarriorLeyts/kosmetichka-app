import type { CartItem, Product, Variant } from "./types";

export function cartVariantIssue(item: Pick<CartItem, "variantId" | "variantName">, product: Product): "required" | "unavailable" | undefined {
  if (!product.assortmentEnabled) return undefined;
  if (item.variantId == null && !item.variantName) return "required";
  if (!Array.isArray(product.variants)) return undefined;
  return product.variants.some(v => item.variantId != null ? v.id === item.variantId : v.name === item.variantName) ? undefined : "unavailable";
}
export function cartSelectionKey(items: CartItem[], productId: number) {
  return JSON.stringify(items.filter(i => i.id === productId).map(i => [i.cartKey, i.quantity, i.variantId ?? null, i.variantName ?? null]));
}
/** Redistribute the existing quantity atomically, preserving all other goods. */
export function replaceCartVariants(items: CartItem[], product: Product, entries: { variant: Variant; quantity: number }[], expected: string): CartItem[] {
  if (cartSelectionKey(items, product.id) !== expected) throw new Error("Корзина изменилась. Откройте выбор видов заново.");
  const previous = items.filter(i => i.id === product.id).reduce((s, i) => s + i.quantity, 0);
  const selected = entries.filter(e => e.quantity > 0);
  if (!previous || selected.some(e => !Number.isInteger(e.quantity) || e.quantity < 1) || selected.reduce((s, e) => s + e.quantity, 0) !== previous) throw new Error(`Распределите все ${previous} шт. по видам.`);
  if (product.stock != null && previous > product.stock) throw new Error("Остаток уменьшился. Сначала уменьшите количество в корзине.");
  if (new Set(selected.map(e => e.variant.id)).size !== selected.length) throw new Error("Вид выбран дважды.");
  const replaced: CartItem[] = selected.map(({ variant, quantity }) => ({ ...product, cartKey: `${product.id}_v${variant.id}`, quantity, variantId: variant.id, variantName: variant.name, variantImageUrl: variant.imageUrl, variantIssue: undefined, gone: false }));
  const first = items.findIndex(i => i.id === product.id);
  return [...items.slice(0, first).filter(i => i.id !== product.id), ...replaced, ...items.slice(first).filter(i => i.id !== product.id)];
}
/** The catalogue accepts at most 120 IDs per request, including in large carts. */
export async function loadCartProducts(ids: number[], read: (ids: number[]) => Promise<{ products: Product[] }>): Promise<Map<number, Product>> {
  const unique = [...new Set(ids)], chunks: number[][] = [];
  for (let i = 0; i < unique.length; i += 120) chunks.push(unique.slice(i, i + 120));
  const products: Product[] = [];
  for (let i = 0; i < chunks.length; i += 2) for (const result of await Promise.all(chunks.slice(i, i + 2).map(read))) products.push(...result.products);
  return new Map(products.map(p => [p.id, p]));
}
