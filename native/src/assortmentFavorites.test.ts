import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFavorites } from "./store/favorites";
vi.mock("./store/storage", () => ({ persistStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } }));

const variants = Array.from({ length: 69 }, (_, i) => ({ id: i + 1, imageId: i + 1, name: `Вид ${i + 1}`, image: { path: `${i}.jpg` } }));
const product = { id: 113321, name: "Парфюм Турция Ассортимент", stock: 100, assortmentEnabled: true, variants };
beforeEach(() => useFavorites.getState().clear());
describe("assortment in favourites", () => {
  it("keeps the assortment flag and all 69 previews when saved locally", () => {
    useFavorites.getState().toggle(product);
    expect(useFavorites.getState().items[0]).toMatchObject({ assortmentEnabled: true, variants });
  });
  it("restores metadata missing in old snapshots and reflects later disabling", () => {
    useFavorites.getState().toggle({ id: product.id, name: product.name, stock: 1 });
    useFavorites.getState().refreshProducts(new Map([[product.id, product]]));
    expect(useFavorites.getState().items[0]).toMatchObject({ assortmentEnabled: true, variants });
    useFavorites.getState().refreshProducts(new Map([[product.id, { ...product, assortmentEnabled: false, variants: [] }]]));
    expect(useFavorites.getState().items[0]).toMatchObject({ assortmentEnabled: false, variants: [] });
  });
});
