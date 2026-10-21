"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WishlistPageClient } from "./WishlistPageClient";
import { AppError, AppLoading, useRequireAuth } from "@/components/AppStates";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = any;

export default function WishlistPage() {
  const authed = useRequireAuth();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState(false);

  async function load() {
    setError(false);
    try {
      const res = await fetch("/api/wishlist");
      const data = await res.json();
      // The site's API returns flat products; the page component expects wishlist rows.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data.products ?? []).map((p: any) => {
        const { notified, wishlistItemId, ...product } = p;
        return { id: wishlistItemId, productId: product.id, notified, createdAt: "", product };
      });
      setItems(rows);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-28 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/orders"
            className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white hover:bg-slate-100"
          >
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Лист ожидания</h1>
            {items && (
              <p className="text-sm text-slate-400">
                {items.length === 0
                  ? "Пусто"
                  : `${items.length} ${items.length === 1 ? "товар" : items.length < 5 ? "товара" : "товаров"}`}
              </p>
            )}
          </div>
        </div>

        {error ? (
          <AppError text="Проверьте подключение к интернету" onRetry={load} />
        ) : !items ? (
          <AppLoading />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
            <div className="mb-3 text-4xl">🔔</div>
            <p className="text-base font-bold text-slate-700">Лист ожидания пуст</p>
            <p className="mt-1 text-sm text-slate-400">
              Добавляйте товары, которых нет в наличии, — мы пришлём уведомление, когда они появятся
            </p>
            <Link
              href="/catalog"
              className="mt-5 inline-block rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-700 px-6 py-2.5 text-sm font-black text-white hover:opacity-90 transition"
            >
              Перейти в каталог
            </Link>
          </div>
        ) : (
          <WishlistPageClient items={items} />
        )}
      </div>
    </main>
  );
}
