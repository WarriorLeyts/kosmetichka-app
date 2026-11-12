/**
 * Every barcode of a product (1С «Штрихкоды номенклатуры», a box has its own): the one of the exchange
 * first, then the others; a packaging unit in brackets — «8809640736148 (коробка)».
 */
export function barcodeList(main: string | null | undefined, all: ({ barcode: string; unitName?: string | null } | string)[] | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (code: string | null | undefined, unit?: string | null) => {
    const c = (code ?? "").trim();
    if (!c || seen.has(c)) return;
    seen.add(c);
    out.push(unit ? `${c} (${unit})` : c);
  };
  add(main);
  for (const b of all ?? []) typeof b === "string" ? add(b) : add(b.barcode, b.unitName);
  return out;
}
