import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { BASE_URL, post } from "./api";

/**
 * Phones: the order's invoice as a PDF file in the share sheet (WhatsApp, Telegram, mail, «Сохранить
 * в Файлы»…). The file comes from a 7-day invoice link, so the app's login isn't needed to download it.
 * Returns a note to show, or null when the share sheet did the job.
 */
export async function shareInvoice(orderId: number): Promise<string | null> {
  const { pdf } = await post<{ pdf: string }>(`/api/team/orders/${orderId}/invoice-link`);
  const target = `${FileSystem.cacheDirectory}schet-${orderId}.pdf`;
  const r = await FileSystem.downloadAsync(BASE_URL + pdf, target);
  if (r.status !== 200) throw new Error("Счёт не скачался — попробуйте ещё раз");
  if (!(await Sharing.isAvailableAsync())) return "На этом телефоне нельзя поделиться файлом";
  await Sharing.shareAsync(r.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: `Счёт №${orderId}` });
  return null;
}

/** phones: the same file — the share sheet also offers to open / save it */
export const openInvoicePdf = shareInvoice;
