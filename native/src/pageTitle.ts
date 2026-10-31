import { useEffect } from "react";
import { Platform } from "react-native";

const SITE = "Косметичка";

/** Browser tab title for the routes with a fixed name; null — the screen sets its own (a product, an order). */
export function titleForPath(path: string): string | null {
  if (path.startsWith("/product/") || path.startsWith("/order/")) return null;
  const fixed: Record<string, string> = {
    "/": `${SITE} — косметика и парфюмерия оптом и в розницу`,
    "/catalog": `Каталог — ${SITE}`,
    "/cart": `Корзина — ${SITE}`,
    "/orders": `Мои заказы — ${SITE}`,
    "/profile": `Профиль — ${SITE}`,
    "/favorites": `Избранное — ${SITE}`,
    "/notifications": `Уведомления — ${SITE}`,
    "/login": `Вход — ${SITE}`,
    "/register": `Регистрация — ${SITE}`,
    "/forgot": `Восстановление пароля — ${SITE}`,
    "/waitlist": `Лист ожидания — ${SITE}`,
    "/edit-profile": `Мои данные — ${SITE}`,
  };
  return fixed[path] ?? SITE;
}

/** Website: each page had the same tab title — now it names the page (bookmarks, history, search results). */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined" || !title) return;
    document.title = title;
  }, [title]);
}

export function productTitle(name?: string | null) {
  return name ? `${name} — ${SITE}` : null;
}

export function orderTitle(id?: number | null) {
  return id ? `Заказ №${id} — ${SITE}` : null;
}
