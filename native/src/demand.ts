export const DEMAND_NOTICE = "Учтём ваши пожелания и сообщим, когда товар поступит. Это не бронь: товар не резервируется. Наличие и цену нужно проверить при оформлении заказа.";
export function quantityFromText(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const n = Number(text);
  return Number.isInteger(n) && n >= 1 && n <= 10000 ? n : null;
}
