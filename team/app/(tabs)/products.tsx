import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Catalog } from "@/components/Catalog";
import { TeamHeader } from "@/components/TeamHeader";
import { PRICE_TYPES, type PriceType, type ProductRow } from "@/products";
import { useTabCatalog, type CatalogProduct } from "@/catalog";

const PRICE_KEY = "team-products-price";
let lastPrice: PriceType = "wholesale";

/**
 * Товары — the customer app's catalog (category menu, sub-filters, filters, search, card grid) with
 * the price type to show (Розница / Скидка по карте / Опт / Крупный опт) and the barcode scanner.
 */
export default function Products() {
  const [priceType, setPriceType] = useState<PriceType>(lastPrice);

  useEffect(() => {
    AsyncStorage.getItem(PRICE_KEY)
      .then((v) => {
        if (v && (PRICE_TYPES as readonly string[]).includes(v)) setPriceType((lastPrice = v as PriceType));
      })
      .catch(() => {});
  }, []);
  const choosePrice = useCallback((v: PriceType) => {
    lastPrice = v;
    setPriceType(v);
    AsyncStorage.setItem(PRICE_KEY, v).catch(() => {});
  }, []);

  const open = useCallback((p: CatalogProduct | ProductRow) => router.push({ pathname: "/product/[id]", params: { id: String(p.id) } }), []);

  return <Catalog tab store={useTabCatalog} top={<TeamHeader title="Товары" />} priceType={priceType} onPriceType={choosePrice} onOpen={open} onScanHit={open} />;
}
