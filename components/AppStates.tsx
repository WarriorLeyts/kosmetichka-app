"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { openExternal, siteUrl } from "@/lib/api";

export function AppLoading({ text = "Загрузка…" }: { text?: string }) {
  return <div className="app-loading">{text}</div>;
}

export function AppError({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="app-notice">
      <b>Не удалось загрузить</b>
      {text}
      {onRetry && (
        <div>
          <button type="button" onClick={onRetry}>Повторить</button>
        </div>
      )}
    </div>
  );
}

/**
 * Shown when an optional /api/mobile/* endpoint isn't on the server yet:
 * the section still works through the website.
 */
export function NotOnServerYet({ title, sitePath }: { title: string; sitePath: string }) {
  return (
    <div className="app-notice">
      <b>{title}</b>
      Этот раздел в приложении заработает после обновления сервера. Пока его можно открыть на сайте.
      <div>
        <button type="button" onClick={() => openExternal(siteUrl(sitePath))}>Открыть на сайте</button>
      </div>
    </div>
  );
}

/** Client-side auth guard for customer pages (the site did this in middleware). */
export function useRequireAuth() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok">("checking");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.customer) setState("ok");
        else router.replace("/login");
      })
      .catch(() => !cancelled && router.replace("/login"));
    return () => {
      cancelled = true;
    };
  }, [router]);

  return state === "ok";
}
