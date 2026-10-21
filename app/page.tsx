"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeClient } from "@/components/home/HomeClient";
import { fetchMobileApi } from "@/lib/api";
import { bootPath } from "@/lib/bootPath";

type Counts = { totalProducts: number; totalBrands: number; totalCategories: number };

export default function Home() {
  const router = useRouter();
  const [counts, setCounts] = useState<Counts>({ totalProducts: 0, totalBrands: 0, totalCategories: 0 });

  // The phone's local server answers unknown paths with this page (index.html).
  // If the app was opened on another URL, route there instead.
  useEffect(() => {
    const target = bootPath();
    if (target) router.replace(target);
  }, [router]);

  useEffect(() => {
    (async () => {
      const r = await fetchMobileApi<Counts>("/home");
      if (r.ok) {
        setCounts(r.data);
        return;
      }
      // Fallback with the site's existing public APIs
      const [products, categories] = await Promise.all([
        fetch("/api/catalog/products?page=1").then((x) => x.json()).catch(() => null),
        fetch("/api/categories").then((x) => x.json()).catch(() => null),
      ]);
      setCounts({
        totalProducts: products?.total ?? 0,
        totalBrands: 0,
        totalCategories: Array.isArray(categories) ? categories.length : 0,
      });
    })();
  }, []);

  return <HomeClient {...counts} />;
}
