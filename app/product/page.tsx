"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductPageClient } from "@/components/catalog/ProductPageClient";
import { AppError, AppLoading } from "@/components/AppStates";

function ProductScreen() {
  const id = useSearchParams().get("id");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [product, setProduct] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [related, setRelated] = useState<any[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    setProduct(null);
    try {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) {
        setError(res.status === 404 ? "Товар не найден" : "Проверьте подключение к интернету");
        return;
      }
      const p = await res.json();
      setProduct(p);
      if (p.brandGuid) {
        const r = await fetch(`/api/catalog/products?brandGuid=${encodeURIComponent(p.brandGuid)}&sort=name`)
          .then((x) => x.json())
          .catch(() => null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRelated((r?.products ?? []).filter((x: any) => x.id !== p.id).slice(0, 8));
      } else {
        setRelated([]);
      }
    } catch {
      setError("Проверьте подключение к интернету");
    }
  }, [id]);

  useEffect(() => {
    load();
    window.scrollTo(0, 0);
  }, [load]);

  if (!id) return <AppError text="Товар не найден" />;
  if (error) return <AppError text={error} onRetry={load} />;
  if (!product) return <AppLoading />;

  return <ProductPageClient key={product.id} product={product} relatedProducts={related} />;
}

export default function ProductPage() {
  return (
    <Suspense fallback={<AppLoading />}>
      <ProductScreen />
    </Suspense>
  );
}
