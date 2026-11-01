import { useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { useCatalogStore } from "@/store/catalog";

/** Catalog tab — iOS style (large title, rounded search, two-column grid, floating tab bar). */
export default function Catalog() {
  // a link like /catalog?q=тонер (shared, from a search engine, from the site) opens with that search
  const { q } = useLocalSearchParams<{ q?: string | string[] }>();
  const { store } = useCatalogStore();
  const query = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 100);
  useEffect(() => {
    if (query && store.getState().search !== query) store.getState().set({ search: query });
  }, [query, store]);
  return <CatalogBrowser />;
}
