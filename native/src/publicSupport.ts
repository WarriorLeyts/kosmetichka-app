/** Public support is available without a customer account or assigned manager. */
export const SUPPORT = { email: "kosmetichka.upl@gmail.com", phone: "+79389059494", displayPhone: "+7 938 905-94-94" };
export type PublicMenuLink = { slug: string; title: string; path: string };
const REQUIRED: PublicMenuLink[] = [
  { slug: "contacts", title: "Контакты и реквизиты", path: "/contacts" },
  { slug: "privacy", title: "Политика конфиденциальности", path: "/privacy" },
  { slug: "agreement", title: "Пользовательское соглашение", path: "/agreement" },
];
/** Legal / support links remain accessible even when the CMS hides them from its menu. */
export function publicInfoMenu(menu: PublicMenuLink[]): PublicMenuLink[] {
  const links = menu.filter((m) => m.path.startsWith("/") && !m.path.startsWith("//"));
  return [...links, ...REQUIRED.filter((m) => !links.some((l) => l.path === m.path))];
}

export function publicSupport(groups: { rows: { label: string; value: string }[] }[] = []) {
  const out = { ...SUPPORT };
  for (const row of groups.flatMap((g) => g.rows)) {
    if (/телефон|phone/i.test(row.label)) {
      const digits = row.value.replace(/\D/g, "");
      if (/^[78]\d{10}$/.test(digits)) { out.phone = `+7${digits.slice(1)}`; out.displayPhone = row.value; }
    }
    if (/e-?mail|почт/i.test(row.label) && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(row.value.trim())) out.email = row.value.trim();
  }
  return out;
}
