"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import OrdersPageClient from "./OrdersPageClient";
import PaginationBar from "@/components/PaginationBar";
import { AppError, AppLoading, NotOnServerYet, useRequireAuth } from "@/components/AppStates";
import { fetchMobileApi } from "@/lib/api";

type OrdersResponse = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  stats: { totalOrders: number; totalSum: number; topProduct: string | null; topProductQty: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orders: any[];
};

function OrdersScreen() {
  const authed = useRequireAuth();
  const sp = useSearchParams();
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const status = sp.get("status") || "";
  const dateFrom = sp.get("dateFrom") || "";
  const dateTo = sp.get("dateTo") || "";

  const [data, setData] = useState<OrdersResponse | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    const q = new URLSearchParams();
    if (page > 1) q.set("page", String(page));
    if (status) q.set("status", status);
    if (dateFrom) q.set("dateFrom", dateFrom);
    if (dateTo) q.set("dateTo", dateTo);
    const r = await fetchMobileApi<OrdersResponse>(`/orders?${q.toString()}`);
    if (r.ok) {
      setData(r.data);
      setState("ok");
    } else {
      setState(r.status === 404 ? "missing" : "error");
    }
  }, [page, status, dateFrom, dateTo]);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  return (
    <main className="min-h-screen" style={{ background: "linear-gradient(135deg, #fdf2f8 0%, #f5f3ff 50%, #eff6ff 100%)" }}>
      <nav className="bg-white/80 backdrop-blur border-b border-pink-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Link href="/catalog" className="flex items-center gap-2">
          <span className="text-pink-500 text-xl">♡</span>
          <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-700 bg-clip-text text-transparent text-lg font-black">
            Косметичка
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/catalog"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Каталог
          </Link>
          <Link
            href="/profile"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 transition text-2xl shadow-sm"
            title="Профиль"
          >
            🧕
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-4 py-8 pb-28">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-blue-700 bg-clip-text text-transparent">
            Мои заказы
          </h1>
          {data && data.totalCount > data.pageSize && (
            <span className="text-sm font-semibold text-slate-400 bg-white rounded-xl px-3 py-1 border">
              {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.totalCount)} из {data.totalCount}
            </span>
          )}
        </div>

        {(!authed || state === "loading") && <AppLoading />}
        {authed && state === "missing" && <NotOnServerYet title="Мои заказы" sitePath="/orders" />}
        {authed && state === "error" && <AppError text="Проверьте подключение к интернету" onRetry={load} />}
        {authed && state === "ok" && data && (
          <>
            <OrdersPageClient
              key={`${page}-${status}-${dateFrom}-${dateTo}`}
              orders={data.orders}
              stats={data.stats}
              currentStatus={status}
              currentDateFrom={dateFrom}
              currentDateTo={dateTo}
            />
            <PaginationBar
              page={page}
              totalPages={data.totalPages}
              buildHref={(pg) => {
                const params = new URLSearchParams();
                if (pg > 1) params.set("page", String(pg));
                if (status) params.set("status", status);
                if (dateFrom) params.set("dateFrom", dateFrom);
                if (dateTo) params.set("dateTo", dateTo);
                const qs = params.toString();
                return qs ? `/orders?${qs}` : "/orders";
              }}
            />
          </>
        )}
      </div>
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<AppLoading />}>
      <OrdersScreen />
    </Suspense>
  );
}
