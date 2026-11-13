import { useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { useCatalogStore } from "@/store/catalog";

/** Catalog tab — iOS style (large title, rounded search, two-column grid, floating tab bar). */
export default function Catalog() {
  // a link like /catalog?q=тонер (shared, from a search engine, from the site) opens with that search;
  // /catalog?category=<guid> — with that category (the site's category pages /catalog/<slug> send people here)
  const { q, category, quick } = useLocalSearchParams<{ q?: string | string[]; category?: string | string[]; quick?:string|string[] }>();
  const { store } = useCatalogStore();
  const query = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 100);
  const cat = (Array.isArray(category) ? category[0] : category)?.trim().slice(0, 80);
  useEffect(() => {
    if (query && store.getState().search !== query) store.getState().set({ search: query });
  }, [query, store]);
  useEffect(() => {
    if (cat && store.getState().categoryGuid !== cat) store.getState().set({ categoryGuid: cat });
  }, [cat, store]);
  const promotion=(Array.isArray(quick)?quick:[quick]).includes("promo");
  useEffect(()=>{if(promotion&&!store.getState().quick.includes("promo"))store.getState().set({quick:["promo"]});},[promotion,store]);
  return <CatalogBrowser />;
}
