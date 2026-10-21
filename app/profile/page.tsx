"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";
import { AppError, AppLoading, NotOnServerYet, useRequireAuth } from "@/components/AppStates";
import { fetchMobileApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type Customer = {
  id: number;
  name: string | null;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  inn: string | null;
  city: string | null;
  address: string | null;
  priceType: string;
  manager: string | null;
};

const PRICE_LABELS: Record<string, string> = {
  retail: "Розница",
  wholesale: "Опт",
  big_wholesale: "Крупный опт",
};

export default function ProfilePage() {
  const authed = useRequireAuth();
  const logout = useAuthStore((s) => s.logout);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    const r = await fetchMobileApi<{ customer: Customer }>("/profile");
    if (r.ok) {
      setCustomer(r.data.customer);
      setState("ok");
    } else {
      setState(r.status === 404 ? "missing" : "error");
    }
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSaving(true);
    setSaved(false);
    setError("");
    const body = Object.fromEntries(new FormData(form).entries());
    const r = await fetchMobileApi<{ customer: Customer }>("/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (r.ok) {
      setCustomer(r.data.customer);
      setSaved(true);
      for (const n of ["currentPassword", "password", "passwordConfirm"]) {
        const el = form.elements.namedItem(n) as HTMLInputElement | null;
        if (el) el.value = "";
      }
    } else {
      setError(r.error || "Не удалось сохранить. Проверьте подключение к интернету");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-28 md:p-8">
      <div className="mx-auto max-w-xl">

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/orders"
            className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white hover:bg-slate-100"
          >
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Мой профиль</h1>
            {customer?.manager && (
              <p className="text-sm text-indigo-600 font-semibold">
                👤 Менеджер: {customer.manager}
              </p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {customer && (
              <span className="rounded-full border bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                {PRICE_LABELS[customer.priceType] ?? customer.priceType}
              </span>
            )}
            {authed && (
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-full border bg-white px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 hover:border-red-200 transition"
              >
                Выйти
              </button>
            )}
          </div>
        </div>

        {(!authed || state === "loading") && <AppLoading />}
        {authed && state === "missing" && <NotOnServerYet title="Профиль" sitePath="/profile" />}
        {authed && state === "error" && <AppError text="Проверьте подключение к интернету" onRetry={load} />}

        {saved && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4 text-sm font-medium text-green-700">
            ✅ Данные успешно сохранены
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm font-medium text-red-700">
            ⚠️ {error}
          </div>
        )}

        {customer && state === "ok" && (
          <>
            {/* Read-only info */}
            {customer.inn && (
              <div className="mb-4 rounded-xl border bg-white p-4 text-sm text-slate-500">
                <span className="font-semibold text-slate-700">ИНН:</span> {customer.inn}
                <span className="ml-2 text-xs text-slate-400">(изменение через менеджера)</span>
              </div>
            )}

            {/* Edit form */}
            <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Имя</label>
                  <input
                    name="name"
                    defaultValue={customer.name || ""}
                    placeholder="Иван Иванов"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Компания</label>
                  <input
                    name="companyName"
                    defaultValue={customer.companyName || ""}
                    placeholder="ООО «Название»"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Телефон</label>
                  <input
                    name="phone"
                    defaultValue={customer.phone || ""}
                    placeholder="+7 900 000 00 00"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Email</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={customer.email || ""}
                    placeholder="mail@example.com"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Город</label>
                <input
                  name="city"
                  defaultValue={customer.city || ""}
                  placeholder="Москва"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Адрес доставки</label>
                <textarea
                  name="address"
                  defaultValue={customer.address || ""}
                  rows={2}
                  placeholder="ул. Пушкина, д. 1"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <hr className="border-slate-200" />

              <p className="text-sm font-bold text-slate-700">Смена пароля</p>
              <p className="text-xs text-slate-400 -mt-3">
                Оставьте пустым, чтобы не менять пароль
              </p>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Текущий пароль</label>
                <PasswordInput
                  name="currentPassword"
                  autoComplete="current-password"
                  placeholder="Введите текущий пароль"
                  className="w-full rounded-xl border px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Новый пароль</label>
                  <PasswordInput
                    name="password"
                    autoComplete="new-password"
                    placeholder="Минимум 6 символов"
                    className="w-full rounded-xl border px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Повтор нового пароля</label>
                  <PasswordInput
                    name="passwordConfirm"
                    autoComplete="new-password"
                    placeholder="Повторите пароль"
                    className="w-full rounded-xl border px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {saving ? "Сохранение…" : "Сохранить изменения"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
