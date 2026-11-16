import { useCartStore } from "./store/cart";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./store/storage", () => ({ persistStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } }));
const p = { id: 7, name: "Ассорти", stock: 5, assortmentEnabled: true, minOrderQty: 1 };
const rose = { id: 1, imageId: 1, name: "Роза", imageUrl: "rose" };
const vanilla = { id: 2, imageId: 2, name: "Ваниль", imageUrl: "vanilla" };
beforeEach(() => useCartStore.getState().clear());
describe("shared assortment stock", () => {
  it("keeps separate photos and names but caps their combined quantity", () => {
    useCartStore.getState().addVariants(p, [{ variant: rose, quantity: 2 }, { variant: vanilla, quantity: 3 }]);
    useCartStore.getState().addVariants(p, [{ variant: rose, quantity: 1 }]);
    expect(useCartStore.getState().count()).toBe(5);
    expect(useCartStore.getState().items.map(i => [i.variantName, i.variantImageUrl, i.quantity])).toEqual([["Роза", "rose", 2], ["Ваниль", "vanilla", 3]]);
    useCartStore.getState().setQuantity("7_v1", 5);
    expect(useCartStore.getState().quantityOf("7_v1")).toBe(2);
    useCartStore.getState().remove("7_v2");
    useCartStore.getState().setQuantity("7_v1", 5);
    expect(useCartStore.getState().quantityOf("7_v1")).toBe(5);
  });
  it("never adds unavailable stock or non-finite quantities", () => {
    useCartStore.getState().addVariants({ ...p, stock: 0 }, [{ variant: rose, quantity: 1 }]);
    useCartStore.getState().addVariants(p, [{ variant: rose, quantity: NaN }]);
    expect(useCartStore.getState().items).toEqual([]);
  });
});
