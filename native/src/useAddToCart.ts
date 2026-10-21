import { useCallback } from "react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { api } from "./api";
import { useCartStore } from "./store/cart";
import type { Product } from "./types";

/** Variant cache so a second tap doesn't hit the network again. */
const variantCount = new Map<number, number>();

/**
 * Add from a list card: products with variants (shades, sizes) open the product
 * screen to pick them, everything else goes straight into the cart.
 */
export function useAddToCart() {
  const add = useCartStore((s) => s.add);
  return useCallback(
    async (product: Product) => {
      let n = variantCount.get(product.id);
      if (n === undefined) {
        try {
          const r = await api.variants(product.id);
          n = r.variants?.length ?? 0;
        } catch {
          n = 0;
        }
        variantCount.set(product.id, n);
      }
      if (n > 0) {
        router.push(`/product/${product.id}?pick=1`);
        return;
      }
      add(product);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
    [add]
  );
}
