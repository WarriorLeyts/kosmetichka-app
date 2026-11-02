import { post } from "./api";

/** Browser: the PDF in a new tab (the signed-in staff cookie opens it). */
export async function openInvoicePdf(orderId: number): Promise<string | null> {
  window.open(`/api/orders/${orderId}/invoice-pdf`, "_blank");
  return null;
}

/**
 * Browser: a 7-day link to the PDF — the file itself to the share sheet where the browser allows it
 * (phones), else the link shared, else copied. Returns a note to show, or null.
 */
export async function shareInvoice(orderId: number): Promise<string | null> {
  const { pdf } = await post<{ pdf: string }>(`/api/team/orders/${orderId}/invoice-link`);
  const link = new URL(pdf, location.origin).href;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    const blob = await (await fetch(link)).blob();
    const file = new File([blob], `Счёт №${orderId}.pdf`, { type: "application/pdf" });
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: `Счёт №${orderId}` });
      return null;
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return null;
  }
  if (nav.share) {
    try {
      await nav.share({ title: `Счёт №${orderId}`, url: link });
      return null;
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return null;
    }
  }
  await navigator.clipboard.writeText(link);
  return "Ссылка на PDF скопирована — действует 7 дней";
}
