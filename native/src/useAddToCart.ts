import { useCallback } from "react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { api } from "./api";
import { useCartStore } from "./store/cart";
import type { Product } from "./types";
import { seedProduct } from "./productSeed";

/** Variant cache so a second tap doesn't hit the network again. */
const variantCount = new Map<number, number>();
const inFlight = new Map<number, Promise<number | null>>();

/** Number of variants; null when the request failed (not cached, so it is retried next time). */
function variantsOf(id: number): Promise<number | null> {
  const known = variantCount.get(id);
  if (known !== undefined) return Promise.resolve(known);
  let p = inFlight.get(id);
  if (!p) {
    p = api
      .variants(id)
      .then((r) => {
        const n = r.variants?.length ?? 0;
        variantCount.set(id, n);
        return n;
      })
      .catch(() => null)
      .finally(() => inFlight.delete(id));
    inFlight.set(id, p);
  }
  return p;
}

/**
 * Add from a list card: products with variants (shades, sizes) open the product
 * screen to pick them, everything else goes straight into the cart.
 */
export function useAddToCart() {
  const add = useCartStore((s) => s.add);
  return useCallback(
    async (product: Product) => {
      // a second fast tap while the first one is still checking does nothing
      if (inFlight.has(product.id)) return;
      const n = await variantsOf(product.id);
      if (n === null || n > 0) {
        // has variants (or we couldn't check) — choose on the product screen
        seedProduct(product);
        router.push(`/product/${product.id}?pick=1`);
        return;
      }
      add(product);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
    [add]
  );
}
