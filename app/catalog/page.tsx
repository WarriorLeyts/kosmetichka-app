"use client";

import { Suspense, useEffect, useState } from "react";
import { CatalogClient } from "@/components/catalog/CatalogClient";
import { AppLoading } from "@/components/AppStates";
import { fetchMobileApi } from "@/lib/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Meta = { categories: any[]; brands: any[] };

export default function CatalogPage() {
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetchMobileApi<Meta>("/catalog-meta");
      if (r.ok) {
        setMeta(r.data);
        return;
      }
      // Fallback: categories from the site's public API; brand filter needs the server update
      const categories = await fetch("/api/categories").then((x) => x.json()).catch(() => []);
      const list = Array.isArray(categories) ? categories : [];
      list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setMeta({ categories: list, brands: [] });
    })();
  }, []);

  if (!meta) return <AppLoading />;

  return (
    <Suspense>
      <CatalogClient categories={meta.categories} brands={meta.brands} />
    </Suspense>
  );
}
