import { Alert } from "react-native";
import { useAssortmentPicker } from "./components/AssortmentPicker";
import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import { api } from "./api";
import { useCartStore } from "./store/cart";
import type { Product } from "./types";

const inFlight = new Set<number>();

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
      inFlight.add(product.id);
      try {
        const [fresh, result] = await Promise.all([api.product(product.id), api.variants(product.id)]);
        if (fresh.assortmentEnabled || result.variants.length) {
          useAssortmentPicker.getState().open(fresh, result.variants);
          return;
        }
        add(fresh);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch { Alert.alert("Не удалось загрузить товар", "Проверьте подключение и попробуйте ещё раз."); }
      finally { inFlight.delete(product.id); }
    },
    [add]
  );
}
