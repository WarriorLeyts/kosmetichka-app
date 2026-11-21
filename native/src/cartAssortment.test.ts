import { describe, expect, it, vi } from "vitest";
import { cartSelectionKey, cartVariantIssue, loadCartProducts, replaceCartVariants } from "./cartAssortment";
import type { CartItem, Product, Variant } from "./types";
const rose: Variant = { id: 7, imageId: 70, name: "Роза", imageUrl: "rose.jpg" };
const vanilla: Variant = { id: 8, imageId: 80, name: "Ваниль", imageUrl: "vanilla.jpg" };
const product: Product = { id: 1, name: "Парфюм Люкс ассортимент 40мл", assortmentEnabled: true, stock: 500, variants: [rose, vanilla].map(v => ({ ...v, image: { path: v.imageUrl } })) };
const other: CartItem = { id: 2, name: "Другой товар", cartKey: "2", quantity: 400, retailPrice: 1000 };
const rows: CartItem[] = [other, { ...product, cartKey: "1", quantity: 1 }, { ...product, cartKey: "1_v7", variantId: 7, variantName: "Роза", quantity: 10 }];
const entries = [{ variant: rose, quantity: 10 }, { variant: vanilla, quantity: 1 }];

describe("old cart assortment selection", () => {
  it("identifies the one unselected item without declaring available variants unavailable", () => {
    expect(cartVariantIssue(rows[1], product)).toBe("required");
    expect(cartVariantIssue(rows[2], product)).toBeUndefined();
    expect(cartVariantIssue({ variantId: 99, variantName: "Роза" }, product)).toBe("unavailable");
    expect(cartVariantIssue({ variantName: "Роза" }, product)).toBeUndefined();
    expect(cartVariantIssue({}, { ...product, assortmentEnabled: false })).toBeUndefined();
  });
  it("keeps a renamed stable ID valid and does not infer removal from omitted metadata", () => {
    expect(cartVariantIssue({ variantId: 7, variantName: "Old name" }, product)).toBeUndefined();
    expect(cartVariantIssue({ variantId: 7 }, { ...product, variants: undefined })).toBeUndefined();
    expect(cartVariantIssue({ variantId: 7 }, { ...product, variants: [] })).toBe("unavailable");
  });
  it("redistributes 1 unspecified + 10 selected units, retaining all 411 goods and the untouched product", () => {
    const original = JSON.stringify(rows);
    const after = replaceCartVariants(rows, product, entries, cartSelectionKey(rows, 1));
    expect(after.reduce((s, i) => s + i.quantity, 0)).toBe(411);
    expect(after[0]).toBe(other);
    expect(after.slice(1).map(i => [i.cartKey, i.quantity])).toEqual([["1_v7", 10], ["1_v8", 1]]);
    expect(after.some(i => i.id === 1 && !i.variantId)).toBe(false);
    expect(JSON.stringify(rows)).toBe(original);
  });
  it("does not silently remove or add units while replacing", () => {
    const key = cartSelectionKey(rows, 1);
    expect(() => replaceCartVariants(rows, product, [{ variant: rose, quantity: 10 }], key)).toThrow("Распределите все 11");
    expect(() => replaceCartVariants(rows, product, [{ variant: rose, quantity: 12 }], key)).toThrow("Распределите все 11");
  });
  it("cannot overwrite a parallel cart change or save twice over an outdated snapshot", () => {
    const key = cartSelectionKey(rows, 1);
    const changed = rows.map(i => i.cartKey === "1" ? { ...i, quantity: 2 } : i);
    expect(() => replaceCartVariants(changed, product, entries, key)).toThrow("Корзина изменилась");
    const once = replaceCartVariants(rows, product, entries, key);
    expect(() => replaceCartVariants(once, product, entries, key)).toThrow("Корзина изменилась");
  });
  it("rejects reduced stock and duplicate variant keys", () => {
    const key = cartSelectionKey(rows, 1);
    expect(() => replaceCartVariants(rows, { ...product, stock: 10 }, entries, key)).toThrow("Остаток уменьшился");
    expect(() => replaceCartVariants(rows, product, [{ variant: rose, quantity: 10 }, { variant: rose, quantity: 1 }], key)).toThrow("дважды");
  });
});

describe("large cart refresh", () => {
  it("refreshes all 241 products instead of silently stopping at 120", async () => {
    const ids = Array.from({ length: 241 }, (_, i) => i + 1);
    const read = vi.fn(async (batch: number[]) => ({ products: batch.map(id => ({ id, name: String(id) })) }));
    const result = await loadCartProducts([...ids, 1], read);
    expect(read.mock.calls.map(c => c[0].length)).toEqual([120, 120, 1]);
    expect(result.size).toBe(241); expect(result.has(241)).toBe(true);
  });
  it("does not treat a failed request as removed products", async () => {
    await expect(loadCartProducts([1], async () => { throw new Error("offline"); })).rejects.toThrow("offline");
  });
});
