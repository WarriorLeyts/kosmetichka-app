export function money(value: number | null | undefined): string {
  const n = Math.round(Number(value ?? 0));
  return n.toLocaleString("ru-RU").replace(/,/g, " ") + " ₽";
}

export function date(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export function time(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function stockLabel(stock: number | null | undefined) {
  const v = stock ?? 0;
  if (v <= 0) return { text: "Нет в наличии", tone: "out" as const };
  if (v > 10) return { text: "Больше 10 шт.", tone: "high" as const };
  return { text: "Осталось мало", tone: "low" as const };
}

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** «12 марта 2024» */
export function dateLong(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
