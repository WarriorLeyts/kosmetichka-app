import { useEffect } from "react";
import { AppState } from "react-native";
import { get } from "./api";
import { useBadges } from "./store/badges";
import { isUnread, useChatSeen } from "./store/chatSeen";
import type { ChatMarks } from "./types";

type News = { orders: ({ id: number } & ChatMarks)[] };

/**
 * «Заказы» tab: orders where the customer wrote (a message, a confirmation, a change) and nobody
 * answered or opened that chat on this device — the same rule as the «Новое сообщение» mark in the
 * list. Polls every 30 s while the app is open; badge key "ordersChat" (added to the pending count).
 */
export function useOrderNews(enabled: boolean) {
  const setBadge = useBadges((s) => s.set);
  useEffect(() => {
    if (!enabled) {
      setBadge("ordersChat", 0);
      return;
    }
    let alive = true;
    let last: News | null = null;
    const count = (d: News) => {
      const s = useChatSeen.getState();
      setBadge("ordersChat", d.orders.filter((o) => isUnread(s, o.id, o)).length);
    };
    const tick = () => {
      if (AppState.currentState !== "active") return;
      get<News>("/api/team/orders/news")
        .then((d) => {
          if (!alive) return;
          last = d;
          count(d);
        })
        .catch(() => {});
    };
    tick();
    const t = setInterval(tick, 30_000);
    const sub = AppState.addEventListener("change", (a) => a === "active" && tick());
    // opening a chat clears its order from the count at once
    const unsub = useChatSeen.subscribe(() => last && count(last));
    return () => {
      alive = false;
      clearInterval(t);
      sub.remove();
      unsub();
    };
  }, [enabled, setBadge]);
}

/** «Заказы» number: orders waiting for a manager + orders with unread customer messages */
export const ordersBadge = (counts: Record<string, number>) => (counts.orders ?? 0) + (counts.ordersChat ?? 0);
